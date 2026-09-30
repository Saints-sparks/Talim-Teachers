/**
 * Pure logic of the Attendance history page (`/analytics/attendance`): the
 * period presets and the date range, each student's counts and rate over it,
 * the class totals, sorting and search, and the page's address. No React.
 *
 * The rate is the redesign's everywhere else (the Students roster, the
 * student record): late counts as attended and approved leave (Excused) is
 * left out, so rate = (present + late) / (present + late + absent).
 */
import type { StudentAttendanceKpis } from "@/types/attendance";

/** A period of school days, both ends `YYYY-MM-DD` and included. */
export interface DateRange {
  from: string;
  to: string;
}

/** The quick periods, and "custom" for dates typed in. */
export type HistoryPreset = "week" | "month" | "term" | "custom";

/** The quick periods in the order the page offers them. */
export const HISTORY_PRESETS: readonly { key: Exclude<HistoryPreset, "custom">; label: string; tip: string }[] = [
  { key: "week", label: "This week", tip: "Monday to today" },
  { key: "month", label: "This month", tip: "The 1st of the month to today" },
  { key: "term", label: "This term", tip: "The first day of term to today" },
];

/** A rate at or above this is on track; below it the student is counted in "Below 90%". */
export const ON_TRACK_RATE = 90;
/** Below this a rate is shown in the danger tone. */
export const AT_RISK_RATE = 75;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * Whether a string is a real calendar date written `YYYY-MM-DD`.
 *
 * @param value - What to check.
 * @returns True for a valid date.
 */
export function isIsoDate(value: string | null | undefined): value is string {
  if (!value || !ISO_DATE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

/**
 * Moves a date by whole days.
 *
 * @param date - `YYYY-MM-DD`.
 * @param days - How many days (negative goes back).
 * @returns The new date.
 */
export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * The Monday of a date's week (a Sunday belongs to the week before).
 *
 * @param date - `YYYY-MM-DD`.
 * @returns That week's Monday.
 */
export function mondayOf(date: string): string {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  return addDays(date, day === 0 ? -6 : 1 - day);
}

/**
 * The dates a quick period covers, ending today.
 *
 * @param preset - The period.
 * @param today - Today at the school, `YYYY-MM-DD`.
 * @param termStart - The current term's first day, if known (a full ISO instant is fine).
 * @returns The range, or null for "custom" and for "term" without a term.
 */
export function presetRange(preset: HistoryPreset, today: string, termStart?: string | null): DateRange | null {
  if (preset === "week") return { from: mondayOf(today), to: today };
  if (preset === "month") return { from: `${today.slice(0, 8)}01`, to: today };
  if (preset === "term") {
    const start = termStart?.slice(0, 10);
    if (!isIsoDate(start)) return null;
    return { from: start <= today ? start : today, to: today };
  }
  return null;
}

/**
 * Which quick period a range is, if any.
 *
 * @param range - The range on screen.
 * @param today - Today at the school.
 * @param termStart - The current term's first day, if known.
 * @returns The preset, or "custom".
 */
export function matchPreset(range: DateRange, today: string, termStart?: string | null): HistoryPreset {
  for (const { key } of HISTORY_PRESETS) {
    const r = presetRange(key, today, termStart);
    if (r && r.from === range.from && r.to === range.to) return key;
  }
  return "custom";
}

/**
 * Checks a typed range: both ends real dates, the start not after the end,
 * the end not after today.
 *
 * @param range - The dates typed.
 * @param today - Today at the school.
 * @returns What is wrong, or null when the range can be loaded.
 */
export function rangeProblem(range: Partial<DateRange>, today: string): string | null {
  if (!isIsoDate(range.from)) return "Choose a start date.";
  if (!isIsoDate(range.to)) return "Choose an end date.";
  if (range.from > range.to) return "The start date is after the end date.";
  if (range.to > today) return "The end date is after today.";
  return null;
}

/**
 * The range as the page's headings write it: "28 Sep 2026", "1 – 30 Sep 2026",
 * "7 Sep – 2 Oct 2026" or "15 Dec 2025 – 9 Jan 2026".
 *
 * @param range - The range.
 * @returns The text.
 */
export function rangeText(range: DateRange): string {
  const [fy, fm, fd] = range.from.split("-").map(Number);
  const [ty, tm, td] = range.to.split("-").map(Number);
  const end = `${td} ${MONTHS[tm - 1]} ${ty}`;
  if (range.from === range.to) return end;
  if (fy !== ty) return `${fd} ${MONTHS[fm - 1]} ${fy} – ${end}`;
  if (fm !== tm) return `${fd} ${MONTHS[fm - 1]} – ${end}`;
  return `${fd} – ${end}`;
}

/** The counts the page shows for a student or the class. */
export interface AttendanceCounts {
  present: number;
  late: number;
  absent: number;
  /** Approved leave (stored as Excused). */
  onLeave: number;
}

/**
 * The attendance rate: late counts as attended, leave is left out.
 *
 * @param counts - Present, late and absent days.
 * @returns The rate in percent with one decimal, or null with nothing to count.
 */
export function rateOf(counts: Pick<AttendanceCounts, "present" | "late" | "absent">): number | null {
  const counted = counts.present + counts.late + counts.absent;
  if (counted <= 0) return null;
  return Math.round(((counts.present + counts.late) / counted) * 1000) / 10;
}

/**
 * How a rate reads: on track (90% and up), a concern (75% and up), at risk,
 * or no records.
 *
 * @param rate - The rate, or null.
 * @returns The tone.
 */
export function rateTone(rate: number | null): "success" | "warning" | "danger" | "muted" {
  if (rate === null) return "muted";
  if (rate >= ON_TRACK_RATE) return "success";
  if (rate >= AT_RISK_RATE) return "warning";
  return "danger";
}

/** A roster entry, as much of it as the history needs. */
export interface HistoryStudent {
  id: string;
  name: string;
  admissionNumber?: string | null;
  avatarUrl?: string | null;
}

/** One student's row: who, and (once loaded) their counts and rate over the range. */
export interface HistoryRow extends HistoryStudent {
  counts: AttendanceCounts | null;
  /** Days with a mark in the range, leave included. */
  days: number;
  rate: number | null;
}

/**
 * A student's row from their roster entry and their figures for the range.
 *
 * @param student - The roster entry.
 * @param kpis - `GET /attendance/student/:id/kpis?startDate=&endDate=`, once loaded.
 * @returns The row; `counts` is null until the figures arrive.
 */
export function historyRow(student: HistoryStudent, kpis?: Pick<StudentAttendanceKpis, "presentDays" | "lateDays" | "absentDays" | "excusedDays" | "totalDays"> | null): HistoryRow {
  if (!kpis) return { ...student, counts: null, days: 0, rate: null };
  const counts: AttendanceCounts = {
    present: kpis.presentDays ?? 0,
    late: kpis.lateDays ?? 0,
    absent: kpis.absentDays ?? 0,
    onLeave: kpis.excusedDays ?? 0,
  };
  return { ...student, counts, days: kpis.totalDays ?? counts.present + counts.late + counts.absent + counts.onLeave, rate: rateOf(counts) };
}

/** The class over the range, from the rows that have loaded. */
export interface HistoryTotals extends AttendanceCounts {
  rate: number | null;
  /** Students with records whose rate is below {@link ON_TRACK_RATE}. */
  below: number;
  /** Rows whose figures have loaded. */
  loaded: number;
}

/**
 * Adds the loaded rows up.
 *
 * @param rows - The rows.
 * @returns The class's counts, rate and how many are below 90%.
 */
export function historyTotals(rows: readonly HistoryRow[]): HistoryTotals {
  const totals: HistoryTotals = { present: 0, late: 0, absent: 0, onLeave: 0, rate: null, below: 0, loaded: 0 };
  for (const row of rows) {
    if (!row.counts) continue;
    totals.loaded += 1;
    totals.present += row.counts.present;
    totals.late += row.counts.late;
    totals.absent += row.counts.absent;
    totals.onLeave += row.counts.onLeave;
    if (row.rate !== null && row.rate < ON_TRACK_RATE) totals.below += 1;
  }
  totals.rate = rateOf(totals);
  return totals;
}

/** How the rows are ordered. */
export type HistorySort = "name" | "lowest";

/**
 * Orders the rows: by name, or lowest rate first (no records last, then by name).
 *
 * @param rows - The rows.
 * @param sort - The order.
 * @returns A new, sorted array.
 */
export function sortRows(rows: readonly HistoryRow[], sort: HistorySort): HistoryRow[] {
  const byName = (a: HistoryRow, b: HistoryRow) => a.name.localeCompare(b.name);
  if (sort === "name") return [...rows].sort(byName);
  return [...rows].sort((a, b) => {
    if (a.rate === null && b.rate === null) return byName(a, b);
    if (a.rate === null) return 1;
    if (b.rate === null) return -1;
    return a.rate - b.rate || byName(a, b);
  });
}

/**
 * Filters the rows by name or admission number.
 *
 * @param rows - The rows.
 * @param query - What was typed.
 * @returns The matching rows.
 */
export function filterRows(rows: readonly HistoryRow[], query: string): HistoryRow[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...rows];
  return rows.filter((r) => `${r.name} ${r.admissionNumber ?? ""}`.toLowerCase().includes(q));
}

/** The page's address: `?classId=&from=&to=&studentId=`. */
export interface HistoryParams {
  classId?: string;
  from?: string;
  to?: string;
  /** A student to highlight (the student record's "Full attendance history"). */
  studentId?: string;
}

/**
 * Reads the page's query, dropping dates that are not real dates.
 *
 * @param source - Anything with `get` (the page's search params).
 * @param source.get - Reads one parameter.
 * @returns The parameters that were usable.
 */
export function parseHistoryParams(source: { get(name: string): string | null }): HistoryParams {
  const out: HistoryParams = {};
  const classId = source.get("classId")?.trim();
  if (classId) out.classId = classId;
  const studentId = source.get("studentId")?.trim();
  if (studentId) out.studentId = studentId;
  const from = source.get("from")?.trim();
  if (isIsoDate(from)) out.from = from;
  const to = source.get("to")?.trim();
  if (isIsoDate(to)) out.to = to;
  return out;
}

/**
 * The page's address for what is on screen.
 *
 * @param params - The class, range and highlighted student.
 * @returns `/analytics/attendance?classId=&from=&to=&studentId=`, without the empty parts.
 */
export function historyHref(params: HistoryParams): string {
  const search = new URLSearchParams();
  if (params.classId) search.set("classId", params.classId);
  if (params.from) search.set("from", params.from);
  if (params.to) search.set("to", params.to);
  if (params.studentId) search.set("studentId", params.studentId);
  const query = search.toString();
  return query ? `/analytics/attendance?${query}` : "/analytics/attendance";
}
