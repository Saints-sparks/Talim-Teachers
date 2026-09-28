/**
 * Response and request types for the redesign's Attendance and Students
 * screens: "Round 2" sections 11–14 of
 * `talimBE-V2/docs/redesign-teachers-today-timetable.md`.
 *
 * HAND-WRITTEN FROM THE CONTRACT. The backend for these routes was being
 * built in parallel, so they are not in the generated `./api.d.ts` yet. Once
 * `npm run types:api` picks them up, replace each type below with an alias of
 * the generated schema (as `./today.ts` does) and delete the hand-written
 * body; `tsc` then shows any drift.
 *
 * Conventions: dates are `YYYY-MM-DD` school-calendar days; `closesAt`,
 * `editableUntil`, `submittedAt` and `lastEditedAt` are ISO instants; every
 * list is already sorted by the server (classes: class-teacher classes first,
 * then by name; students: by name).
 *
 * Fields marked PROPOSED are not in the contract; the UI works without them.
 */

/** The caller's role in a class. */
export type ClassRole = "class_teacher" | "subject_teacher";

/** A course as the class and roster routes summarise it. */
export interface CourseSummary {
  id: string;
  code: string;
  title: string;
}

/**
 * `GET /teachers/me/classes` (section 11): one class the teacher teaches or
 * is class teacher of. `courses` are the ones the caller teaches in it.
 */
export interface MyClass {
  id: string;
  name: string;
  role: ClassRole;
  studentCount: number;
  capacity: number | null;
  courses: CourseSummary[];
}

/** A mark the teacher can set. `on_leave` comes from the office, never the teacher. */
export type MarkStatus = "present" | "late" | "absent";

/** A student's status on a register; null while unmarked. */
export type RegisterStudentStatus = MarkStatus | "on_leave" | null;

/** Why a register is read-only for the caller (section 12). */
export type RegisterReadOnlyReason = "past" | "future" | "not_class_teacher" | "after_edit_window" | "not_school_day";

/** Approved leave covering the register's date. */
export interface RegisterLeave {
  id: string;
  type: string;
  /** Who asked for it (usually the guardian's name), or null. */
  requestedBy: string | null;
}

/** One student on a register. */
export interface RegisterStudent {
  id: string;
  name: string;
  firstName: string;
  admissionNumber: string | null;
  avatarUrl: string | null;
  status: RegisterStudentStatus;
  absenceReason: string | null;
  /** A note for the school office (new optional field on Attendance). */
  note: string | null;
  leave: RegisterLeave | null;
}

/** The counts shown in the five stat tiles. */
export interface RegisterCounts {
  present: number;
  late: number;
  absent: number;
  onLeave: number;
  unmarked: number;
}

/**
 * `GET /registers/:classId?date=` and the response of
 * `PUT /registers/:classId?date=` (section 12).
 *
 * `access` is `edit` only for the class teacher (or staff), on today, on a
 * school day, before `editableUntil`; staff may also edit past days.
 * Otherwise `readOnlyReason` says why. Future dates answer 200 with
 * `access: 'view'` and `readOnlyReason: 'future'`.
 */
export interface RegisterView {
  class: { id: string; name: string };
  date: string;
  isToday: boolean;
  term: { id: string; name: string; startDate: string; endDate: string } | null;
  schoolDay: {
    isSchoolDay: boolean;
    reason: null | "weekend" | "holiday" | "no_term";
    holidayTitle: string | null;
  };
  closesAt: string;
  editableUntil: string;
  submittedAt: string | null;
  submittedBy: { id: string; name: string } | null;
  lastEditedAt: string | null;
  /** True for a legacy day before register tracking, counted submitted because everyone had a row. */
  inferred: boolean;
  access: "edit" | "view";
  readOnlyReason: RegisterReadOnlyReason | null;
  counts: RegisterCounts;
  students: RegisterStudent[];
  /**
   * PROPOSED, not in the contract: how many parents the last submit notified.
   * Without it the client counts them itself (every absent student on the
   * first submit; only newly absent ones on a resubmit).
   */
  notified?: number;
}

/** One mark in a `PUT /registers/:classId` body. */
export interface RegisterMark {
  studentId: string;
  status: MarkStatus;
  absenceReason?: string;
  note?: string;
}

/**
 * Body of `PUT /registers/:classId?date=`. `submit: false` saves a draft;
 * `submit: true` needs every student not on leave marked, else 409.
 */
export interface SaveRegisterBody {
  marks: RegisterMark[];
  submit: boolean;
}

/**
 * The 409 body of an incomplete submit: `missing` sits at the top level of
 * the standard error envelope.
 */
export interface RegisterMissingBody {
  success?: false;
  statusCode?: 409;
  message?: string;
  error?: { code?: string; message?: string };
  missing: number;
}

/** A guardian as the roster shows it. */
export interface RosterGuardian {
  name: string;
  relationship: string | null;
  phone: string | null;
  email: string | null;
}

/** One student on a class roster. */
export interface RosterStudent {
  id: string;
  name: string;
  firstName: string;
  admissionNumber: string | null;
  email: string | null;
  avatarUrl: string | null;
  attendanceRateTerm: number | null;
  guardian: RosterGuardian | null;
}

/**
 * `GET /teachers/me/classes/:classId/students` (section 13). Attendance rates
 * are (present + late) / (present + late + absent), to 1 decimal; approved
 * leave and Excused are left out. `absentToday` is null until today's
 * register is submitted.
 */
export interface ClassRoster {
  class: { id: string; name: string; role: ClassRole; capacity: number | null; studentCount: number };
  stats: { attendanceRateTerm: number | null; absentToday: number | null; registerSubmitted: boolean };
  courses: CourseSummary[];
  students: RosterStudent[];
}

/** One assessment's score for one student in one course. */
export interface StudentAssessmentScore {
  id: string;
  name: string;
  maxScore: number | null;
  score: number | null;
  classAverage: number | null;
  status: "published" | "draft" | "not_entered";
}

/** A course's scores for one student. `position` is only given when `complete`. */
export interface StudentCourseScores {
  course: CourseSummary;
  className: string;
  assessments: StudentAssessmentScore[];
  total: number | null;
  grade: string | null;
  position: { rank: number; of: number } | null;
  complete: boolean;
}

/** The student's guardian on the record; `userId` is null when they have no Talim account. */
export interface StudentGuardian {
  userId: string | null;
  name: string;
  relationship: string | null;
  occupation: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
}

/**
 * `GET /teachers/me/students/:studentId` (section 14). `scores` covers only
 * the courses the caller teaches (staff: all of the student's courses).
 */
export interface StudentRecord {
  student: {
    id: string;
    name: string;
    firstName: string;
    admissionNumber: string | null;
    class: { id: string; name: string };
    dateOfBirth: string | null;
    gender: string | null;
    email: string | null;
    avatarUrl: string | null;
  };
  school: { name: string };
  guardian: StudentGuardian | null;
  attendance: { rate: number | null; schoolDays: number; present: number; late: number; absent: number; onLeave: number };
  scores: StudentCourseScores[];
}
