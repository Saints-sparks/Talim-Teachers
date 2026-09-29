/**
 * Pure logic for the redesigned Grading page: reading what a teacher types
 * into a score cell, the live statistics and grades from the school's scale,
 * term totals and competition-ranked positions, when Save and Publish are
 * allowed, the status lines and pills, the 409 bodies, and the class report's
 * readiness, broadsheet and remarks rules. No React.
 *
 * Shapes are the Round 3 types in `src/types/grading.ts` (aliases of the
 * generated contract, plus the hand-written 409 body).
 */
import { ApiError } from "@/lib/apiError";
import { clockTime, dayMonth, schoolClock } from "@/hooks/today/today.logic";
import type {
  AssessmentStatus,
  Broadsheet,
  BroadsheetRow,
  CourseGradingSheet,
  GradeBand,
  GradingAssessment,
  GradingConflictBody,
  GradingConflictCode,
  GradingPosition,
  GradingStudent,
  ReadinessCell,
  ReadinessSubject,
  TermRemarkRow,
  TermResultSubmission,
} from "@/types/grading";

/** The dash the design shows for "nothing yet". */
export const DASH = "—";

/** The longest remark the API stores (§22). */
export const REMARK_MAX = 500;

/** The default scale (§16), for fixtures and as a last resort. */
export const DEFAULT_SCALE: GradeBand[] = [
  { letter: "A", min: 70, remark: "Excellent" },
  { letter: "B", min: 60, remark: "Very good" },
  { letter: "C", min: 50, remark: "Good" },
  { letter: "D", min: 45, remark: "Fair" },
  { letter: "E", min: 40, remark: "Pass" },
  { letter: "F", min: 0, remark: "Fail" },
];

// ─── Score cells ────────────────────────────────────────────────────────────

/** The most decimals a score may have: the API answers 400 beyond it ("Round 3 as built", §15). */
export const SCORE_DECIMALS = 2;

/**
 * What the teacher typed, cleaned the way the design does: anything but
 * digits and a decimal point is dropped as they type, a single decimal point
 * keeps at most {@link SCORE_DECIMALS} digits after it, and the length is
 * capped (the largest `maxScore` is 1000).
 *
 * @param raw - The input's value.
 * @returns The cleaned text.
 */
export function sanitizeScoreInput(raw: string): string {
  const text = raw.replace(/[^0-9.]/g, "").slice(0, 8);
  const decimal = /^(\d*\.)(\d*)$/.exec(text);
  return decimal && decimal[2].length > SCORE_DECIMALS ? `${decimal[1]}${decimal[2].slice(0, SCORE_DECIMALS)}` : text;
}

/** A score cell read against its maximum. */
export type ParsedScore =
  | { kind: "empty" }
  | { kind: "valid"; value: number }
  | { kind: "above"; value: number }
  | { kind: "invalid"; reason?: "decimals" };

/**
 * Reads a cell. Empty means "no score" (saved as null); a number above the
 * maximum is kept on screen but cannot be saved; "1.2.3" or "." is invalid,
 * and so is a score with more than {@link SCORE_DECIMALS} decimals (the API
 * refuses it; one can still arrive from a CSV import).
 *
 * @param raw - The cell's text (already sanitised).
 * @param max - The assessment's `maxScore`.
 * @returns The reading.
 */
export function parseScore(raw: string, max: number): ParsedScore {
  const text = raw.trim();
  if (!text) return { kind: "empty" };
  if (!/^\d*\.?\d*$/.test(text) || !/\d/.test(text)) return { kind: "invalid" };
  if ((text.split(".")[1] ?? "").length > SCORE_DECIMALS) return { kind: "invalid", reason: "decimals" };
  const value = Number(text);
  if (!Number.isFinite(value) || value < 0) return { kind: "invalid" };
  if (value > max) return { kind: "above", value };
  return { kind: "valid", value };
}

/**
 * The text a cell shows: the teacher's unsaved text when there is some, else
 * the saved score.
 *
 * @param saved - The saved score, or null.
 * @param draft - The unsaved text, if the teacher touched the cell.
 * @returns The cell's text.
 */
export function cellText(saved: number | null | undefined, draft: string | undefined): string {
  if (draft !== undefined) return draft;
  return saved === null || saved === undefined ? "" : String(saved);
}

/**
 * The number a cell counts as, for totals and statistics: only a valid score.
 *
 * @param saved - The saved score.
 * @param draft - The unsaved text, if any.
 * @param max - The assessment's maximum.
 * @returns The score, or null.
 */
export function cellValue(saved: number | null | undefined, draft: string | undefined, max: number): number | null {
  const parsed = parseScore(cellText(saved, draft), max);
  return parsed.kind === "valid" ? parsed.value : null;
}

/** Unsaved cell text by student id, for one assessment. */
export type AssessmentDraft = Record<string, string>;

/** Unsaved text for every assessment the teacher touched, keyed by {@link draftKey}. */
export type ScoreDrafts = Record<string, AssessmentDraft>;

/**
 * The key one assessment's drafts are kept under.
 *
 * @param termId - The term the sheet is for.
 * @param courseId - The course.
 * @param assessmentId - The assessment.
 * @returns `term|course|assessment`.
 */
export function draftKey(termId: string, courseId: string, assessmentId: string): string {
  return `${termId}|${courseId}|${assessmentId}`;
}

/** The changes a save would send for one assessment. */
export interface DraftChanges {
  /** Valid scores and cleared cells (null) that differ from what is saved. */
  valid: { studentId: string; score: number | null }[];
  /** Cells above the maximum or not a number: kept on screen, never sent. */
  invalid: string[];
}

/**
 * Compares one assessment's drafts with the saved scores.
 *
 * @param sheet - The course sheet.
 * @param assessment - The assessment.
 * @param draft - Its unsaved text.
 * @returns What a save would send, and what it would hold back.
 */
export function draftChanges(sheet: Pick<CourseGradingSheet, "students">, assessment: Pick<GradingAssessment, "id" | "maxScore">, draft: AssessmentDraft | undefined): DraftChanges {
  const out: DraftChanges = { valid: [], invalid: [] };
  if (!draft) return out;
  for (const student of sheet.students) {
    const text = draft[student.id];
    if (text === undefined) continue;
    const saved = student.scores[assessment.id] ?? null;
    const parsed = parseScore(text, assessment.maxScore);
    if (parsed.kind === "empty") {
      if (saved !== null) out.valid.push({ studentId: student.id, score: null });
    } else if (parsed.kind === "valid") {
      if (parsed.value !== saved) out.valid.push({ studentId: student.id, score: parsed.value });
    } else {
      out.invalid.push(student.id);
    }
  }
  return out;
}

/**
 * Whether one assessment has unsaved changes (including invalid text).
 *
 * @param sheet - The course sheet.
 * @param assessment - The assessment.
 * @param draft - Its unsaved text.
 * @returns True when something differs from what is saved.
 */
export function isDirty(sheet: Pick<CourseGradingSheet, "students">, assessment: Pick<GradingAssessment, "id" | "maxScore">, draft: AssessmentDraft | undefined): boolean {
  const changes = draftChanges(sheet, assessment, draft);
  return changes.valid.length > 0 || changes.invalid.length > 0;
}

/**
 * Drops draft cells that now match the saved scores (after a save, or when
 * the teacher typed the saved value back).
 *
 * @param sheet - The sheet as the server now has it.
 * @param assessment - The assessment.
 * @param draft - Its unsaved text.
 * @returns The cells that still differ, or undefined when none do.
 */
export function pruneDraft(sheet: Pick<CourseGradingSheet, "students">, assessment: Pick<GradingAssessment, "id" | "maxScore">, draft: AssessmentDraft | undefined): AssessmentDraft | undefined {
  if (!draft) return undefined;
  const next: AssessmentDraft = {};
  for (const [studentId, text] of Object.entries(draft)) {
    const student = sheet.students.find((s) => s.id === studentId);
    if (!student) continue;
    const saved = student.scores[assessment.id] ?? null;
    const parsed = parseScore(text, assessment.maxScore);
    const same = (parsed.kind === "empty" && saved === null) || (parsed.kind === "valid" && parsed.value === saved);
    if (!same) next[studentId] = text;
  }
  return Object.keys(next).length ? next : undefined;
}

/** The row status pill of the single-assessment sheet. */
export interface RowStatus {
  label: string;
  tone: "success" | "danger" | "muted";
}

/**
 * "Entered", "Missing", "Above 20", "Too many decimals" or "Not a number".
 *
 * @param parsed - The cell's reading.
 * @param max - The assessment's maximum.
 * @returns The pill.
 */
export function rowStatus(parsed: ParsedScore, max: number): RowStatus {
  if (parsed.kind === "above") return { label: `Above ${max}`, tone: "danger" };
  if (parsed.kind === "invalid") return { label: parsed.reason === "decimals" ? "Too many decimals" : "Not a number", tone: "danger" };
  if (parsed.kind === "valid") return { label: "Entered", tone: "success" };
  return { label: "Missing", tone: "muted" };
}

// ─── Numbers, grades, positions ─────────────────────────────────────────────

/**
 * A percent to 1 decimal (the contract's rounding).
 *
 * @param value - The score.
 * @param max - Out of.
 * @returns The percent, or null when there is no maximum.
 */
export function percentOf(value: number, max: number): number | null {
  if (!(max > 0)) return null;
  return Math.round((value / max) * 1000) / 10;
}

/**
 * `72.5` → `"72.5%"`, `70` → `"70%"`, null → `"—"`.
 *
 * @param value - A percent.
 * @returns The display text.
 */
export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return DASH;
  const rounded = Math.round(value * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)}%`;
}

/**
 * The letter a percent earns on the school's scale: the first band (highest
 * first) whose minimum it reaches. The percent is rounded to 1 decimal first,
 * as the server rounds.
 *
 * @param percent - The percent.
 * @param scale - The school's bands.
 * @returns The letter, or null when the scale is empty.
 */
export function gradeFor(percent: number, scale: readonly GradeBand[]): string | null {
  const p = Math.round(percent * 10) / 10;
  const bands = [...scale].sort((a, b) => b.min - a.min);
  for (const band of bands) if (p >= band.min) return band.letter;
  return bands.length ? bands[bands.length - 1].letter : null;
}

/**
 * The percent below which the broadsheet shows a score in red: the D band's
 * minimum on the school's scale (the design's "below 45%" is the default
 * scale's D), else the school's pass mark when the scale has no D band. Both
 * come with the broadsheet.
 *
 * @param scale - The school's bands (`broadsheet.scale`).
 * @param passMark - The school's pass mark, percent (`broadsheet.passMark`).
 * @returns The threshold, in percent.
 */
export function redThreshold(scale: readonly GradeBand[], passMark: number): number {
  const d = scale.find((b) => b.letter.trim().toUpperCase() === "D");
  return d ? d.min : passMark;
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

/**
 * Standard competition ranking (1, 1, 3): ties share a rank and the next
 * rank is skipped.
 *
 * @param items - What to rank.
 * @param score - Higher is better; null leaves an item unranked.
 * @returns Each ranked item's position (`of` is how many were ranked).
 */
export function competitionRanks<T>(items: readonly T[], score: (item: T) => number | null): Map<T, GradingPosition> {
  const scored = items.map((item) => ({ item, value: score(item) })).filter((x): x is { item: T; value: number } => x.value !== null);
  const sorted = [...scored].sort((a, b) => b.value - a.value);
  const out = new Map<T, GradingPosition>();
  sorted.forEach((entry, index) => {
    const rank = index > 0 && entry.value === sorted[index - 1].value ? (out.get(sorted[index - 1].item)?.rank ?? index + 1) : index + 1;
    out.set(entry.item, { rank, of: sorted.length });
  });
  return out;
}

/**
 * How a position shows: `"1st"`, or `"1st="` when others share it.
 *
 * @param position - The position.
 * @param tied - Whether another student has the same rank.
 * @returns The label, or a dash.
 */
export function positionLabel(position: GradingPosition | null | undefined, tied = false): string {
  if (!position) return DASH;
  return `${ordinal(position.rank)}${tied ? "=" : ""}`;
}

/**
 * Which ranks are shared by more than one student.
 *
 * @param positions - Every ranked position.
 * @returns The shared ranks.
 */
export function tiedRanks(positions: Iterable<GradingPosition | null | undefined>): Set<number> {
  const seen = new Map<number, number>();
  for (const p of positions) if (p) seen.set(p.rank, (seen.get(p.rank) ?? 0) + 1);
  return new Set([...seen].filter(([, n]) => n > 1).map(([rank]) => rank));
}

/** The five stat tiles. */
export interface StatTiles {
  entered: string;
  average: string;
  highest: string;
  lowest: string;
  passRate: string;
}

/**
 * The tiles from a list of percents, live as the teacher types.
 *
 * @param percents - One percent per student counted.
 * @param counted - How many students are counted (the "n" of "n / N").
 * @param of - How many students there are.
 * @param passMark - The school's pass mark, percent.
 * @returns The tile values.
 */
export function statTiles(percents: readonly number[], counted: number, of: number, passMark: number): StatTiles {
  const n = percents.length;
  const mean = n ? percents.reduce((a, b) => a + b, 0) / n : null;
  return {
    entered: `${counted} / ${of}`,
    average: mean === null ? DASH : formatPercent(mean),
    highest: n ? formatPercent(Math.max(...percents)) : DASH,
    lowest: n ? formatPercent(Math.min(...percents)) : DASH,
    passRate: n ? `${Math.round((percents.filter((p) => p >= passMark).length / n) * 100)}%` : DASH,
  };
}

/**
 * The tiles for one assessment, counting the valid scores on screen.
 *
 * @param sheet - The course sheet.
 * @param assessment - The assessment.
 * @param draft - Its unsaved text.
 * @returns The tiles.
 */
export function assessmentTiles(sheet: CourseGradingSheet, assessment: GradingAssessment, draft: AssessmentDraft | undefined): StatTiles {
  const percents: number[] = [];
  for (const s of sheet.students) {
    const v = cellValue(s.scores[assessment.id], draft?.[s.id], assessment.maxScore);
    const p = v === null ? null : percentOf(v, assessment.maxScore);
    if (p !== null) percents.push(p);
  }
  return statTiles(percents, percents.length, sheet.students.length, sheet.passMark);
}

/** One student's term total as the teacher sees it now. */
export interface LiveTotal {
  student: GradingStudent;
  /** Valid scores per assessment id (null when missing or invalid). */
  values: Record<string, number | null>;
  /** Sum of the valid scores; null when there are none. */
  total: number | null;
  entered: number;
  complete: boolean;
  percent: number | null;
  grade: string | null;
  position: GradingPosition | null;
}

/**
 * Every student's running total across all assessments, with the unsaved
 * text counted, and grade and position for those with every score in
 * (positions by total, competition-ranked).
 *
 * @param sheet - The course sheet.
 * @param drafts - Unsaved text by assessment id.
 * @returns One entry per student, in the sheet's order.
 */
export function liveTotals(sheet: CourseGradingSheet, drafts: Record<string, AssessmentDraft | undefined>): LiveTotal[] {
  const n = sheet.assessments.length;
  const rows = sheet.students.map((student) => {
    const values: Record<string, number | null> = {};
    let sum = 0;
    let entered = 0;
    for (const a of sheet.assessments) {
      const v = cellValue(student.scores[a.id], drafts[a.id]?.[student.id], a.maxScore);
      values[a.id] = v;
      if (v !== null) {
        sum += v;
        entered += 1;
      }
    }
    const complete = n > 0 && entered === n;
    const percent = entered ? percentOf(sum, sheet.totalMax) : null;
    return {
      student,
      values,
      total: entered ? Math.round(sum * 100) / 100 : null,
      entered,
      complete,
      percent,
      grade: complete && percent !== null ? gradeFor(percent, sheet.scale) : null,
      position: null as GradingPosition | null,
    };
  });
  const ranks = competitionRanks(rows, (r) => (r.complete ? r.total : null));
  for (const r of rows) r.position = ranks.get(r) ?? null;
  return rows;
}

/**
 * The Term total tiles: complete students, and the average, highest, lowest
 * and pass rate of their totals as a percent of `totalMax`.
 *
 * @param rows - From {@link liveTotals}.
 * @param passMark - The school's pass mark, percent.
 * @returns The tiles.
 */
export function termTotalTiles(rows: readonly LiveTotal[], passMark: number): StatTiles {
  const done = rows.filter((r) => r.complete && r.percent !== null);
  return statTiles(
    done.map((r) => r.percent as number),
    done.length,
    rows.length,
    passMark,
  );
}

/**
 * "Complete", or "2 of 3" assessments entered.
 *
 * @param row - The student's live total.
 * @param of - How many assessments there are.
 * @returns The label and its tone.
 */
export function completenessPill(row: Pick<LiveTotal, "complete" | "entered">, of: number): { label: string; tone: "success" | "warning" | "muted" } {
  if (row.complete) return { label: "Complete", tone: "success" };
  return { label: `${row.entered} of ${of}`, tone: row.entered ? "warning" : "muted" };
}

// ─── Save, publish, lock ────────────────────────────────────────────────────

/**
 * Whether scores can be typed into an assessment: not while it is published
 * (until it is unlocked).
 *
 * @param assessment - The assessment.
 * @returns True when locked.
 */
export function isLocked(assessment: Pick<GradingAssessment, "status">): boolean {
  return assessment.status === "published";
}

/**
 * Whether Publish is enabled: the assessment is not published (a draft, not
 * started, or unlocked), there are students, and every one of them has a
 * valid score on screen with nothing above the maximum.
 *
 * @param sheet - The course sheet.
 * @param assessment - The assessment.
 * @param draft - Its unsaved text.
 * @returns True when the teacher may publish.
 */
export function canPublish(sheet: CourseGradingSheet, assessment: GradingAssessment, draft: AssessmentDraft | undefined): boolean {
  if (isLocked(assessment) || sheet.students.length === 0) return false;
  return sheet.students.every((s) => parseScore(cellText(s.scores[assessment.id], draft?.[s.id]), assessment.maxScore).kind === "valid");
}

/**
 * Counts the cells on screen that cannot be saved (above the maximum or not a number).
 *
 * @param sheet - The course sheet.
 * @param assessment - The assessment.
 * @param draft - Its unsaved text.
 * @returns How many.
 */
export function badCount(sheet: CourseGradingSheet, assessment: GradingAssessment, draft: AssessmentDraft | undefined): number {
  return sheet.students.filter((s) => {
    const kind = parseScore(cellText(s.scores[assessment.id], draft?.[s.id]), assessment.maxScore).kind;
    return kind === "above" || kind === "invalid";
  }).length;
}

/**
 * When something happened, on the school's clock: "today at 4:12pm",
 * "yesterday at 4:12pm" or "on 18 Sep".
 *
 * @param iso - The instant.
 * @param nowMs - Now.
 * @param timezone - The school's timezone.
 * @returns The phrase.
 */
export function whenLabel(iso: string, nowMs: number, timezone: string): string {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return "";
  const then = schoolClock(ms, timezone).date;
  const today = schoolClock(nowMs, timezone).date;
  const yesterday = schoolClock(nowMs - 86_400_000, timezone).date;
  const time = clockTime(iso, timezone);
  if (then === today) return `today at ${time}`;
  if (then === yesterday) return `yesterday at ${time}`;
  return `on ${dayMonth(then)}`;
}

/** The line under the sheet's title, and its tone. */
export interface StatusLine {
  text: string;
  tone: "success" | "danger" | "warning" | "muted" | "accent";
}

/**
 * The status line of the single-assessment sheet (the design's `statusLine`,
 * plus the unlocked state the design does not draw).
 *
 * @param assessment - The assessment.
 * @param bad - Cells above the maximum or not a number.
 * @param dirty - Whether there are unsaved changes.
 * @param nowMs - Now.
 * @param timezone - The school's timezone.
 * @returns The line.
 */
export function assessmentStatusLine(assessment: GradingAssessment, bad: number, dirty: boolean, nowMs: number, timezone: string): StatusLine {
  if (assessment.status === "published") {
    const when = assessment.publishedAt ? whenLabel(assessment.publishedAt, nowMs, timezone) : "";
    return { text: `Published${when ? ` ${when.replace(/^on /, "")}` : ""}. Locked and visible to students and parents.`, tone: "success" };
  }
  if (bad) {
    return { text: `${bad} ${bad === 1 ? "score is" : "scores are"} above the maximum of ${assessment.maxScore} or not a number.`, tone: "danger" };
  }
  if (dirty) return { text: "Unsaved changes", tone: "warning" };
  if (assessment.status === "unlocked") {
    const when = assessment.unlockedAt ? whenLabel(assessment.unlockedAt, nowMs, timezone) : "";
    return {
      text: `Unlocked${when ? ` ${when.replace(/^on /, "")}` : ""} to correct. Students and parents see the last published scores until you publish again.`,
      tone: "accent",
    };
  }
  if (assessment.savedAt) return { text: `Draft saved ${whenLabel(assessment.savedAt, nowMs, timezone)}. Only you can see it.`, tone: "muted" };
  return { text: "Nothing saved yet.", tone: "muted" };
}

/**
 * The Term total's status line: each assessment's state ("1st CA draft 8/12
 * · 2nd CA not started · Exam published"), after "Unsaved changes" when
 * there are some.
 *
 * @param sheet - The course sheet.
 * @param drafts - Unsaved text by assessment id.
 * @returns The line.
 */
export function termTotalStatusLine(sheet: CourseGradingSheet, drafts: Record<string, AssessmentDraft | undefined>): StatusLine {
  const words = sheet.assessments.map((a) => {
    const tab = assessmentTab(sheet, a, drafts[a.id]);
    return `${a.name} ${tab.status.label.toLowerCase().replace(" · ", " ")}`;
  });
  const dirty = sheet.assessments.some((a) => isDirty(sheet, a, drafts[a.id]));
  return { text: [...(dirty ? ["Unsaved changes"] : []), ...words].join(" · "), tone: dirty ? "warning" : "muted" };
}

/**
 * `"2026-10-02"` → `"Fri 2 Oct"`.
 *
 * @param date - `YYYY-MM-DD`.
 * @returns The due date as the design writes it.
 */
export function dueLabel(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return date;
  const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getUTCDay()];
  return `${day} ${dayMonth(date)}`;
}

/** An assessment tab: name, status pill and "Out of 20 · due Fri 2 Oct". */
export interface AssessmentTab {
  name: string;
  meta: string;
  status: { label: string; tone: "success" | "warning" | "muted" | "accent" };
}

/**
 * One assessment's tab. The draft count is live (the valid scores on screen),
 * as the design counts them.
 *
 * @param sheet - The course sheet.
 * @param assessment - The assessment.
 * @param draft - Its unsaved text.
 * @returns The tab.
 */
export function assessmentTab(sheet: CourseGradingSheet, assessment: GradingAssessment, draft: AssessmentDraft | undefined): AssessmentTab {
  const meta = `Out of ${assessment.maxScore} · ${assessment.dueDate ? `due ${dueLabel(assessment.dueDate)}` : "no due date"}`;
  const n = sheet.students.filter((s) => cellValue(s.scores[assessment.id], draft?.[s.id], assessment.maxScore) !== null).length;
  let status: AssessmentTab["status"];
  if (assessment.status === "published") status = { label: "Published", tone: "success" };
  else if (assessment.status === "unlocked") status = { label: "Unlocked", tone: "accent" };
  else if (n > 0) status = { label: `Draft · ${n}/${sheet.students.length}`, tone: "warning" };
  else status = { label: "Not started", tone: "muted" };
  return { name: assessment.name, meta, status };
}

/**
 * The Term total tab: "1st CA + 2nd CA + Exam = 100" and "8/12 complete".
 *
 * @param sheet - The course sheet.
 * @param rows - From {@link liveTotals}.
 * @returns The tab.
 */
export function termTotalTab(sheet: CourseGradingSheet, rows: readonly LiveTotal[]): AssessmentTab {
  const complete = rows.filter((r) => r.complete).length;
  const parts = sheet.assessments.map((a) => a.name).join(" + ");
  return {
    name: "Term total",
    meta: parts ? `${parts} = ${sheet.totalMax}` : "No assessments yet",
    status: { label: `${complete}/${rows.length} complete`, tone: rows.length > 0 && complete === rows.length ? "success" : "muted" },
  };
}

/**
 * Reads the body a failed request carried. Errors have the same shape
 * whether or not the API's success envelope is on, and the client keeps the
 * parsed body on `response.data`.
 *
 * @param error - Whatever was thrown.
 * @returns The 409 body, or null for anything else.
 */
function conflictBody(error: unknown): GradingConflictBody | null {
  if (!(error instanceof ApiError) || error.status !== 409) return null;
  const body = error.response?.data;
  return body && typeof body === "object" ? (body as GradingConflictBody) : {};
}

const CONFLICT_CODES: ReadonlySet<string> = new Set<GradingConflictCode>([
  "LOCKED",
  "NOT_PUBLISHED",
  "PUBLISHED",
  "SCORES_ABOVE_MAX",
  "ALREADY_REMINDED",
  "NO_TEACHER",
  "RESULTS_SUBMITTED",
  "RESULTS_PUBLISHED",
  "ALREADY_SUBMITTED",
  "ALREADY_PUBLISHED",
  "RETURNED",
]);

/**
 * The machine-readable reason of a Round 3 409: the top-level `code` of the
 * error body (`error.code` is always `'CONFLICT'`; it is read only as a
 * fallback, in case a proxy moves the code there).
 *
 * @param error - Whatever the request threw.
 * @returns The code, or null for anything else (including a 409 without one).
 */
export function conflictCode(error: unknown): GradingConflictCode | null {
  const body = conflictBody(error);
  if (!body) return null;
  for (const code of [body.code, body.error?.code]) if (typeof code === "string" && CONFLICT_CODES.has(code)) return code as GradingConflictCode;
  return null;
}

/**
 * Whether a save failed because the assessment is published and locked (409 `LOCKED`).
 *
 * @param error - Whatever the save threw.
 * @returns True for the lock.
 */
export function isLockedError(error: unknown): boolean {
  return conflictCode(error) === "LOCKED";
}

/**
 * The students a publish was refused for (409 `{ missing }`: the ids of the
 * active students without a valid score).
 *
 * @param error - Whatever the publish threw.
 * @returns How many students still need a score, or null for any other error.
 */
export function missingScoresFromError(error: unknown): number | null {
  const body = conflictBody(error);
  return body && Array.isArray(body.missing) ? body.missing.length : null;
}

/**
 * The courses a term-results submit is waiting on (409 `{ waitingOn }`).
 *
 * @param error - Whatever the submit threw.
 * @returns The courses, or null for any other error.
 */
export function waitingOnFromError(error: unknown): { courseId: string; title: string }[] | null {
  const body = conflictBody(error);
  return body && Array.isArray(body.waitingOn) ? body.waitingOn : null;
}

/**
 * When the earlier reminder was sent, from a 409 `ALREADY_REMINDED`.
 *
 * @param error - Whatever the reminder threw.
 * @returns The ISO instant, or null for any other error (or when the body has none).
 */
export function remindedAtFromError(error: unknown): string | null {
  if (conflictCode(error) !== "ALREADY_REMINDED") return null;
  const sentAt = conflictBody(error)?.sentAt;
  return typeof sentAt === "string" && sentAt ? sentAt : null;
}

/**
 * "1 person notified" / "24 people notified". The publish's `notified` counts
 * people told in the app: students and parents, a parent of two counted once.
 *
 * @param n - How many.
 * @returns The phrase.
 */
export function peopleNotified(n: number): string {
  return `${n} ${n === 1 ? "person" : "people"} notified`;
}

/**
 * The toast after a publish: how many people were told, and on a republish
 * how many scores changed. Publishing scores that were already published is
 * a no-op on the server (`changed: []`, `notified: 0`).
 *
 * @param assessmentName - "1st CA".
 * @param result - The publish response.
 * @param result.notified - How many people (students and parents) were notified.
 * @param result.changed - Students whose scores this call published.
 * @param republish - Whether it had been unlocked.
 * @returns The message.
 */
export function publishedMessage(assessmentName: string, result: { notified: number; changed: string[] }, republish: boolean): string {
  if (!republish) {
    if (result.changed.length === 0) return `${assessmentName} was already published. Nobody was notified again.`;
    return `${assessmentName} published. Students and parents can see the scores; ${peopleNotified(result.notified)}.`;
  }
  if (result.changed.length === 0) return `${assessmentName} published again. No score changed, so nobody was notified.`;
  const changed = `${result.changed.length} ${result.changed.length === 1 ? "score" : "scores"} changed`;
  return `${assessmentName} published again. ${changed}; ${peopleNotified(result.notified)}.`;
}

// ─── Class report ───────────────────────────────────────────────────────────

/** Label and tone of a readiness cell. */
export const READINESS_STATUS: Record<AssessmentStatus, { label: string; tone: "success" | "warning" | "muted" | "accent" }> = {
  published: { label: "Published", tone: "success" },
  draft: { label: "Draft", tone: "warning" },
  not_started: { label: "Not started", tone: "muted" },
  unlocked: { label: "Unlocked", tone: "accent" },
};

/**
 * Whether a reminder was already sent on this school day (the server allows
 * one per course and assessment per school day).
 *
 * @param sentAt - When it was last sent.
 * @param nowMs - Now.
 * @param timezone - The school's timezone.
 * @returns True when sent today.
 */
export function remindedToday(sentAt: string | null | undefined, nowMs: number, timezone: string): boolean {
  if (!sentAt) return false;
  const ms = Date.parse(sentAt);
  if (!Number.isFinite(ms)) return false;
  return schoolClock(ms, timezone).date === schoolClock(nowMs, timezone).date;
}

/** What the readiness row's last column offers. */
export type ReadinessAction =
  | { kind: "none" }
  | { kind: "open"; courseId: string; assessmentId: string; tip: string }
  | { kind: "remind"; courseId: string; assessmentId: string; assessmentName: string; teacherName: string; tip: string }
  | { kind: "reminded"; assessmentName: string; tip: string }
  | { kind: "no_teacher" };

/**
 * The action on one readiness row: "Open" on the caller's own course,
 * "Send reminder" (about the first assessment not yet published) on a
 * colleague's, "Reminder sent" once sent today, nothing once all published.
 *
 * @param subject - The row.
 * @param assessments - The columns, in order.
 * @param nowMs - Now.
 * @param timezone - The school's timezone.
 * @returns The action.
 */
export function readinessAction(
  subject: ReadinessSubject,
  assessments: readonly { id: string; name: string }[],
  nowMs: number,
  timezone: string,
): ReadinessAction {
  const pending = assessments
    .map((a) => ({ a, cell: subject.cells.find((c) => c.assessmentId === a.id) }))
    .find((x) => x.cell?.status !== "published");
  if (!pending) return { kind: "none" };
  if (subject.isMine) {
    return { kind: "open", courseId: subject.course.id, assessmentId: pending.a.id, tip: `Open your ${pending.a.name} score sheet` };
  }
  if (!subject.teacher) return { kind: "no_teacher" };
  if (remindedToday(pending.cell?.reminderSentAt, nowMs, timezone)) {
    return { kind: "reminded", assessmentName: pending.a.name, tip: `You reminded ${subject.teacher.name} about ${pending.a.name} today` };
  }
  return {
    kind: "remind",
    courseId: subject.course.id,
    assessmentId: pending.a.id,
    assessmentName: pending.a.name,
    teacherName: subject.teacher.name,
    tip: `Message ${subject.teacher.name} about the ${pending.a.name} deadline`,
  };
}

/**
 * Marks a readiness cell as reminded (after a send, or a 409 "already sent today").
 *
 * @param cells - The row's cells.
 * @param assessmentId - The assessment reminded about.
 * @param sentAt - When.
 * @returns The updated cells.
 */
export function withReminder(cells: readonly ReadinessCell[], assessmentId: string, sentAt: string): ReadinessCell[] {
  return cells.map((c) => (c.assessmentId === assessmentId ? { ...c, reminderSentAt: sentAt } : c));
}

/** How the broadsheet and remarks lists are ordered. */
export type ReportSort = "pos" | "name";

/**
 * Orders rows by position (unranked last, then by name) or A to Z.
 *
 * @param rows - Rows with a student and a position.
 * @param sort - The order.
 * @returns A sorted copy.
 */
export function sortReportRows<T extends { student: { name: string }; position: GradingPosition | null }>(rows: readonly T[], sort: ReportSort): T[] {
  const byName = (a: T, b: T) => a.student.name.localeCompare(b.student.name);
  if (sort === "name") return [...rows].sort(byName);
  return [...rows].sort((a, b) => {
    const ra = a.position?.rank ?? Number.POSITIVE_INFINITY;
    const rb = b.position?.rank ?? Number.POSITIVE_INFINITY;
    return ra === rb ? byName(a, b) : ra - rb;
  });
}

/**
 * Whether a broadsheet cell shows in red: below the D band's minimum, as a
 * percent of the subject's maximum (a Term total cell is already a percent).
 *
 * @param value - The cell.
 * @param maxPerSubject - The basis's maximum per subject; null for Term total.
 * @param threshold - From {@link redThreshold}.
 * @returns True when the score is below the threshold.
 */
export function isBelowThreshold(value: number | null, maxPerSubject: number | null, threshold: number): boolean {
  if (value === null) return false;
  const percent = maxPerSubject ? (value / maxPerSubject) * 100 : value;
  return percent < threshold;
}

/**
 * The note beside the Generate button: ready, or which subjects the summary
 * is waiting on ("(yours)" after the caller's own).
 *
 * @param sheet - The broadsheet.
 * @param mine - Course ids the caller teaches.
 * @returns The note.
 */
export function broadsheetNote(sheet: Pick<Broadsheet, "ready" | "waitingOn" | "basis">, mine: ReadonlySet<string>): string {
  if (sheet.ready) {
    return `Every subject has published ${sheet.basis.label} scores. Generate the summary to rank the class and send it to the school office.`;
  }
  const names = sheet.waitingOn.map((w) => `${w.title}${mine.has(w.courseId) ? " (yours)" : ""}`).join(", ");
  return `Preview only. Waiting on ${names || "subjects that have not published"}. Gaps show as dashes until they publish.`;
}

/** What the summary's footer shows for the chosen basis. */
export interface SubmissionView {
  /** The banner, when there is a submission. */
  banner: { text: string; tone: "success" | "warning" | "info" } | null;
  /** The button's label. */
  label: string;
  /** Whether the button can be pressed (also needs `ready`). */
  canSubmit: boolean;
}

/**
 * The submission state of one basis: nothing yet ("Generate {basis}
 * summary"), submitted (waiting on the office), returned (with the office's
 * reason; submit again) or published.
 *
 * @param submission - The class's submission for this basis, if any.
 * @param basisLabel - "1st CA", "Term total".
 * @param nowMs - Now.
 * @param timezone - The school's timezone.
 * @returns The banner, label and whether it can be (re)submitted.
 */
export function submissionView(submission: TermResultSubmission | undefined, basisLabel: string, nowMs: number, timezone: string): SubmissionView {
  const label = `Generate ${basisLabel} summary`;
  if (!submission) return { banner: null, label, canSubmit: true };
  const on = (iso: string | null | undefined) => (iso ? ` ${whenLabel(iso, nowMs, timezone)}` : "");
  if (submission.status === "submitted") {
    return {
      banner: { text: `Submitted to the school office${on(submission.submittedAt)}. The office publishes it to students and parents.`, tone: "info" },
      label: "Submitted",
      canSubmit: false,
    };
  }
  if (submission.status === "published") {
    return { banner: { text: `Published to students and parents${on(submission.publishedAt)}.`, tone: "success" }, label: "Published", canSubmit: false };
  }
  const reason = submission.returnReason?.trim();
  return {
    banner: {
      text: `Returned by the school office${on(submission.returnedAt)}${reason ? `: “${reason}”` : ""}. Make the changes, then submit it again.`,
      tone: "warning",
    },
    label: `Submit ${basisLabel} summary again`,
    canSubmit: true,
  };
}

/**
 * The class's submission for one basis (a submission's `basis` is
 * `{ key, label }`; `key` is `total` or the assessment id).
 *
 * @param submissions - The class's submissions for the term.
 * @param basisKey - The broadsheet's `basis.key`.
 * @returns The submission, if there is one.
 */
export function submissionFor(submissions: readonly TermResultSubmission[] | undefined, basisKey: string): TermResultSubmission | undefined {
  return submissions?.find((s) => s.basis.key === basisKey);
}

/**
 * Whether the class teacher's remarks are locked: while any of the class's
 * term results for the term are with the office (`submitted`) or `published`
 * (the PUT answers 409 then).
 *
 * @param submissions - The class's submissions for the term.
 * @returns The locking submission, or null.
 */
export function remarksLock(submissions: readonly TermResultSubmission[] | undefined): TermResultSubmission | null {
  return submissions?.find((s) => s.status === "submitted" || s.status === "published") ?? null;
}

/**
 * "4 of 5 subjects published".
 *
 * @param row - A remarks row.
 * @returns The line under the name.
 */
export function publishedLine(row: Pick<TermRemarkRow, "publishedCount" | "subjectCount">): string {
  return `${row.publishedCount} of ${row.subjectCount} ${row.subjectCount === 1 ? "subject" : "subjects"} published`;
}

/**
 * Clamps a remark to the stored maximum.
 *
 * @param text - What was typed.
 * @returns At most {@link REMARK_MAX} characters.
 */
export function clampRemark(text: string): string {
  return text.length > REMARK_MAX ? text.slice(0, REMARK_MAX) : text;
}

/**
 * The broadsheet row's cells with the red flag worked out.
 *
 * @param row - The row.
 * @param maxPerSubject - The basis's maximum per subject.
 * @param threshold - From {@link redThreshold}.
 * @returns Display text and whether each is below the threshold.
 */
export function broadsheetCells(row: Pick<BroadsheetRow, "cells">, maxPerSubject: number | null, threshold: number): { text: string; low: boolean; empty: boolean }[] {
  return row.cells.map((v) => ({
    text: v === null ? DASH : String(Math.round(v * 10) / 10),
    low: isBelowThreshold(v, maxPerSubject, threshold),
    empty: v === null,
  }));
}
