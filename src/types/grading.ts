/**
 * Request and response types for the redesigned Grading page: "Round 3",
 * sections 15–23 of `talimBE-V2/docs/redesign-teachers-today-timetable.md`,
 * with its "Round 3 as built" list (which wins where the two disagree).
 *
 * These are ALIASES of the generated contract (`./api.d.ts`, refreshed with
 * `npm run types:api` from `talimBE-V2/docs/api-types.d.ts`), as `./today.ts`
 * and `./classroom.ts` do, so a backend shape change fails `tsc` instead of
 * rendering `undefined`. Each type names the section it comes from.
 *
 * As built (and so as typed here):
 * - an assessment's `type` is `string | null` (null when the school set none);
 * - unlock answers `{ status: 'unlocked', unlockedAt }`;
 * - publish's `notified` counts PEOPLE told in-app (students and parents; a
 *   parent of two is counted once);
 * - the broadsheet carries the school's `scale` and `passMark`;
 * - a remark nobody has written is `''`, never null (class teacher's and
 *   principal's alike);
 * - a term-result submission names its `class`, `term` and `basis` as
 *   objects (`basis: { key, label }`), and every `*By` is `{ id, name } | null`.
 *
 * Hand-written on purpose (Swagger is silent there):
 * - {@link GradingConflictBody} and {@link GradingConflictCode}: the 409 error
 *   envelope is not in the generated responses (Swagger only describes it in
 *   prose). The machine-readable fields sit at the TOP LEVEL of the error
 *   body, beside `error.code: 'CONFLICT'`.
 * - {@link BroadsheetBasisKey}: the contract types the basis as `string`
 *   (`'total'` or an assessment id); the alias only names that.
 *
 * Conventions (from the contract): ids are strings; dates are `YYYY-MM-DD`
 * and instants ISO strings; every percent is 0–100 rounded to 1 decimal;
 * positions use standard competition ranking (ties share a rank and the next
 * rank is skipped: 1, 1, 3); grades are computed on read from the school's
 * scale.
 */
import type { components } from "./api";

type S = components["schemas"];

/** A course as the grading routes summarise it. */
export type GradingCourseRef = S["GradingCourseRefDto"];

/** A class as the grading routes summarise it. */
export type GradingClassRef = S["GradingClassRefDto"];

/** A term as the grading routes summarise it. */
export type GradingTermRef = S["GradingTermRefDto"];

/** A person the grading routes name (`id` is their login). */
export type GradingPerson = S["GradingPersonDto"];

/**
 * §16: one band of the school's grade scale. Bands come highest first,
 * `min` strictly descending, and the last band's `min` is 0.
 */
export type GradeBand = S["GradingScaleBandDto"];

/** §17: one assessment of the term, as the course sheet lists it. */
export type GradingAssessment = S["GradingSheetAssessmentDto"];

/**
 * §17 and §19: where one assessment stands for one course. `unlocked` means
 * published once, then reopened to correct a mistake; students and parents
 * still see the last published scores until it is republished.
 */
export type AssessmentStatus = GradingAssessment["status"];

/** §17: the server's statistics for one assessment, over the students with a score. Percents. */
export type AssessmentStats = S["GradingAssessmentStatsDto"];

/** A competition-ranked position: `rank` of `of` ranked students. */
export type GradingPosition = S["GradingPositionDto"];

/** §17: one student's row on the course sheet. */
export type GradingStudent = S["GradingSheetStudentDto"];

/**
 * §17 `GET /grading/course/:courseId?termId=` (course teacher and staff; a
 * same-school teacher who does not teach it gets 403, another school's
 * course 404). Also the response of the §18 save.
 */
export type CourseGradingSheet = S["GradingSheetDto"];

/** §18: one score to save; `null` deletes it. */
export type ScoreInput = S["GradingScoreInputDto"];

/**
 * §18 `PUT /grading/course/:courseId/assessments/:assessmentId/scores`.
 * Upserts; answers 400 for a score outside 0..`maxScore` or with more than 2
 * decimals, and 409 `LOCKED` while the assessment is published (not
 * unlocked) for this course. Responds with the §17 sheet.
 */
export type SaveScoresBody = S["SaveGradingScoresDto"];

/**
 * §19 `POST /grading/course/:courseId/assessments/:assessmentId/publish`.
 * Needs a valid score for every active student, else 409 `{ missing }`.
 * `changed` is every student on a first publish, those whose score changed
 * on a republish, and empty when the scores were already published.
 * `notified` counts people told in-app (students and parents).
 */
export type PublishResult = S["GradingPublishResultDto"];

/** §19 `POST /grading/course/:courseId/assessments/:assessmentId/unlock`; 409 `NOT_PUBLISHED` unless published. */
export type UnlockBody = S["UnlockGradingScoresDto"];

/** §19: the unlock's answer, `{ status: 'unlocked', unlockedAt }`. */
export type UnlockResult = S["GradingUnlockResultDto"];

/** §20: one assessment column of the readiness table. */
export type ReadinessAssessment = S["ReadinessAssessmentDto"];

/** §20: one course's status for one assessment. */
export type ReadinessCell = S["ReadinessCellDto"];

/** §20: one course (subject) of the class; `teacher.id` is their login. */
export type ReadinessSubject = S["ReadinessSubjectDto"];

/** §20 `GET /grading/classes/:classId/readiness?termId=` (class teacher and staff). */
export type ClassReadiness = S["ClassReadinessDto"];

/**
 * §20 `POST /grading/classes/:classId/reminders` (class teacher only). Once
 * per (course, assessment) per school day; after that 409 `ALREADY_REMINDED`
 * with the earlier `sentAt`.
 */
export type ReminderBody = S["SendGradingReminderDto"];

/** §20: the reminder's response. */
export type ReminderResult = S["GradingReminderSentDto"];

/** §21: what a broadsheet is built from: one assessment (its id) or `total`. */
export type BroadsheetBasisKey = S["BroadsheetBasisDto"]["key"];

/** §21: one subject column. `published` is for the chosen basis. */
export type BroadsheetSubject = S["BroadsheetSubjectDto"];

/** §21: one student's row. `cells` line up with `subjects`; null where not published. */
export type BroadsheetRow = S["BroadsheetRowDto"];

/** §21: a subject the broadsheet (or a submit) is still waiting on. */
export type BroadsheetWaiting = S["BroadsheetWaitingDto"];

/**
 * §21 `GET /grading/classes/:classId/broadsheet?termId=&basis=<assessmentId>|total`
 * (class teacher and staff). Published scores only. For `basis=total` each
 * cell is the student's course total as a percent (`maxPerSubject` null).
 * Carries the school's `scale` and `passMark`.
 */
export type Broadsheet = S["BroadsheetDto"];

/** §22: one student's row on the Remarks tab. Remarks are `''` until written. */
export type TermRemarkRow = S["TermRemarkRowDto"];

/** §22 `GET /grading/classes/:classId/remarks?termId=` (class teacher and staff); also what the PUT answers. */
export type TermRemarks = S["TermRemarksDto"];

/**
 * §22 `PUT /grading/classes/:classId/remarks` (class teacher or staff). 409
 * `RESULTS_SUBMITTED` while the class's term results are with the office and
 * `RESULTS_PUBLISHED` once they are published.
 */
export type SaveRemarksBody = S["SaveClassTeacherRemarksDto"];

/**
 * §23: one submission of a class's term results, unique on class, term and
 * basis. `basis` is `{ key, label }` (the assessment's name or "Term total").
 */
export type TermResultSubmission = S["TermResultSubmissionDto"];

/** §23: where a class's submitted results stand. */
export type TermResultStatus = TermResultSubmission["status"];

/**
 * §23 `POST /grading/classes/:classId/term-results` (class teacher or staff).
 * 409 `{ waitingOn }` unless the §21 broadsheet is `ready`, `ALREADY_SUBMITTED`
 * or `ALREADY_PUBLISHED`. Responds with the submission.
 */
export type SubmitTermResultsBody = S["SubmitTermResultsDto"];

/**
 * The `code` of a Round 3 409 ("Round 3 as built", Everywhere). It sits at
 * the top level of the error body; `error.code` is always `'CONFLICT'`.
 */
export type GradingConflictCode =
  | "LOCKED"
  | "NOT_PUBLISHED"
  | "PUBLISHED"
  | "SCORES_ABOVE_MAX"
  | "ALREADY_REMINDED"
  | "NO_TEACHER"
  | "RESULTS_SUBMITTED"
  | "RESULTS_PUBLISHED"
  | "ALREADY_SUBMITTED"
  | "ALREADY_PUBLISHED"
  | "RETURNED";

/**
 * The body of a Round 3 409. HAND-WRITTEN: the error envelope is not in the
 * generated responses. The machine-readable fields sit at the top level of
 * the standard error envelope (as `missing` does on the register submit),
 * beside `error.code: 'CONFLICT'`; which ones are present depends on the
 * route. Errors look the same whether or not the success envelope is on.
 */
export interface GradingConflictBody {
  success?: false;
  statusCode?: 409;
  message?: string;
  /** Always `'CONFLICT'` for these; read the top-level `code` instead. */
  error?: { code?: string; message?: string };
  code?: GradingConflictCode;
  /** §19 publish: the ids of the active students without a valid score. */
  missing?: string[];
  /** §23 submit and office publish: the subjects not yet published for the basis. */
  waitingOn?: BroadsheetWaiting[];
  /** §20 `ALREADY_REMINDED`: when the earlier reminder was sent (ISO). */
  sentAt?: string;
  /** §23 office publish that is not `submitted`: where the submission stands. */
  status?: TermResultStatus;
  /** §15 `SCORES_ABOVE_MAX`: the highest recorded draft score. */
  highestScore?: number;
}
