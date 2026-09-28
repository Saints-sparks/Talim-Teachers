/**
 * Response and request types for the redesign's Attendance and Students
 * screens: "Round 2" sections 11–14 of
 * `talimBE-V2/docs/redesign-teachers-today-timetable.md`.
 *
 * These are ALIASES of the generated contract (`./api.d.ts`, refreshed with
 * `npm run types:api`), as `./today.ts` does, so a backend shape change fails
 * `tsc` instead of rendering `undefined`. Where the contract's sections and
 * its "Round 2 as built" list disagree, the as-built list (and so these
 * types) wins:
 *
 * - the roster's `class.role` can be `'staff'` for a school admin or sub-admin;
 * - `leave.requestedBy` is the name of the student's parent;
 * - the guardian's `occupation` and `address` are always null (nothing stores
 *   them), so the record hides those rows when null;
 * - the register carries `today` (the school's current date) and a save
 *   answers `notified` (parents told by that call);
 * - `readOnlyReason` is the most specific reason, in this order:
 *   `not_school_day` > `future` > `past` (never for staff) >
 *   `not_class_teacher` > `after_edit_window`.
 *
 * Conventions: dates are `YYYY-MM-DD` school-calendar days; `closesAt`,
 * `editableUntil`, `submittedAt` and `lastEditedAt` are ISO instants; every
 * list is already sorted by the server (classes: class-teacher classes first,
 * then by name; students: by name).
 *
 * Hand-written on purpose: `RegisterMissingBody`, because the 409 error
 * envelope is not in the generated responses (only `missing` is typed).
 */
import type { components } from "./api";

type S = components["schemas"];

/** The caller's role in a class; `staff` only for school admins on the roster. */
export type ClassRole = S["RosterClassDto"]["role"];

/** A course as the class and roster routes summarise it. */
export type CourseSummary = S["ClassCourseDto"];

/**
 * `GET /teachers/me/classes` (section 11): one class the teacher teaches or
 * is class teacher of. `courses` are the ones the caller teaches in it.
 */
export type MyClass = S["MyClassDto"];

/** A mark the teacher can set. `on_leave` comes from the office, never the teacher. */
export type MarkStatus = S["RegisterMarkDto"]["status"];

/** One student on a register. */
export type RegisterStudent = S["RegisterStudentDto"];

/** A student's status on a register; null while unmarked. */
export type RegisterStudentStatus = RegisterStudent["status"];

/** Approved leave covering the register's date; `requestedBy` is the parent's name. */
export type RegisterLeave = S["RegisterLeaveDto"];

/** The counts shown in the five stat tiles. */
export type RegisterCounts = S["RegisterCountsDto"];

/**
 * `GET /registers/:classId?date=` (section 12).
 *
 * `access` is `edit` only for the class teacher (or staff), on today, on a
 * school day, before `editableUntil`; staff may also edit past days.
 * Otherwise `readOnlyReason` says why (precedence in the header comment).
 * `today` is the school's current date.
 */
export type RegisterView = S["RegisterSheetDto"];

/** Why a register is read-only for the caller. */
export type RegisterReadOnlyReason = NonNullable<RegisterView["readOnlyReason"]>;

/** `PUT /registers/:classId?date=`: the register after the save, plus the parents this call `notified`. */
export type RegisterSaved = S["RegisterSaveDto"];

/** One mark in a `PUT /registers/:classId` body. */
export type RegisterMark = S["RegisterMarkDto"];

/**
 * Body of `PUT /registers/:classId?date=`. `submit: false` saves a draft;
 * `submit: true` needs every student not on leave marked, else 409 (the
 * marks sent are still saved).
 */
export type SaveRegisterBody = S["SaveRegisterDto"];

/**
 * The 409 body of an incomplete submit: `missing` sits at the top level of
 * the standard error envelope.
 */
export type RegisterMissingBody = S["RegisterIncompleteDto"] & {
  success?: false;
  statusCode?: 409;
  message?: string;
  error?: { code?: string; message?: string };
};

/** A guardian as the roster shows it. */
export type RosterGuardian = S["RosterGuardianDto"];

/** One student on a class roster. */
export type RosterStudent = S["RosterStudentDto"];

/**
 * `GET /teachers/me/classes/:classId/students` (section 13). Attendance rates
 * are (present + late) / (present + late + absent), to 1 decimal; approved
 * leave and Excused are left out. `absentToday` is null until today's
 * register is submitted.
 */
export type ClassRoster = S["ClassRosterDto"];

/** One assessment's score for one student in one course. */
export type StudentAssessmentScore = S["StudentAssessmentScoreDto"];

/** A course's scores for one student. `position` is only given when `complete`. */
export type StudentCourseScores = S["StudentCourseScoresDto"];

/**
 * The student's guardian on the record; `userId` is null when they have no
 * Talim account. `occupation` and `address` are always null today.
 */
export type StudentGuardian = S["StudentRecordGuardianDto"];

/**
 * `GET /teachers/me/students/:studentId` (section 14). `scores` covers only
 * the courses the caller teaches (staff: all of the student's courses).
 */
export type StudentRecord = S["StudentRecordDto"];
