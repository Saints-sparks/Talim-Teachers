/**
 * Pure logic for the redesigned Attendance screen: merging the teacher's
 * unsaved marks over the server's register, the five counts, whether the
 * register can be edited and submitted, the banner for each access state,
 * school-day stepping and weekend snapping, and reading the 409 `missing`
 * count. No React.
 */
import { ApiError } from "@/lib/apiError";
import { clockTime, registerDeadline } from "@/hooks/today/today.logic";
import type { MarkStatus, RegisterCounts, RegisterMark, RegisterStudent, RegisterView } from "@/types/classroom";

/** The absence reasons the design offers, in its order. */
export const ABSENCE_REASONS = ["Sick", "Medical appointment", "Family matter", "Travel", "No reason given"] as const;

/** A mark the teacher has set on this device and not yet seen come back from the server. */
export interface LocalMark {
  status: MarkStatus;
  absenceReason: string | null;
  note: string | null;
}

/** Unsaved marks by student id. */
export type MarkOverlay = Record<string, LocalMark>;

/** The label for each status, as the design writes it. */
export const STATUS_LABEL: Record<NonNullable<RegisterStudent["status"]> | "none", string> = {
  present: "Present",
  late: "Late",
  absent: "Absent",
  on_leave: "Approved leave",
  none: "Not marked",
};

/**
 * The register as the teacher sees it: the server's students with any local
 * marks laid over them. Students on leave are never overridden.
 *
 * @param students - The server's students.
 * @param overlay - Local marks.
 * @returns The merged students.
 */
export function mergeMarks(students: readonly RegisterStudent[], overlay: MarkOverlay): RegisterStudent[] {
  return students.map((s) => {
    const mark = overlay[s.id];
    if (!mark || s.status === "on_leave") return s;
    return { ...s, status: mark.status, absenceReason: mark.absenceReason, note: mark.note };
  });
}

/**
 * The five tile counts.
 *
 * @param students - The (merged) students.
 * @returns Present, late, absent, on leave and not marked.
 */
export function countRegister(students: readonly RegisterStudent[]): RegisterCounts {
  const counts: RegisterCounts = { present: 0, late: 0, absent: 0, onLeave: 0, unmarked: 0 };
  for (const s of students) {
    if (s.status === "present") counts.present++;
    else if (s.status === "late") counts.late++;
    else if (s.status === "absent") counts.absent++;
    else if (s.status === "on_leave") counts.onLeave++;
    else counts.unmarked++;
  }
  return counts;
}

/** How far through the register the teacher is. */
export interface RegisterProgress {
  /** Students marked Present, Late or Absent. */
  marked: number;
  /** Students who need a mark (everyone not on leave). */
  markable: number;
  /** True when everyone who needs a mark has one (and there is at least one). */
  allMarked: boolean;
  onLeave: number;
  absent: number;
}

/**
 * Progress through the register. Students on approved leave count as marked
 * by the office, so they are left out of both numbers.
 *
 * @param students - The (merged) students.
 * @returns The progress.
 */
export function registerProgress(students: readonly RegisterStudent[]): RegisterProgress {
  const c = countRegister(students);
  const marked = c.present + c.late + c.absent;
  const markable = students.length - c.onLeave;
  return { marked, markable, allMarked: markable > 0 && marked === markable, onLeave: c.onLeave, absent: c.absent };
}

/**
 * The sticky footer's two lines: `"8 of 11 marked"` and either
 * `"3 still to mark · 1 on approved leave"` or `"Ready to submit. 2 absent
 * parents will be notified."`.
 *
 * @param progress - From {@link registerProgress}.
 * @param toNotify - Parents a submit would notify (defaults to every absent student).
 * @returns The headline and the note.
 */
export function progressText(progress: RegisterProgress, toNotify: number = progress.absent): { headline: string; note: string } {
  const headline = `${progress.marked} of ${progress.markable} marked`;
  if (progress.markable === 0) return { headline, note: "Nobody needs a mark." };
  if (progress.allMarked) {
    const notify = toNotify ? ` ${toNotify} absent ${toNotify === 1 ? "parent" : "parents"} will be notified.` : "";
    return { headline, note: `Ready to submit.${notify}` };
  }
  const left = progress.markable - progress.marked;
  return { headline, note: `${left} still to mark${progress.onLeave ? ` · ${progress.onLeave} on approved leave` : ""}` };
}

/**
 * Whether the teacher can change marks right now: the server grants edit
 * access, and the register is either not submitted yet or reopened with
 * "Edit register".
 *
 * @param view - The register.
 * @param editing - Whether a submitted register has been reopened.
 * @returns True when the segmented controls should show.
 */
export function canEditRegister(view: Pick<RegisterView, "access" | "submittedAt">, editing: boolean): boolean {
  return view.access === "edit" && (!view.submittedAt || editing);
}

/**
 * Whether Submit (or Resubmit) is enabled: editable and everyone marked.
 *
 * @param view - The register.
 * @param editing - Whether a submitted register has been reopened.
 * @param students - The merged students.
 * @returns True when the button is live.
 */
export function canSubmitRegister(view: Pick<RegisterView, "access" | "submittedAt">, editing: boolean, students: readonly RegisterStudent[]): boolean {
  return canEditRegister(view, editing) && registerProgress(students).allMarked;
}

/** The banner above the register. */
export interface RegisterBanner {
  tone: "info" | "success" | "warning" | "danger" | "neutral";
  text: string;
  /** The banner's button, if any. */
  action?: "edit" | "cancel";
}

/**
 * Chooses the banner for the register's state, from the server's `access`
 * and `readOnlyReason` plus whether the teacher reopened a submitted one:
 *
 * - editable, submitted → "Submitted at 8:44am …" with Edit register;
 * - reopened → "You are editing a submitted register …" with Cancel;
 * - editable, open after `closesAt` → overdue;
 * - editable and open before the close time → no banner (the design's);
 * - `past`, `future`, `not_class_teacher`, `after_edit_window`,
 *   `not_school_day` → the read-only explanation for each.
 *
 * @param view - The register.
 * @param editing - Whether a submitted register has been reopened.
 * @param nowMs - The current instant.
 * @param timezone - The school's timezone.
 * @returns The banner, or null.
 */
export function registerBanner(view: RegisterView, editing: boolean, nowMs: number, timezone: string): RegisterBanner | null {
  const submittedAt = clockTime(view.submittedAt, timezone);
  const editUntil = clockTime(view.editableUntil, timezone);
  const by = view.submittedBy?.name ? ` by ${view.submittedBy.name}` : "";

  if (view.access === "edit") {
    if (view.submittedAt && editing) {
      return { tone: "warning", text: "You are editing a submitted register. Resubmit to save your changes.", action: "cancel" };
    }
    if (view.submittedAt) {
      const until = view.isToday ? ` You can edit until ${editUntil} today.` : " You can still correct it.";
      return { tone: "success", text: `Submitted at ${submittedAt}. Parents of absent students were notified.${until}`, action: "edit" };
    }
    const deadline = view.isToday ? registerDeadline(view, nowMs, timezone) : null;
    if (deadline?.overdue) {
      return { tone: "danger", text: `Register overdue · closed at ${deadline.time}. Submit it as soon as you can; parents of absent students are told when you do.` };
    }
    return null;
  }

  switch (view.readOnlyReason) {
    case "not_class_teacher": {
      const state = view.submittedAt
        ? ` Submitted at ${submittedAt}${by}.`
        : view.schoolDay.isSchoolDay && view.isToday
          ? " It has not been submitted yet."
          : "";
      return { tone: "info", text: `View only. Only the class teacher can take this register.${state}` };
    }
    case "after_edit_window":
      return view.submittedAt
        ? { tone: "info", text: `Submitted at ${submittedAt}${by}. Changes closed at ${editUntil}, so the register is read-only now. Ask the school office if a record needs correcting.` }
        : { tone: "danger", text: `This register was not submitted before ${editUntil}. Ask the school office to record today's attendance.` };
    case "not_school_day":
      if (view.schoolDay.reason === "weekend") return { tone: "neutral", text: "There is no register at weekends." };
      if (view.schoolDay.reason === "holiday") {
        return { tone: "neutral", text: `${view.schoolDay.holidayTitle || "Holiday"}: the school is closed, so there is no register ${view.isToday ? "today" : "for this day"}.` };
      }
      return { tone: "neutral", text: "This day is outside the term, so there is no register." };
    case "future":
      return { tone: "neutral", text: "This day has not come yet. Its register opens that morning." };
    case "past":
    default:
      return { tone: "info", text: "Past registers are read-only. Ask the school office if a record needs correcting." };
  }
}

/**
 * The marks a PUT sends: every student not on leave who has a status.
 *
 * @param students - The merged students.
 * @returns The body's `marks`.
 */
export function marksFor(students: readonly RegisterStudent[]): RegisterMark[] {
  const out: RegisterMark[] = [];
  for (const s of students) {
    if (s.status !== "present" && s.status !== "late" && s.status !== "absent") continue;
    const mark: RegisterMark = { studentId: s.id, status: s.status };
    if (s.status === "absent" && s.absenceReason) mark.absenceReason = s.absenceReason;
    if (s.note) mark.note = s.note;
    out.push(mark);
  }
  return out;
}

/**
 * "Mark the rest present": every unmarked student not on leave becomes
 * Present; marks already set are kept.
 *
 * @param students - The merged students.
 * @param overlay - The current local marks.
 * @returns The new overlay.
 */
export function markRestPresent(students: readonly RegisterStudent[], overlay: MarkOverlay): MarkOverlay {
  const next = { ...overlay };
  for (const s of students) {
    if (s.status === null) next[s.id] = { status: "present", absenceReason: null, note: null };
  }
  return next;
}

/**
 * Drops local marks the server now holds, keeping any made while a save was
 * in flight.
 *
 * @param overlay - Local marks.
 * @param server - The server's students after the save.
 * @returns The marks still unsaved.
 */
export function pruneSaved(overlay: MarkOverlay, server: readonly RegisterStudent[]): MarkOverlay {
  const next: MarkOverlay = {};
  for (const [id, mark] of Object.entries(overlay)) {
    const s = server.find((x) => x.id === id);
    const same =
      s && s.status === mark.status && (s.absenceReason ?? null) === (mark.absenceReason ?? null) && (s.note ?? null) === (mark.note ?? null);
    if (!same) next[id] = mark;
  }
  return next;
}

/**
 * How many parents a submit would notify, for the footer before it is sent:
 * every absent student on a first submit, only the newly absent on a
 * resubmit (the contract's rule). After a submit the toast uses the
 * response's `notified` instead.
 *
 * @param students - The merged students being submitted.
 * @param absentAtLastSubmit - Ids absent when the register was last submitted (empty on a first submit).
 * @returns The count.
 */
export function parentsToNotify(students: readonly RegisterStudent[], absentAtLastSubmit: readonly string[]): number {
  return students.filter((s) => s.status === "absent" && !absentAtLastSubmit.includes(s.id)).length;
}

/**
 * The toast after a submit: `"Register for JSS1 A submitted. 2 absent parents
 * have been notified."`.
 *
 * @param className - The class.
 * @param notified - Parents notified.
 * @returns The message.
 */
export function submittedMessage(className: string, notified: number): string {
  const tail = notified ? ` ${notified} absent ${notified === 1 ? "parent has" : "parents have"} been notified.` : " No parents needed notifying.";
  return `Register for ${className} submitted.${tail}`;
}

/**
 * Reads the `missing` count from the 409 of an incomplete submit. It sits at
 * the top level of the error envelope, which the client keeps as the error's
 * `response.data`.
 *
 * @param error - Whatever the PUT threw.
 * @returns The number of students still unmarked, or null for any other error.
 */
export function missingFromError(error: unknown): number | null {
  if (!(error instanceof ApiError) || error.status !== 409) return null;
  const body = error.response?.data as { missing?: unknown } | undefined;
  const missing = Number(body?.missing);
  return Number.isFinite(missing) && missing >= 0 ? missing : null;
}

/** The register's date limits: the term's first day and today. */
export interface DateBounds {
  min?: string;
  max?: string;
}

const DAY_MS = 86_400_000;

/**
 * Moves a `YYYY-MM-DD` by whole days, in UTC so the device timezone never shifts it.
 *
 * @param date - The day.
 * @param days - Days to add (negative to go back).
 * @returns The new day.
 */
export function addDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

/**
 * Whether a day is a Saturday or Sunday.
 *
 * @param date - `YYYY-MM-DD`.
 * @returns True at the weekend.
 */
export function isWeekend(date: string): boolean {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  return day === 0 || day === 6;
}

/**
 * The previous or next school day (weekends skipped), within the bounds.
 *
 * @param date - The current day.
 * @param direction - -1 for back, 1 for forward.
 * @param bounds - The term's first day and today.
 * @returns The new day, or null when it would leave the bounds.
 */
export function stepSchoolDay(date: string, direction: -1 | 1, bounds: DateBounds): string | null {
  let next = date;
  do next = addDays(next, direction);
  while (isWeekend(next));
  if (bounds.min && next < bounds.min) return null;
  if (bounds.max && next > bounds.max) return null;
  return next;
}

/**
 * What the date input's value becomes: clamped to the term and today, and a
 * Saturday or Sunday snapped back to the Friday (the caller then says so).
 *
 * @param value - The input's value (`YYYY-MM-DD`, or empty).
 * @param bounds - The term's first day and today.
 * @returns The day to show and whether it was snapped from a weekend, or null for an empty value.
 */
export function clampRegisterDate(value: string, bounds: DateBounds): { date: string; snapped: boolean } | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  let date = value;
  if (bounds.max && date > bounds.max) date = bounds.max;
  if (bounds.min && date < bounds.min) date = bounds.min;
  let snapped = false;
  if (isWeekend(date)) {
    snapped = true;
    date = addDays(date, new Date(`${date}T00:00:00Z`).getUTCDay() === 6 ? -1 : -2);
    if (bounds.min && date < bounds.min) date = bounds.min;
  }
  return { date, snapped };
}

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/**
 * The register card's heading: `"JSS1 A · Friday 25 September · today"`.
 *
 * @param view - The register.
 * @returns The heading.
 */
export function registerHeading(view: Pick<RegisterView, "class" | "date" | "isToday">): string {
  const d = new Date(`${view.date}T00:00:00Z`);
  const label = Number.isNaN(d.getTime()) ? view.date : `${WEEKDAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
  return `${view.class.name} · ${label}${view.isToday ? " · today" : ""}`;
}

/**
 * Initials for an avatar: first letters of the first two words.
 *
 * @param name - The full name.
 * @returns One or two capital letters.
 */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

/**
 * A stable avatar tone (`tl-tone-N`) for a student, so the same student has
 * the same colour on every screen.
 *
 * @param id - The student's id.
 * @returns A tone class.
 */
export function avatarTone(id: string): string {
  let hash = 0;
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return `tl-tone-${[1, 2, 3, 0, 5][hash % 5]}`;
}
