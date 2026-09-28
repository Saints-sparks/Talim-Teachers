/**
 * Response types for the teachers redesign: `GET /teachers/today`,
 * `GET /timetable/me`, `GET /registers/status` and the scheme-of-work
 * "taught" toggle.
 *
 * These are ALIASES of the generated contract (`./api.d.ts`, refreshed with
 * `npm run types:api` from `talimBE-V2/docs/api-types.d.ts`), so a backend
 * shape change fails `tsc` instead of rendering `undefined`. The contract and
 * its as-built deviations are in
 * `talimBE-V2/docs/redesign-teachers-today-timetable.md`.
 *
 * Conventions: dates are `YYYY-MM-DD` school-calendar days, clock times are
 * 24-hour `HH:mm`, `now` is an ISO instant, and "today" is computed in the
 * school's `timezone`.
 *
 * Hand-written on purpose (Swagger is looser or silent there):
 * - `Weekday`: the backend types `day` as `string`; the union is only used by
 *   the dev fixture to build days.
 * - `RegisterIncompleteBody`: the 409 error envelope is not in the generated
 *   responses; only its `missing` field is typed (`RegisterIncompleteDto`).
 */
import type { components } from "./api";

type S = components["schemas"];

/** A school day name as the backend spells it (the contract types it `string`). */
export type Weekday = "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday";

/** One row of the school's bell schedule. Breaks carry no lessons. */
export type Period = S["PeriodDto"];

/** The scheme-of-work week a lesson falls in. */
export type LessonTopic = S["LessonTopicDto"];

/**
 * One timetabled lesson on one date. `classRoomId` is the class-group chat
 * room the teacher is in (null when there is none).
 */
export type Lesson = S["LessonDto"];

/** A lesson in the Today aggregate, with the server's view of its state. */
export type TodayLesson = S["TodayLessonDto"];

/** Where a lesson is relative to "now". */
export type LessonState = TodayLesson["state"];

/**
 * `GET /registers/status` row: one class's morning register for a date.
 * `canSubmit` is about permission and the edit window only; completeness is
 * not considered (an incomplete submission answers 409).
 */
export type RegisterStatus = S["RegisterStatusDto"];

/**
 * Body of the 409 from `POST /registers/:classId/submit`: `missing` sits at
 * the top level of the standard error envelope.
 */
export type RegisterIncompleteBody = S["RegisterIncompleteDto"] & {
  success?: false;
  statusCode?: 409;
  message?: string;
};

export type AttentionItem = S["AttentionItemDto"];
export type AttentionKind = AttentionItem["kind"];
export type AttentionTone = AttentionItem["tone"];
export type AttentionTarget = S["AttentionTargetDto"];
/** The pages an attention action can point at. */
export type AttentionPage = AttentionTarget["page"];

/** A class the teacher teaches or is class teacher of. */
export type TodayClass = S["TodayClassDto"];

export type CalendarEventSummary = S["TodayEventDto"];
export type CalendarEventType = CalendarEventSummary["type"];

export type SetupStep = S["SetupStepDto"];
export type SetupStepKey = SetupStep["key"];

/**
 * Whether today is a school day. `reason` precedence is weekend > holiday >
 * no_term, and lessons are still listed on a `no_term` day.
 */
export type SchoolDay = S["SchoolDayDto"];
export type NonSchoolDayReason = NonNullable<SchoolDay["reason"]>;

/** `GET /teachers/today`. */
export type TeacherToday = S["TeacherTodayDto"];
export type Greeting = TeacherToday["greeting"];

/** One school day of a timetable week. */
export type TimetableDay = S["WeekDayDto"];
export type TimetableTerm = S["TermSummaryDto"];
/**
 * The week being shown. `isCurrent` is true for the week the page opens on by
 * default, which on Saturday and Sunday is NEXT week.
 */
export type TimetableWeekInfo = S["WeekInfoDto"];

/** `GET /timetable/me?weekStart=`. */
export type TimetableWeek = S["TimetableMeDto"];

/** Body of `POST /scheme-of-work/course/:courseId/weeks/:week/taught`. */
export type MarkTaughtBody = S["MarkSchemeWeekTaughtDto"];

/** Response of the taught toggle: `{ week, taughtAt }`. */
export type MarkTaughtResponse = S["SchemeWeekTaughtDto"];
