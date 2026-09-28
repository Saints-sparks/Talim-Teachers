/**
 * Response types for the teachers redesign: `GET /teachers/today` and
 * `GET /timetable/me`, plus the scheme-of-work "taught" toggle.
 *
 * HAND-WRITTEN from the API contract in
 * `talimBE-V2/docs/redesign-teachers-today-timetable.md` (2026-09-28) while the
 * backend is being built. Once the endpoints ship, run `npm run types:api` and
 * replace these with aliases of the generated `components["schemas"]` types so
 * drift fails `tsc` (see `src/types/apiContract.ts` for the pattern).
 *
 * Conventions from the contract: dates are `YYYY-MM-DD` school-calendar days,
 * clock times are 24-hour `HH:mm`, `now` is an ISO instant, and "today" is
 * computed in the school's `timezone`.
 */

/** A school day name as the backend spells it. */
export type Weekday = "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday";

/** One row of the school's bell schedule. Breaks carry no lessons. */
export interface Period {
  /** Stable key, e.g. `p1`, `brk`, or `t0800-0840` when derived. */
  key: string;
  label: string;
  startTime: string;
  endTime: string;
  isBreak: boolean;
}

/** The scheme-of-work week a lesson falls in. */
export interface LessonTopic {
  week: number;
  topic: string;
  objectives: string;
  /** ISO instant the week was ticked off as taught, or null. */
  taughtAt: string | null;
}

/** One timetabled lesson on one date. */
export interface Lesson {
  /** The timetable entry id; unique within a week (one entry per weekday). */
  id: string;
  date: string;
  day: Weekday;
  periodKey: string | null;
  startTime: string;
  endTime: string;
  course: { id: string; code: string; title: string };
  subject: { id: string; name: string } | null;
  class: { id: string; name: string };
  room: string | null;
  /** Whether the signed-in teacher is class teacher of `class`. */
  isClassTeacher: boolean;
  studentCount: number;
  topic: LessonTopic | null;
  /** Set on holidays and after an early close. */
  cancelled: { reason: string } | null;
}

/** Where a lesson is relative to "now". */
export type LessonState = "done" | "now" | "later";

/** A lesson in the Today aggregate, with the server's view of its state. */
export interface TodayLesson extends Lesson {
  state: LessonState;
  minutesLeft: number | null;
}

/** `GET /registers/status` row: one class's morning register for a date. */
export interface RegisterStatus {
  classId: string;
  className: string;
  isClassTeacher: boolean;
  studentCount: number;
  markedCount: number;
  onLeaveCount: number;
  submittedAt: string | null;
  /** True when `submittedAt` was inferred from legacy attendance rows. */
  inferred: boolean;
  closesAt: string;
  editableUntil: string;
  canSubmit: boolean;
}

export type AttentionKind =
  | "register"
  | "scores_start"
  | "scores_missing"
  | "scores_publish"
  | "reply"
  | "resource"
  | "leave_request";

export type AttentionTone = "warning" | "neutral" | "success" | "info" | "accent";

/** The pages an attention action can point at. */
export type AttentionPage = "attendance" | "grading" | "messages" | "resources" | "subjects" | "leave";

export interface AttentionTarget {
  page: AttentionPage;
  classId?: string;
  courseId?: string;
  assessmentId?: string;
  roomId?: string;
  week?: number;
  date?: string;
}

/** One entry of "Needs your attention", most urgent first. */
export interface AttentionItem {
  id: string;
  kind: AttentionKind;
  tone: AttentionTone;
  title: string;
  description: string;
  action: { label: string; target: AttentionTarget };
}

/** A class the teacher teaches or is class teacher of. */
export interface TodayClass {
  id: string;
  name: string;
  role: "class_teacher" | "subject_teacher";
  studentCount: number;
  capacity: number | null;
  /** Percentage 0-100, or null when nothing is recorded yet. */
  attendanceRateTerm: number | null;
  /** Today's register; null for classes the teacher is not class teacher of. */
  register: { submittedAt: string | null } | null;
}

export type CalendarEventType = "holiday" | "event" | "early_close";

export interface CalendarEventSummary {
  id: string;
  title: string;
  type: CalendarEventType;
  startDate: string;
  endDate: string;
}

export type SetupStepKey = "profile" | "register" | "publish" | "resource" | "plan" | "tour";

export interface SetupStep {
  key: SetupStepKey;
  label: string;
  done: boolean;
}

export type Greeting = "morning" | "afternoon" | "evening";

/** Why today is not a school day. */
export type NonSchoolDayReason = "weekend" | "holiday" | "no_term";

export interface SchoolDay {
  isSchoolDay: boolean;
  reason: NonSchoolDayReason | null;
  holidayTitle: string | null;
  endsEarlyAt: string | null;
}

/** `GET /teachers/today`. */
export interface TeacherToday {
  date: string;
  day: Weekday;
  timezone: string;
  now: string;
  greeting: Greeting;
  term: { id: string; name: string } | null;
  weekNumber: number | null;
  schoolDay: SchoolDay;
  periods: Period[];
  lessons: TodayLesson[];
  nowLessonId: string | null;
  nextLessonId: string | null;
  firstLessonAt: string | null;
  lastLessonEndsAt: string | null;
  registers: RegisterStatus[];
  attention: AttentionItem[];
  classes: TodayClass[];
  events: CalendarEventSummary[];
  setup: { percent: number; steps: SetupStep[] };
  counts: { unreadMessages: number; unreadNotifications: number; pendingRegisters: number };
}

/** One school day of a timetable week. */
export interface TimetableDay {
  date: string;
  day: Weekday;
  isToday: boolean;
  holiday: { title: string } | null;
  endsEarlyAt: string | null;
  events: { id: string; title: string; type: CalendarEventType }[];
}

export interface TimetableTerm {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  totalWeeks: number;
}

export interface TimetableWeekInfo {
  number: number | null;
  start: string;
  end: string;
  isCurrent: boolean;
  prevStart: string;
  nextStart: string;
  inTerm: boolean;
}

/** `GET /timetable/me?weekStart=`. */
export interface TimetableWeek {
  timezone: string;
  now: string;
  today: string;
  term: TimetableTerm | null;
  week: TimetableWeekInfo;
  days: TimetableDay[];
  periods: Period[];
  periodsSource: "school" | "derived";
  lessons: Lesson[];
}

/** Body of `POST /scheme-of-work/course/:courseId/weeks/:week/taught`. */
export interface MarkTaughtBody {
  termId?: string;
  taught: boolean;
}

/**
 * Response of the taught toggle. The contract does not specify it; only
 * `taughtAt` is read, and the caches are refetched afterwards anyway.
 */
export interface MarkTaughtResponse {
  week?: number;
  taughtAt?: string | null;
}
