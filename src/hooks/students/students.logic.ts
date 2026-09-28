/**
 * Pure logic for the redesigned Students screens: roster search, the stat
 * tiles, the class-list CSV, the student record's detail fields, and the
 * score bars with their grade, total and position. No React.
 */
import { csvFileName, toCsv } from "@/app/services/grading-workspace/grade-csv";
import type { ClassRoster, RosterStudent, StudentAssessmentScore, StudentCourseScores, StudentGuardian, StudentRecord } from "@/types/classroom";

/** Shown wherever a value is missing. */
export const NOT_RECORDED = "Not recorded";
const DASH = "—";

/**
 * A term attendance rate as a whole percentage (`92.9` → `"93%"`).
 *
 * @param rate - The rate, 0–100, or null.
 * @param empty - What to show for null.
 * @returns The text.
 */
export function formatRate(rate: number | null | undefined, empty = "No records yet"): string {
  return typeof rate === "number" && Number.isFinite(rate) ? `${Math.round(rate)}%` : empty;
}

/**
 * Filters a roster by name, admission number, email or guardian name.
 *
 * @param students - The roster.
 * @param query - What was typed.
 * @returns The matching students.
 */
export function filterRoster(students: readonly RosterStudent[], query: string): RosterStudent[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...students];
  return students.filter((s) =>
    [s.name, s.admissionNumber ?? "", s.email ?? "", s.guardian?.name ?? ""].join(" ").toLowerCase().includes(q),
  );
}

/** One of the four tiles above the roster. */
export interface RosterTile {
  label: string;
  value: string;
  tip: string;
}

/**
 * The four tiles: Students (n of capacity), Attendance this term, Absent
 * today (or "Register pending" until it is submitted), You teach here.
 *
 * @param roster - The class roster.
 * @returns The tiles, in the design's order.
 */
export function rosterTiles(roster: ClassRoster): RosterTile[] {
  const { class: cls, stats, courses } = roster;
  return [
    {
      label: "Students",
      value: cls.capacity ? `${cls.studentCount} of ${cls.capacity}` : String(cls.studentCount),
      tip: "Enrolled against class capacity",
    },
    { label: "Attendance this term", value: formatRate(stats.attendanceRateTerm), tip: "Approved leave is not counted against the rate" },
    {
      label: "Absent today",
      value: stats.registerSubmitted && stats.absentToday !== null ? String(stats.absentToday) : "Register pending",
      tip: "From today's morning register",
    },
    { label: "You teach here", value: courses.length ? courses.map((c) => c.title).join(" · ") : cls.role === "class_teacher" ? "Class teacher" : DASH, tip: "" },
  ];
}

/**
 * The class list as a CSV with the design's columns.
 *
 * @param roster - The class roster.
 * @returns The file name (`jss1-a-class-list.csv`) and its contents.
 */
export function rosterCsv(roster: ClassRoster): { filename: string; csv: string } {
  const headers = ["Name", "Admission number", "Email", "Class", "Attendance rate", "Guardian", "Relationship", "Guardian phone", "Guardian email"];
  const rows = roster.students.map((s) => [
    s.name,
    s.admissionNumber,
    s.email,
    roster.class.name,
    typeof s.attendanceRateTerm === "number" ? `${s.attendanceRateTerm}%` : "",
    s.guardian?.name,
    s.guardian?.relationship,
    s.guardian?.phone,
    s.guardian?.email,
  ]);
  return { filename: csvFileName(roster.class.name, "class list"), csv: toCsv(headers, rows) };
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/**
 * A date of birth as the design writes it: `"2013-03-01"` → `"1 March 2013"`.
 *
 * @param iso - `YYYY-MM-DD` (or a full ISO instant).
 * @returns The date, or "Not recorded".
 */
export function formatDob(iso: string | null | undefined): string {
  if (!iso) return NOT_RECORDED;
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/**
 * The "Student details" fields.
 *
 * @param record - The student record.
 * @returns Label and value pairs.
 */
export function studentDetails(record: StudentRecord): { label: string; value: string }[] {
  const s = record.student;
  return [
    { label: "Full name", value: s.name.toUpperCase() },
    { label: "Admission no.", value: s.admissionNumber || NOT_RECORDED },
    { label: "Class", value: s.class.name },
    { label: "Date of birth", value: formatDob(s.dateOfBirth) },
    { label: "Gender", value: s.gender || NOT_RECORDED },
    { label: "Email", value: s.email || NOT_RECORDED },
  ];
}

/**
 * The guardian card's fields.
 *
 * @param guardian - The guardian.
 * @returns Label and value pairs.
 */
export function guardianDetails(guardian: StudentGuardian): { label: string; value: string }[] {
  return [
    { label: "Full name", value: guardian.name },
    { label: "Relationship", value: guardian.relationship || NOT_RECORDED },
    { label: "Occupation", value: guardian.occupation || NOT_RECORDED },
    { label: "Email", value: guardian.email || NOT_RECORDED },
    { label: "Phone", value: guardian.phone || NOT_RECORDED },
    { label: "Home address", value: guardian.address || NOT_RECORDED },
  ];
}

/**
 * A `tel:` link for a phone number as stored (`"+234 803 112 4410"`).
 *
 * @param phone - The number.
 * @returns The href, or null when there is no number.
 */
export function telHref(phone: string | null | undefined): string | null {
  const digits = (phone ?? "").replace(/[^\d+]/g, "");
  return digits ? `tel:${digits}` : null;
}

/**
 * `1` → `"1st"`, `12` → `"12th"`, `22` → `"22nd"`.
 *
 * @param n - A positive whole number.
 * @returns The ordinal.
 */
export function ordinal(n: number): string {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
}

/** How one assessment's score bar is drawn. */
export interface ScoreBar {
  /** Width of the navy fill, 0–100. */
  fillPercent: number;
  /** Where the class-average marker sits, 0–100, or null when there is no average. */
  averagePercent: number | null;
  /** "Musa 16 of 20 · class average 15.3", or "Not entered yet". */
  tip: string;
  score: string;
  average: string;
  max: string;
}

/**
 * Geometry and labels for one assessment's bar: the student's score as a
 * share of the maximum, and the class average as a marker.
 *
 * @param a - The assessment's scores.
 * @param firstName - The student's first name, for the tip.
 * @returns The bar.
 */
export function scoreBar(a: StudentAssessmentScore, firstName: string): ScoreBar {
  const max = a.maxScore && a.maxScore > 0 ? a.maxScore : null;
  const pct = (v: number | null) => (v === null || max === null ? null : Math.max(0, Math.min(100, (v / max) * 100)));
  const avgText = a.classAverage === null ? DASH : a.classAverage.toFixed(1);
  return {
    fillPercent: pct(a.score) ?? 0,
    averagePercent: pct(a.classAverage),
    tip:
      a.score === null
        ? "Not entered yet"
        : `${firstName} ${a.score}${max ? ` of ${max}` : ""}${a.classAverage === null ? "" : ` · class average ${avgText}`}`,
    score: a.score === null ? DASH : String(a.score),
    average: avgText,
    max: max ? `out of ${max}` : "No maximum set",
  };
}

/** Label and pill colours for an assessment's status. */
export const SCORE_STATUS: Record<StudentAssessmentScore["status"], { label: string; className: string }> = {
  published: { label: "Published", className: "bg-tl-success-bg text-tl-success" },
  draft: { label: "Draft", className: "bg-tl-warning-bg text-tl-warning" },
  not_entered: { label: "Not entered", className: "bg-tl-track text-tl-muted" },
};

/**
 * The course header's Total, Grade and Position, and the note under the rows.
 * Grade and position only show once every assessment is in (`complete`).
 *
 * @param c - The course's scores.
 * @returns What the header and footer show.
 */
export function courseSummary(c: StudentCourseScores): { total: string; grade: string; position: string; note: string } {
  const n = c.assessments.length;
  const entered = c.assessments.filter((a) => a.score !== null).length;
  const maxTotal = c.assessments.reduce((sum, a) => sum + (a.maxScore ?? 0), 0);
  const note =
    n === 0
      ? "No assessments have been set for this course yet."
      : c.complete
        ? `Total out of ${maxTotal} across all ${n === 3 ? "three" : n} assessments.`
        : `${entered} of ${n} assessments entered. Grade and position appear once all ${n === 3 ? "three" : n} are in.`;
  return {
    total: c.total === null ? DASH : String(c.total),
    grade: c.complete && c.grade ? c.grade : DASH,
    position: c.complete && c.position ? `${ordinal(c.position.rank)} of ${c.position.of}` : DASH,
    note,
  };
}
