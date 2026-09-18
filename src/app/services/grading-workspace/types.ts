/**
 * The grading API contract, field for field.
 *
 * Every shape here mirrors a DTO or a service return in
 * `talimBE-V2/src/modules/academic` — the controller is
 * `controllers/gradeRecord.controller.ts`, the bodies are
 * `data/dtos/gradeRecord.dto.ts` and `data/dtos/grading-workspace.dto.ts`.
 *
 * The API runs `whitelist + forbidNonWhitelisted`: a payload carrying one
 * field the DTO does not declare is a 400. The `*Payload` types below are
 * therefore exact — never spread an extra field into one.
 */

/**
 * An id as the API returns it: a plain string, or the populated document it
 * points at. Mongoose populates references inconsistently across these
 * endpoints, so every id is read through `resolveId`.
 */
export type IdRef = string | { _id?: string; id?: string } | null | undefined;

/** A term of the school's academic year. */
export interface Term {
  _id: string;
  name: string;
  isActive?: boolean;
  academicYearName?: string;
  startDate?: string;
  endDate?: string;
}

/** An assessment students are graded against. */
export interface Assessment {
  _id: string;
  /** Newer records use `name`; older ones `title`. Read both. */
  name?: string;
  title?: string;
  status?: string;
  maxScore?: number;
  termId?: IdRef;
}

/** A course the signed-in teacher teaches, as the teacher record returns it. */
export interface TeacherCourse {
  _id: string;
  title?: string;
  className?: string;
  classId?: IdRef | { _id?: string; name?: string };
}

/** A class the signed-in teacher is the class teacher of. */
export interface TeacherClass {
  _id: string;
  name?: string;
}

/** A student on a class roster. */
export interface RosterStudent {
  _id: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  studentId?: string;
  userId?: {
    name?: string;
    firstName?: string;
    lastName?: string;
    profile?: { firstName?: string; lastName?: string };
  };
}

/** One saved assessment score. */
export interface AssessmentGradeRecord {
  _id: string;
  studentId: IdRef;
  courseId: IdRef;
  assessmentId: IdRef;
  classId?: IdRef;
  actualScore: number;
  maxScore: number;
  percentage?: number;
  createdAt?: string;
  updatedAt?: string;
}

/** How far grading has got for one assessment, as the API computes it. */
export interface GradingStatus {
  gradedCount: number;
  totalStudents: number;
  completionPercentage: number;
  isFullyGraded: boolean;
  ungradedStudents: Array<{ studentId: string; studentName: string }>;
}

/** `GET /grade-records/assessment/:assessmentId/course/:courseId`. */
export interface AssessmentGradesPage {
  data: AssessmentGradeRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  gradingStatus?: GradingStatus;
}

/** A page of any paginated grade endpoint (`PaginatedResponseDto`). */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** One row of `SaveAssessmentScoresDto.scores` (`AssessmentScoreDto`). */
export interface AssessmentScorePayload {
  studentId: string;
  score: number;
  maxScore?: number;
}

/**
 * Body of `POST /grade-records/grading/assessments/:assessmentId/scores` and
 * of `…/scores/batch-upload` — the same `SaveAssessmentScoresDto`. `classId`
 * is accepted but ignored by the server (it uses the course's class), so it
 * is deliberately not sent.
 */
export interface SaveAssessmentScoresPayload {
  courseId: string;
  scores: AssessmentScorePayload[];
}

/** Body of `PUT /grade-records/:id` (`UpdateAssessmentGradeRecordDto`). */
export interface UpdateAssessmentScorePayload {
  actualScore?: number;
  maxScore?: number;
  isActive?: boolean;
}

/** `GET /grade-records/grading/batch-upload/capability`. */
export interface BatchUploadCapability {
  supported: boolean;
  acceptedFormats: string[];
  endpoint: string;
  note?: string;
}

/** One student whose score could not be written, with the server's reason. */
export interface ScoreFailure {
  studentId: string;
  studentName?: string;
  reason: string;
}

/** What a save (manual or batch) actually achieved. */
export interface SaveScoresResult {
  saved: number;
  failures: ScoreFailure[];
}

/** `GET /grade-records/grading/classes/:classId/summary`. */
export interface ClassGradingSummary {
  classId: string;
  termId: string;
  academicYearId?: string;
  studentsCount: number;
  assessmentsCompleted: number;
  assessmentsTotal: number;
  studentsFullyGraded: number;
  studentsTotal: number;
  needsAttention: number;
  classAverage: number;
  lastGenerated: { date: string; status: string } | null;
}

/** A class summary plus the publication state the summary endpoint omits. */
export interface ClassGradingSummaryView extends ClassGradingSummary {
  /** True once a class cumulative record exists for the term. */
  classGradeGenerated: boolean;
  /** True once that record has been published to students and parents. */
  classGradePublished: boolean;
}

/** One row of `GET /grade-records/grading/classes/:classId/students-performance`. */
export interface StudentPerformance {
  studentId: string;
  studentName: string;
  averageScore: number;
  gradePreview: string | null;
  position: number | null;
  status: string;
}

/** One row of `GET /grade-records/grading/classes/:classId/assessment-overview`. */
export interface AssessmentOverviewRow {
  courseId: string;
  courseName: string;
  teacherName: string;
  requiredAssessments: number;
  completedAssessments: number;
  missingGrades: number;
  status: string;
}

/** The outcome of a class-summary generation run, as the server records it. */
export interface GenerationRun {
  runId: string;
  status: "completed" | "partial_failed" | "failed";
  successful: number;
  failed: number;
  skipped: number;
  errors: Array<{ studentId?: string; studentName?: string; reason: string }>;
}

/** One row of `GET /grade-records/grading/classes/:classId/generation-history`. */
export interface GenerationHistoryRow {
  runId: string;
  generatedBy: string;
  date: string;
  successful: number;
  failed: number;
  skipped: number;
  status: string;
}

/** Body of `POST /grading/classes/:classId/generate-summary`. */
export interface GenerateClassSummaryPayload {
  termId: string;
  academicYearId?: string;
}

/** Body of `POST /grading/classes/:classId/generate-summary/retry`. */
export interface RetryClassSummaryPayload {
  runId: string;
  studentIds: string[];
}

/** The KPI block a publication carries. */
export interface PublicationKpis {
  gradedCount: number;
  totalStudents: number;
  classAverage: number;
  highestScore: number;
  lowestScore: number;
  passRate: number;
}

/** `GET /grade-records/grading/assessments/:a/course/:c/publication-status`. */
export interface PublicationStatus {
  published: boolean;
  publishedAt?: string;
  kpis?: PublicationKpis;
}

/** `POST /grade-records/assessment/:a/course/:c/publish`. */
export interface PublishAssessmentResult {
  message?: string;
  kpis?: PublicationKpis;
}

/** One row of `GET /grade-records/grading/students/:id/assessment-history`. */
export interface StudentAssessmentHistoryRow {
  assessmentGradeRecordId: string;
  assessmentId: string;
  assessmentName: string;
  actualScore: number | null;
  maxScore: number | null;
  percentage: number | null;
  updatedAt?: string;
}

/** A course reference as `CourseGradeRecord.courseId` may be populated. */
export interface PopulatedCourseRef {
  _id?: string;
  id?: string;
  title?: string;
  courseName?: string;
}

/** A student's grade for one course in one term. */
export interface CourseGradeRecord {
  _id: string;
  courseId: string | PopulatedCourseRef | null | undefined;
  studentId: IdRef;
  termId?: IdRef;
  gradeLevel?: string;
  cumulativeScore: number;
  maxScore: number;
  percentage: number;
  updatedAt?: string;
}

/** A student's cumulative result across every course of a term. */
export interface StudentCumulativeRecord {
  _id: string;
  studentId: IdRef;
  classId?: IdRef;
  termId?: IdRef;
  totalScore?: number;
  percentage: number;
  grade?: string;
  position?: number;
  updatedAt?: string;
}

/** A class's cumulative result for a term. */
export interface ClassCumulativeRecord {
  _id: string;
  classId: IdRef;
  termId?: IdRef;
  classAverage: number;
  totalStudents?: number;
  isPublished?: boolean;
  updatedAt?: string;
}

/** A plain `{ message }` acknowledgement (`ResponseMessageDto`). */
export interface MessageResponse {
  message: string;
}
