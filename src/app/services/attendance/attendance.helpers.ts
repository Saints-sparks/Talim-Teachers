/**
 * Pure attendance logic: the payload builder, the statistics, the roster
 * updates and the failure classification. No React, no network — everything the
 * marking flow decides is decided here so it can be tested without a browser.
 */
import { ApiError } from "@/lib/apiError";
import type {
  AttendanceStats,
  AttendanceStatus,
  ClassAttendanceStatus,
  CreateAttendancePayload,
  MarkableStatus,
  StudentAttendanceStatus,
} from "@/types/attendance";

/**
 * Roles the backend lets mark attendance. `AttendanceService.markAttendance`
 * rejects everything but `teacher` with 403 "Only teachers can mark
 * attendance", so a `school_sub_admin` signed in to this portal gets the
 * read-only view.
 */
export const ATTENDANCE_MARKING_ROLES: readonly string[] = ["teacher"];

/**
 * Whether a role may record attendance.
 *
 * @param role - The signed-in user's `role`.
 * @returns True only for roles the server accepts on `POST /attendance`.
 */
export function canMarkAttendance(role: string | null | undefined): boolean {
  return Boolean(role) && ATTENDANCE_MARKING_ROLES.includes(role as string);
}

/**
 * The device's local calendar day as `YYYY-MM-DD`, used to keep one day's
 * roster and unsent marks apart from the next day's.
 *
 * @param now - The moment to read; defaults to the current time.
 * @returns The local date, zero-padded.
 */
export function localDayKey(now: Date = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

/**
 * The `date` the API buckets a mark under: the teacher's own calendar day at
 * UTC midnight. `toISOString()` of "now" would send the UTC instant, which is
 * the wrong day for a teacher marking just after midnight local time (00:30 in
 * UTC+1 is still the previous UTC day). The mobile app sends the same shape, so
 * one register lands on one day whichever app took the marks.
 *
 * @param now - The moment the mark is made.
 * @returns `YYYY-MM-DDT00:00:00.000Z` for the local day.
 */
export function attendanceDateFor(now: Date): string {
  return `${localDayKey(now)}T00:00:00.000Z`;
}

/** What the marking screen knows about one student before submitting. */
export interface MarkInput {
  studentId: string;
  classId: string | null | undefined;
  termId: string | null | undefined;
  status: MarkableStatus | null | undefined;
  absenceReason?: string;
  /** Injected so tests can pin the timestamp. */
  now?: Date;
}

/** A payload ready to send, or the reason it cannot be sent yet. */
export type PayloadResult =
  | { ok: true; payload: CreateAttendancePayload }
  | { ok: false; problem: "no-status" | "no-reason" | "no-term" | "no-class" | "no-student"; message: string };

/**
 * Builds the body of `POST /attendance` from what the teacher entered,
 * mirroring the server's validation: every id present, a status chosen, and a
 * non-blank reason whenever the status is `Absent` (the server answers 400
 * without one). The reason is sent only for absences and is trimmed; nothing
 * outside `CreateAttendanceDto` is included.
 *
 * @param input - The mark as entered.
 * @returns The payload, or which requirement is missing.
 */
export function buildAttendancePayload(input: MarkInput): PayloadResult {
  if (!input.studentId) return { ok: false, problem: "no-student", message: "That student could not be found." };
  if (!input.classId) return { ok: false, problem: "no-class", message: "This class could not be found." };
  if (!input.termId) {
    return { ok: false, problem: "no-term", message: "The current term hasn't loaded yet. Try again in a moment." };
  }
  if (!input.status) return { ok: false, problem: "no-status", message: "Choose Present or Absent first." };

  const payload: CreateAttendancePayload = {
    studentId: input.studentId,
    classId: input.classId,
    date: attendanceDateFor(input.now ?? new Date()),
    status: input.status,
    termId: input.termId,
  };

  if (input.status === "Absent") {
    const reason = (input.absenceReason ?? "").trim();
    if (!reason) {
      return { ok: false, problem: "no-reason", message: "Please provide a reason for absence before submitting." };
    }
    payload.absenceReason = reason;
  }

  return { ok: true, payload };
}

/**
 * Counts the roster by status. The server's own counters go stale the moment
 * a mark is submitted, so the screens always count from the students they hold.
 *
 * @param students - The roster rows.
 * @returns The totals shown in the stat cards.
 */
export function computeAttendanceStats(students: readonly StudentAttendanceStatus[]): AttendanceStats {
  const stats: AttendanceStats = { total: students.length, present: 0, absent: 0, late: 0, excused: 0, marked: 0, pending: 0 };
  for (const student of students) {
    if (!student.attendanceMarked) {
      stats.pending += 1;
      continue;
    }
    stats.marked += 1;
    if (student.attendanceStatus === "Present") stats.present += 1;
    else if (student.attendanceStatus === "Absent") stats.absent += 1;
    else if (student.attendanceStatus === "Late") stats.late += 1;
    else if (student.attendanceStatus === "Excused") stats.excused += 1;
  }
  return stats;
}

/**
 * A whole-number percentage for a progress bar.
 *
 * @param part - The numerator.
 * @param total - The denominator.
 * @returns 0-100; 0 when there is nothing to divide by.
 */
export function percentOf(part: number, total: number): number {
  if (!total || total <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((part / total) * 100)));
}

/** How a student's attendance rate reads at a glance. */
export type AttendanceBand = "excellent" | "good" | "poor";

/**
 * Bands an attendance rate: 90% and above is excellent, 75% and above good,
 * anything lower poor.
 *
 * @param rate - Attendance rate as a percentage; missing counts as 0.
 * @returns The band.
 */
export function attendanceBand(rate: number | null | undefined): AttendanceBand {
  const value = rate ?? 0;
  if (value >= 90) return "excellent";
  if (value >= 75) return "good";
  return "poor";
}

/** The fields a stored mark adds to a roster row. */
export interface StoredMark {
  status: AttendanceStatus;
  absenceReason?: string;
  recordedAt: string;
}

/**
 * Returns the class status with one student's mark recorded and the server
 * counters brought back in step. Used to show a submitted mark immediately,
 * without another request over a weak connection. The input is not mutated.
 *
 * @param status - The class status currently cached.
 * @param studentId - The student whose mark was stored.
 * @param mark - What was stored.
 * @returns A new status; the input unchanged when the student is not on the roster.
 */
export function applyMarkToStatus(
  status: ClassAttendanceStatus,
  studentId: string,
  mark: StoredMark,
): ClassAttendanceStatus {
  if (!status.students.some((student) => student.studentId === studentId)) return status;

  const students = status.students.map((student) =>
    student.studentId === studentId
      ? {
          ...student,
          attendanceMarked: true,
          attendanceStatus: mark.status,
          absenceReason: mark.absenceReason,
          recordedAt: mark.recordedAt,
        }
      : student,
  );
  const stats = computeAttendanceStats(students);

  return {
    ...status,
    students,
    totalStudents: stats.total,
    attendanceMarked: stats.marked,
    attendanceNotMarked: stats.pending,
    presentCount: stats.present,
    absentCount: stats.absent,
    lateCount: stats.late,
    excusedCount: stats.excused,
  };
}

/**
 * Orders the marking grid: students still to be marked first, marked ones
 * after, each group keeping the server's order.
 *
 * @param students - The roster rows.
 * @returns A new array; the input is not reordered.
 */
export function orderForMarking(students: readonly StudentAttendanceStatus[]): StudentAttendanceStatus[] {
  const pending = students.filter((student) => !student.attendanceMarked);
  const marked = students.filter((student) => student.attendanceMarked);
  return [...pending, ...marked];
}

/**
 * Case-insensitive name search over a roster.
 *
 * @param students - The roster rows.
 * @param query - What the teacher typed.
 * @returns The matching rows; all of them for a blank query.
 */
export function filterRoster(students: readonly StudentAttendanceStatus[], query: string): StudentAttendanceStatus[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [...students];
  return students.filter((student) => `${student.firstName} ${student.lastName}`.toLowerCase().includes(needle));
}

/**
 * Up to two initials for an avatar.
 *
 * @param firstName - Given name; may be blank.
 * @param lastName - Family name; may be blank.
 * @returns Upper-case initials, or "?" when both names are blank.
 */
export function initialsOf(firstName?: string, lastName?: string): string {
  return `${firstName?.trim()?.[0] ?? ""}${lastName?.trim()?.[0] ?? ""}`.toUpperCase() || "?";
}

/** A mark the teacher has chosen but not yet sent. */
export interface DraftMark {
  status?: MarkableStatus;
  reason?: string;
}

/**
 * Drops unsent marks for students the server already has a mark for, so a
 * mark recorded elsewhere (another device, or an earlier request whose answer
 * was lost) is never shown as pending or sent a second time.
 *
 * @param drafts - Unsent marks by student id.
 * @param students - The roster as the server reports it.
 * @returns The same object when nothing changed, otherwise a pruned copy.
 */
export function pruneDrafts(
  drafts: Readonly<Record<string, DraftMark>>,
  students: readonly StudentAttendanceStatus[],
): Record<string, DraftMark> {
  const markedIds = new Set(students.filter((student) => student.attendanceMarked).map((student) => student.studentId));
  const stale = Object.keys(drafts).filter((id) => markedIds.has(id));
  if (stale.length === 0) return drafts as Record<string, DraftMark>;
  const next = { ...drafts };
  for (const id of stale) delete next[id];
  return next;
}

/** How a failed submit should be handled and explained. */
export interface SubmitFailure {
  /** Which situation this is, for the retry affordance. */
  kind: "offline" | "forbidden" | "not-found" | "rejected" | "server";
  /** A message safe to show the teacher; always says the mark was kept. */
  message: string;
  /** The server may already hold this mark, so re-read the roster before retrying. */
  reconcile: boolean;
  /** Retrying unchanged could succeed. */
  retryable: boolean;
}

/**
 * Turns a failed `POST /attendance` into what the teacher should see, keyed on
 * `error.code` (never on message text). Every branch keeps the mark: the caller
 * must not clear the draft on failure.
 *
 * A timeout or dropped connection may have reached the server before the
 * answer was lost, and the server rejects a second mark for the same student
 * and day with `BAD_REQUEST` — so those two situations ask the caller to
 * re-read the roster.
 *
 * @param error - Whatever the request threw.
 * @returns The classification and the message to show.
 */
export function classifySubmitFailure(error: unknown): SubmitFailure {
  if (!(error instanceof ApiError)) {
    return { kind: "server", message: "Couldn't send this mark. It's saved here — tap Retry.", reconcile: true, retryable: true };
  }

  switch (error.code) {
    case "NETWORK_OFFLINE":
      return {
        kind: "offline",
        message: "You're offline. Your mark is saved here — tap Retry when you're back online.",
        reconcile: false,
        retryable: true,
      };
    case "REQUEST_TIMEOUT":
    case "SERVICE_UNAVAILABLE":
      return {
        kind: "offline",
        message: "The connection dropped. Your mark is saved here — tap Retry.",
        reconcile: true,
        retryable: true,
      };
    case "FORBIDDEN":
      return {
        kind: "forbidden",
        message: "You aren't allowed to mark attendance for this class. Your mark was not sent.",
        reconcile: false,
        retryable: false,
      };
    case "NOT_FOUND":
      return {
        kind: "not-found",
        message: "This student or class could not be found. Refresh the page and try again.",
        reconcile: false,
        retryable: false,
      };
    case "BAD_REQUEST":
    case "VALIDATION_FAILED":
      // "Already recorded" arrives as BAD_REQUEST, so the roster is re-read to tell the cases apart.
      return {
        kind: "rejected",
        message: error.message || "The server rejected this mark. Check it and try again.",
        reconcile: true,
        retryable: true,
      };
    default:
      return {
        kind: "server",
        message: error.isTransient
          ? "The server is busy. Your mark is saved here — tap Retry."
          : error.message || "Couldn't send this mark. It's saved here — tap Retry.",
        reconcile: error.isTransient,
        retryable: true,
      };
  }
}
