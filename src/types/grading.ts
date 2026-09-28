/**
 * Request and response types for the redesigned Grading page: "Round 3",
 * sections 15–23 of `talimBE-V2/docs/redesign-teachers-today-timetable.md`.
 *
 * HAND-WRITTEN, on purpose and for now: the backend for these routes is being
 * built in parallel and is not in the generated contract (`./api.d.ts`) yet.
 * When it lands, run `npm run types:api` and turn each type below into an
 * alias of its generated DTO, as `./today.ts` and `./classroom.ts` do, so a
 * backend shape change fails `tsc` instead of rendering `undefined`. Each
 * type names the section it comes from.
 *
 * Where the contract leaves a detail open, the choice made here is marked
 * "ASSUMED"; fields the page would use but the contract does not have are
 * marked "NOT IN THE CONTRACT" and are optional, so the page works without
 * them.
 *
 * Conventions (from the contract): ids are strings; dates are `YYYY-MM-DD`
 * and instants ISO strings; every percent is 0–100 rounded to 1 decimal;
 * positions use standard competition ranking (ties share a rank and the next
 * rank is skipped: 1, 1, 3); grades are computed on read from the school's
 * scale.
 */

/** A course as the grading routes summarise it. */
export interface GradingCourseRef {
  id: string;
  code: string;
  title: string;
}

/** A class as the grading routes summarise it. */
export interface GradingClassRef {
  id: string;
  name: string;
}

/** A term as the grading routes summarise it. */
export interface GradingTermRef {
  id: string;
  name: string;
}

/**
 * §16: one band of the school's grade scale. Bands come highest first,
 * `min` strictly descending, and the last band's `min` is 0.
 */
export interface GradeBand {
  letter: string;
  /** Lowest percent that earns this letter. */
  min: number;
  remark: string | null;
}

/**
 * §17 and §19: where one assessment stands for one course. `unlocked` means
 * published once, then reopened to correct a mistake; students and parents
 * still see the last published scores until it is republished.
 */
export type AssessmentStatus = "not_started" | "draft" | "published" | "unlocked";

/** §17: the server's statistics for one assessment, over the students with a score. Percents. */
export interface AssessmentStats {
  entered: number;
  /** Active students in the class. */
  total: number;
  average: number | null;
  highest: number | null;
  lowest: number | null;
  /** Share of scores at or above `passMark`. */
  passRate: number | null;
}

/** §17: one assessment of the term, as the course sheet lists it. */
export interface GradingAssessment {
  id: string;
  name: string;
  /** The assessment's type as the admin set it (e.g. `ca`, `exam`). ASSUMED: free text. */
  type: string;
  /** §15: set by the admin on the assessment, 1..1000. */
  maxScore: number;
  dueDate: string | null;
  status: AssessmentStatus;
  savedAt: string | null;
  publishedAt: string | null;
  unlockedAt: string | null;
  stats: AssessmentStats;
}

/** A competition-ranked position: `rank` of `of` ranked students. */
export interface GradingPosition {
  rank: number;
  of: number;
}

/** §17: one student's row on the course sheet. */
export interface GradingStudent {
  id: string;
  name: string;
  admissionNumber: string | null;
  /** Every assessment's saved score by assessment id; null when not entered. */
  scores: Record<string, number | null>;
  /** Sum of the entered scores; null when none. */
  total: number | null;
  /** `total / totalMax` as a percent. */
  percent: number | null;
  /** Only when `complete`. */
  grade: string | null;
  /** Only when `complete`. */
  position: GradingPosition | null;
  /** Every assessment has a score. */
  complete: boolean;
}

/**
 * §17 `GET /grading/course/:courseId?termId=` (course teacher and staff; a
 * same-school teacher who does not teach it gets 403, another school's
 * course 404). Also the response of the §18 save.
 */
export interface CourseGradingSheet {
  course: GradingCourseRef;
  class: GradingClassRef;
  term: GradingTermRef;
  scale: GradeBand[];
  /** Percent. */
  passMark: number;
  /** Every assessment in the term, ordered by start date then name. */
  assessments: GradingAssessment[];
  /** Sum of the assessments' `maxScore`. */
  totalMax: number;
  /** By name. */
  students: GradingStudent[];
}

/** §18: one score to save; `null` deletes it. */
export interface ScoreInput {
  studentId: string;
  score: number | null;
}

/**
 * §18 `PUT /grading/course/:courseId/assessments/:assessmentId/scores`.
 * Upserts; answers 400 for a score above the assessment's `maxScore` or below
 * 0, and 409 `{ code: 'LOCKED' }` while the assessment is published (not
 * unlocked) for this course. Responds with the §17 sheet.
 */
export interface SaveScoresBody {
  termId?: string;
  scores: ScoreInput[];
}

/**
 * §18 and §19: the 409 bodies. ASSUMED: `code` and `missing` sit at the top
 * level of the standard error envelope, as `missing` does on the register
 * submit (Round 1, §5); the page also reads `error.code`.
 */
export interface GradingConflictBody {
  success?: false;
  statusCode?: 409;
  message?: string;
  error?: { code?: string; message?: string };
  /** `'LOCKED'` from a save to a published assessment. */
  code?: string;
  /** From a publish with students still missing a score. */
  missing?: number;
  /** From a term-results submit that is not ready (§23). */
  waitingOn?: { courseId: string; title: string }[];
}

/**
 * §19 `POST /grading/course/:courseId/assessments/:assessmentId/publish`.
 * Needs a valid score for every active student, else 409 `{ missing }`.
 */
export interface PublishResult {
  publishedAt: string;
  /** Students whose score changed since the unlock (empty on a first publish). */
  changed: string[];
  /**
   * How many people were notified. ASSUMED: students plus parents; the
   * contract says only `number`, so the toast says "people".
   */
  notified: number;
}

/** §19 `POST /grading/course/:courseId/assessments/:assessmentId/unlock`; 409 unless published. */
export interface UnlockBody {
  reason?: string;
}

/** §20: one assessment column of the readiness table. */
export interface ReadinessAssessment {
  id: string;
  name: string;
  maxScore: number;
}

/** §20: one course's status for one assessment. */
export interface ReadinessCell {
  assessmentId: string;
  status: AssessmentStatus;
  /** When the class teacher last reminded the course teacher about it. */
  reminderSentAt: string | null;
}

/** §20: one course (subject) of the class. */
export interface ReadinessSubject {
  course: GradingCourseRef;
  teacher: { id: string; name: string } | null;
  /** The caller teaches this course. */
  isMine: boolean;
  /** One per assessment, in the order of `assessments`. */
  cells: ReadinessCell[];
}

/** §20 `GET /grading/classes/:classId/readiness?termId=` (class teacher and staff). */
export interface ClassReadiness {
  class: GradingClassRef;
  term: GradingTermRef;
  assessments: ReadinessAssessment[];
  subjects: ReadinessSubject[];
}

/**
 * §20 `POST /grading/classes/:classId/reminders` (class teacher only). Once
 * per (course, assessment) per school day; after that 409.
 */
export interface ReminderBody {
  courseId: string;
  assessmentId: string;
}

/** §20: the reminder's response. */
export interface ReminderResult {
  sentAt: string;
}

/** §21: what a broadsheet is built from: one assessment (its id) or `total`. */
export type BroadsheetBasisKey = string;

/** §21: one subject column. `published` is for the chosen basis. */
export interface BroadsheetSubject {
  courseId: string;
  code: string;
  title: string;
  published: boolean;
}

/** §21: one student's row. `cells` line up with `subjects`; null where not published. */
export interface BroadsheetRow {
  student: { id: string; name: string; admissionNumber: string | null };
  cells: (number | null)[];
  total: number | null;
  /** Percent over the published subjects. */
  average: number | null;
  position: GradingPosition | null;
  grade: string | null;
  publishedCount: number;
}

/**
 * §21 `GET /grading/classes/:classId/broadsheet?termId=&basis=<assessmentId>|total`
 * (class teacher and staff). Published scores only. For `basis=total` each
 * cell is the student's course total as a percent (`maxPerSubject` null).
 */
export interface Broadsheet {
  class: GradingClassRef;
  term: GradingTermRef;
  basis: { key: BroadsheetBasisKey; label: string; maxPerSubject: number | null };
  subjects: BroadsheetSubject[];
  rows: BroadsheetRow[];
  /** Every subject has published the basis. */
  ready: boolean;
  waitingOn: { courseId: string; title: string }[];
  /**
   * NOT IN THE CONTRACT (requested): the school's grade scale, so the sheet
   * can colour scores below the D band's minimum. Without it the page uses a
   * scale it already has (a course sheet), else 45%.
   */
  scale?: GradeBand[];
}

/** §22: one student's row on the Remarks tab. */
export interface TermRemarkRow {
  student: { id: string; name: string; admissionNumber: string | null };
  /** ASSUMED: the same `{ rank, of }` shape as the other routes. */
  position: GradingPosition | null;
  /** Percent over the published subjects. */
  average: number | null;
  publishedCount: number;
  subjectCount: number;
  /** Max 500 characters. */
  classTeacherRemark: string;
  /** Written by the office; read-only here. */
  principalRemark: string | null;
}

/** §22 `GET /grading/classes/:classId/remarks?termId=` (class teacher and staff). */
export interface TermRemarks {
  rows: TermRemarkRow[];
}

/**
 * §22 `PUT /grading/classes/:classId/remarks` (class teacher or staff). 409
 * while the class's term results are `submitted` or `published`. ASSUMED: it
 * answers the §22 GET shape.
 */
export interface SaveRemarksBody {
  termId?: string;
  remarks: { studentId: string; classTeacherRemark: string }[];
}

/** §23: where a class's submitted results stand. */
export type TermResultStatus = "submitted" | "returned" | "published";

/**
 * §23: one submission of a class's term results, unique on class, term and
 * basis. ASSUMED: `submittedBy`, `returnedBy` and `publishedBy` are
 * `{ id, name }`, as `submittedBy` is on registers.
 */
export interface TermResultSubmission {
  id: string;
  classId: string;
  termId: string;
  /** `'total'` or an assessment id. */
  basis: BroadsheetBasisKey;
  status: TermResultStatus;
  submittedAt: string;
  submittedBy: { id: string; name: string } | null;
  returnedAt?: string | null;
  returnedBy?: { id: string; name: string } | null;
  returnReason?: string | null;
  publishedAt?: string | null;
  publishedBy?: { id: string; name: string } | null;
}

/**
 * §23 `POST /grading/classes/:classId/term-results` (class teacher or staff).
 * 409 `{ waitingOn }` unless the §21 broadsheet is `ready`. Responds with the
 * submission.
 */
export interface SubmitTermResultsBody {
  termId?: string;
  basis: BroadsheetBasisKey;
}
