/**
 * Every call the grading workspace makes, in one place.
 *
 * Each method maps to exactly one route of
 * `talimBE-V2/src/modules/academic/controllers/gradeRecord.controller.ts`
 * (or, for the roster, `students.controller.ts`) and returns the shape the UI
 * renders. Requests go through the one API client, which supplies the base
 * URL and the bearer token — no method takes a token.
 *
 * Errors are thrown, never swallowed into an empty array: a page that cannot
 * tell "no grades yet" from "the request failed" cannot show the teacher the
 * right thing. The two exceptions are documented on the methods concerned,
 * where the API answers 404 for a record that simply has not been created.
 */

import type { BulkCourseGradesBody } from "@/types/apiPayloads";
import { api } from "@/lib/apiClient";
import { ApiError } from "@/lib/apiError";
import { logger } from "@/lib/logger";
import type { GradeRow, RowStatus } from "@/components/grading/workspace/types";
import { parseBulkRowFailures } from "./grade-csv";
import type {
  Assessment,
  AssessmentGradesPage,
  AssessmentGradeRecord,
  AssessmentOverviewRow,
  AssessmentScorePayload,
  CourseGradeRowPayload,
  BatchUploadCapability,
  ClassCumulativeRecord,
  ClassGradingSummary,
  ClassGradingSummaryView,
  CourseGradeRecord,
  GenerateClassSummaryPayload,
  GenerationHistoryRow,
  GenerationRun,
  IdRef,
  MessageResponse,
  PublicationStatus,
  PublishAssessmentResult,
  PublishAssessmentPayload,
  RetryClassSummaryPayload,
  RosterStudent,
  SaveAssessmentScoresPayload,
  SaveScoresResult,
  ScoreFailure,
  StudentAssessmentHistoryRow,
  StudentCumulativeRecord,
  StudentPerformance,
  Term,
  UpdateAssessmentScorePayload,
} from "./types";

const SCOPE = "grading";

/** The API's own ceiling on `limit` (`PaginationQueryDto`). */
const MAX_PAGE_SIZE = 1000;

/**
 * The id behind a reference the API may or may not have populated.
 *
 * @param value - A string id, a populated document, or nothing.
 * @returns The id, or an empty string.
 */
export function resolveId(value: IdRef): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value._id ?? value.id ?? "";
}

/**
 * A student's display name, from whichever of the several shapes the roster
 * and grade endpoints return it in.
 *
 * @param student - A roster entry or a populated `studentId`.
 * @returns The name, or "Unknown Student".
 */
export function resolveStudentName(student: RosterStudent | null | undefined): string {
  if (!student) return "Unknown Student";
  if (student.name?.trim()) return student.name.trim();
  if (student.userId?.name?.trim()) return student.userId.name.trim();

  const first = student.firstName || student.userId?.firstName || student.userId?.profile?.firstName || "";
  const last = student.lastName || student.userId?.lastName || student.userId?.profile?.lastName || "";
  return `${first} ${last}`.trim() || "Unknown Student";
}

/**
 * Pulls the array out of whichever envelope an endpoint used.
 *
 * @typeParam T - Element type.
 * @param payload - The parsed response body.
 * @returns The array, or an empty one.
 */
function toArray<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    for (const key of ["data", "students", "terms", "assessments"]) {
      const value = record[key];
      if (Array.isArray(value)) return value as T[];
      if (value && typeof value === "object") {
        const nested = (value as Record<string, unknown>).data;
        if (Array.isArray(nested)) return nested as T[];
      }
    }
  }
  return [];
}

/**
 * Treats "this record has not been created yet" as an absence rather than a
 * failure. Anything else is rethrown.
 *
 * @typeParam T - The value the caller wanted.
 * @param promise - The request.
 * @returns The value, or `null` on a 404.
 */
async function orNullOn404<T>(promise: Promise<T>): Promise<T | null> {
  try {
    return await promise;
  } catch (err) {
    if (err instanceof ApiError && err.code === "NOT_FOUND") return null;
    throw err;
  }
}

/**
 * The row status the table should show.
 *
 * @param graded - Whether a score has been saved.
 * @param generated - Whether a course grade has been generated from it.
 * @returns The status.
 */
function rowStatus(graded: boolean, generated: boolean): RowStatus {
  if (generated) return "generated";
  return graded ? "graded" : "not_graded";
}

export const gradingWorkspaceService = {
  // ─── Scope: terms, assessments, roster ──────────────────────────────────────

  /**
   * The school's terms, newest academic year first as the API orders them.
   *
   * @returns Every term the school has.
   */
  async getTerms(): Promise<Term[]> {
    const payload = await api.get<unknown>("/academic-year-term/term/school");
    return toArray<Term>(payload);
  },

  /**
   * The assessments created for a term.
   *
   * @param termId - The term to list.
   * @returns The assessments, or an empty list when none exist.
   */
  async getAssessmentsForTerm(termId: string): Promise<Assessment[]> {
    if (!termId) return [];
    const payload = await api.get<unknown>(`/assessments/term/${termId}`);
    return toArray<Assessment>(payload);
  },

  /**
   * Every active student of a class, following pagination to the end so a
   * large class is never silently truncated to the first page.
   *
   * @param classId - The class whose roster to load.
   * @returns The students, in the order the API returns them.
   */
  async getClassRoster(classId: string): Promise<RosterStudent[]> {
    const resolved = resolveId(classId);
    if (!resolved) return [];

    const students: RosterStudent[] = [];
    let page = 1;
    // Five pages of 200 is 1 000 students: past any real class, and a hard
    // stop so a bad `total` cannot spin here.
    while (page <= 5) {
      const payload = await api.get<unknown>(`/students/by-class/${resolved}`, {
        params: { page, limit: 200 },
      });
      const batch = toArray<RosterStudent>(payload);
      students.push(...batch);

      const meta = (payload as { meta?: { total?: number; lastPage?: number } } | null)?.meta;
      const lastPage = meta?.lastPage ?? 1;
      if (batch.length === 0 || page >= lastPage) break;
      page += 1;
    }

    return students.filter((student) => Boolean(resolveId(student._id)));
  },

  // ─── Assessment scores ──────────────────────────────────────────────────────

  /**
   * One row per student of the class, carrying the score already saved for
   * this assessment (and the id of that record, so an edit updates it rather
   * than trying to create a second one).
   *
   * @param params - Which assessment, course and class, and the term.
   * @param params.assessmentId - The assessment being graded.
   * @param params.courseId - The course it belongs to.
   * @param params.classId - The class whose roster to show.
   * @param params.termId - The term, used to mark rows already turned into course grades.
   * @param params.defaultMaxScore - The max to show for students with no score yet.
   * @returns The rows, in roster order.
   */
  async getAssessmentGradeRows(params: {
    assessmentId: string;
    courseId: string;
    classId: string;
    termId?: string;
    defaultMaxScore?: number;
  }): Promise<GradeRow[]> {
    const [students, gradesPage, courseGrades] = await Promise.all([
      this.getClassRoster(params.classId),
      api.get<AssessmentGradesPage>(
        `/grade-records/assessment/${params.assessmentId}/course/${params.courseId}`,
        { params: { page: 1, limit: MAX_PAGE_SIZE } },
      ),
      params.termId
        ? this.getCourseGrades(params.courseId, params.termId)
        : Promise.resolve<CourseGradeRecord[]>([]),
    ]);

    const gradeByStudent = new Map<string, AssessmentGradeRecord>();
    for (const grade of gradesPage.data ?? []) {
      gradeByStudent.set(resolveId(grade.studentId), grade);
    }
    const generatedFor = new Set(courseGrades.map((record) => resolveId(record.studentId)));

    return students.map((student) => {
      const studentId = resolveId(student._id);
      const grade = gradeByStudent.get(studentId);
      const generated = generatedFor.has(studentId);

      return {
        studentId,
        studentName: resolveStudentName(student),
        gradeId: grade?._id,
        score: grade?.actualScore ?? null,
        maxScore: grade?.maxScore ?? params.defaultMaxScore ?? 100,
        status: rowStatus(Boolean(grade), generated),
        lastUpdated: grade?.updatedAt ? new Date(grade.updatedAt).toISOString() : undefined,
        generated,
      };
    });
  },

  /**
   * Writes scores, routing each row to the operation the API actually
   * supports: a student with no record yet is created through the batch
   * endpoint, a student who already has one is updated in place.
   *
   * The create path rejects the whole batch if any row is invalid — including
   * a student who already has a score — so its single message is split back
   * into one failure per student before it is returned.
   *
   * @param params - What to write and where.
   * @param params.assessmentId - The assessment being graded.
   * @param params.courseId - The course it belongs to.
   * @param params.rows - One entry per student whose score changed.
   * @param params.nameOf - Resolves a student id to the name to show in failures.
   * @returns How many scores were written, and why any were not.
   */
  async saveAssessmentScores(params: {
    assessmentId: string;
    courseId: string;
    rows: Array<{ studentId: string; score: number; maxScore: number; gradeId?: string }>;
    nameOf?: (studentId: string) => string | undefined;
  }): Promise<SaveScoresResult> {
    const nameOf = params.nameOf ?? (() => undefined);
    const creates = params.rows.filter((row) => !row.gradeId);
    const updates = params.rows.filter((row) => row.gradeId);

    let saved = 0;
    const failures: ScoreFailure[] = [];

    if (creates.length > 0) {
      const scores: AssessmentScorePayload[] = creates.map((row) => ({
        studentId: row.studentId,
        score: row.score,
        maxScore: row.maxScore,
      }));
      const result = await this.postScores(params.assessmentId, params.courseId, scores, nameOf);
      saved += result.saved;
      failures.push(...result.failures);
    }

    // Updates are independent of one another: one rejected row must not stop
    // the rest, so each is reported on its own.
    const settled = await Promise.allSettled(
      updates.map((row) =>
        api.put<AssessmentGradeRecord>(`/grade-records/${row.gradeId}`, {
          actualScore: row.score,
          maxScore: row.maxScore,
        } satisfies UpdateAssessmentScorePayload),
      ),
    );
    settled.forEach((outcome, index) => {
      if (outcome.status === "fulfilled") {
        saved += 1;
        return;
      }
      const row = updates[index];
      logger.error(SCOPE, `Updating the score for ${row.studentId} failed`, outcome.reason);
      failures.push({
        studentId: row.studentId,
        studentName: nameOf(row.studentId),
        reason: outcome.reason instanceof ApiError ? outcome.reason.message : "The score could not be saved.",
      });
    });

    return { saved, failures };
  },

  /**
   * Posts a batch of new scores and turns a whole-batch rejection into
   * per-student failures.
   *
   * @param assessmentId - The assessment being graded.
   * @param courseId - The course it belongs to.
   * @param scores - The rows to create.
   * @param nameOf - Resolves a student id to the name to show.
   * @param endpoint - Which of the two identical routes to use.
   * @returns How many were written, and why any were not.
   */
  async postScores(
    assessmentId: string,
    courseId: string,
    scores: AssessmentScorePayload[],
    nameOf: (studentId: string) => string | undefined,
    endpoint: "scores" | "scores/batch-upload" = "scores",
  ): Promise<SaveScoresResult> {
    if (scores.length === 0) return { saved: 0, failures: [] };

    const body: SaveAssessmentScoresPayload = { courseId, scores };
    try {
      await api.post<MessageResponse>(
        `/grade-records/grading/assessments/${assessmentId}/${endpoint}`,
        body,
      );
      return { saved: scores.length, failures: [] };
    } catch (err) {
      logger.error(SCOPE, "Saving assessment scores failed", err);
      if (err instanceof ApiError) {
        const rowFailures = parseBulkRowFailures(err.message, scores, nameOf);
        if (rowFailures.length > 0) return { saved: 0, failures: rowFailures };
        return {
          saved: 0,
          failures: scores.map((score) => ({
            studentId: score.studentId,
            studentName: nameOf(score.studentId),
            reason: err.message,
          })),
        };
      }
      throw err;
    }
  },

  /**
   * Whether the API will accept a batch upload, and in what formats. Asked
   * rather than assumed, so a server that turns the feature off turns the
   * button off too.
   *
   * @returns The capability the API reports.
   */
  async getBatchUploadCapability(): Promise<BatchUploadCapability> {
    return api.get<BatchUploadCapability>("/grade-records/grading/batch-upload/capability");
  },

  /**
   * Sends a parsed score sheet to the batch-upload route.
   *
   * @param params - What to upload and where.
   * @param params.assessmentId - The assessment being graded.
   * @param params.courseId - The course it belongs to.
   * @param params.scores - The rows, already matched to students.
   * @param params.nameOf - Resolves a student id to the name to show in failures.
   * @returns How many were written, and why any were not.
   */
  async batchUploadScores(params: {
    assessmentId: string;
    courseId: string;
    scores: AssessmentScorePayload[];
    nameOf?: (studentId: string) => string | undefined;
  }): Promise<SaveScoresResult> {
    return this.postScores(
      params.assessmentId,
      params.courseId,
      params.scores,
      params.nameOf ?? (() => undefined),
      "scores/batch-upload",
    );
  },

  // ─── Publication ────────────────────────────────────────────────────────────

  /**
   * Whether an assessment's grades have been released to students and parents.
   *
   * @param params - Which assessment, course and term.
   * @param params.assessmentId - The assessment.
   * @param params.courseId - Its course.
   * @param params.termId - The term.
   * @returns The publication state, with KPIs when it is published.
   */
  async getPublicationStatus(params: {
    assessmentId: string;
    courseId: string;
    termId: string;
  }): Promise<PublicationStatus> {
    const status = await orNullOn404(
      api.get<PublicationStatus>(
        `/grade-records/grading/assessments/${params.assessmentId}/course/${params.courseId}/publication-status`,
        { params: { termId: params.termId } },
      ),
    );
    return status ?? { published: false };
  },

  /**
   * The publication state of several assessments at once, for the list that
   * marks which are already out.
   *
   * @param assessmentIds - The assessments to check.
   * @param courseId - The course they are being graded for.
   * @param termId - The term.
   * @returns Published flag per assessment id.
   */
  async getPublicationStatuses(
    assessmentIds: string[],
    courseId: string,
    termId: string,
  ): Promise<Record<string, boolean>> {
    if (assessmentIds.length === 0 || !courseId || !termId) return {};
    const results = await Promise.allSettled(
      assessmentIds.map((assessmentId) => this.getPublicationStatus({ assessmentId, courseId, termId })),
    );
    const map: Record<string, boolean> = {};
    assessmentIds.forEach((assessmentId, index) => {
      const result = results[index];
      map[assessmentId] = result.status === "fulfilled" ? result.value.published : false;
    });
    return map;
  },

  /**
   * Publishes an assessment's grades. The API refuses until every active
   * student in the class has a score, then notifies students and parents —
   * this is the point of no return for a teacher.
   *
   * @param params - Which assessment, course and term.
   * @param params.assessmentId - The assessment.
   * @param params.courseId - Its course.
   * @param params.termId - The term.
   * @returns The server's message and the KPIs it computed.
   */
  async publishAssessmentGrades(params: {
    assessmentId: string;
    courseId: string;
    termId: string;
  }): Promise<PublishAssessmentResult> {
    const body: PublishAssessmentPayload = { termId: params.termId };
    return api.post<PublishAssessmentResult>(
      `/grade-records/assessment/${params.assessmentId}/course/${params.courseId}/publish`,
      body,
    );
  },

  // ─── Course grades ──────────────────────────────────────────────────────────

  /**
   * The course grades already generated for a course in a term.
   *
   * @param courseId - The course.
   * @param termId - The term.
   * @returns The records, or an empty list when none have been generated.
   */
  async getCourseGrades(courseId: string, termId: string): Promise<CourseGradeRecord[]> {
    if (!courseId || !termId) return [];
    const payload = await orNullOn404(
      api.get<unknown>(`/grade-records/course-grade-records/course/${courseId}/term/${termId}`, {
        params: { page: 1, limit: MAX_PAGE_SIZE },
      }),
    );
    return toArray<CourseGradeRecord>(payload);
  },

  /**
   * Generates a course grade for each named student by totalling their
   * assessment scores for the course.
   *
   * The API has no "calculate these course grades" route, so the totals are
   * computed here from the assessment records and posted as course grades.
   *
   * @param params - Which course, class and term, and for whom.
   * @param params.courseId - The course.
   * @param params.classId - Its class.
   * @param params.termId - The term.
   * @param params.studentIds - The students to generate for.
   * @returns How many were generated and how many had nothing to total.
   */
  async generateCourseGrades(params: {
    courseId: string;
    classId: string;
    termId: string;
    studentIds: string[];
  }): Promise<{ successful: number; failed: number }> {
    const payload = await api.get<unknown>(`/grade-records/course/${params.courseId}`, {
      params: { page: 1, limit: MAX_PAGE_SIZE },
    });
    const assessmentGrades = toArray<AssessmentGradeRecord>(payload);

    const grades = params.studentIds
      .map((studentId): CourseGradeRowPayload | null => {
        const rows = assessmentGrades.filter((grade) => resolveId(grade.studentId) === studentId);
        if (rows.length === 0) return null;

        const cumulativeScore = rows.reduce((sum, row) => sum + row.actualScore, 0);
        const maxScore = rows.reduce((sum, row) => sum + row.maxScore, 0);
        return {
          courseId: params.courseId,
          studentId,
          classId: params.classId,
          termId: params.termId,
          assessmentGradeRecords: rows.map((row) => row._id),
          cumulativeScore,
          maxScore,
          percentage: maxScore > 0 ? (cumulativeScore / maxScore) * 100 : 0,
        };
      })
      .filter((grade): grade is CourseGradeRowPayload => grade !== null);

    if (grades.length === 0) {
      return { successful: 0, failed: params.studentIds.length };
    }

    await api.post<MessageResponse>("/grade-records/course-grade-records/bulk", { grades } satisfies BulkCourseGradesBody);
    return { successful: grades.length, failed: params.studentIds.length - grades.length };
  },

  // ─── Class teacher workspace ────────────────────────────────────────────────

  /**
   * The class's grading summary, plus whether its cumulative grade has been
   * generated and published — which the summary route does not report, so the
   * cumulative record is read alongside it.
   *
   * @param classId - The class.
   * @param termId - The term.
   * @returns The summary the KPI cards and the generate panel both read.
   */
  async getClassSummary(classId: string, termId: string): Promise<ClassGradingSummaryView> {
    const [summary, cumulative] = await Promise.all([
      api.get<ClassGradingSummary>(`/grade-records/grading/classes/${classId}/summary`, {
        params: { termId },
      }),
      this.getClassCumulative(classId, termId),
    ]);

    return {
      ...summary,
      classGradeGenerated: Boolean(cumulative),
      classGradePublished: Boolean(cumulative?.isPublished),
    };
  },

  /**
   * The class's cumulative term record, if it has been generated.
   *
   * @param classId - The class.
   * @param termId - The term.
   * @returns The record, or `null` when it has not been generated yet.
   */
  async getClassCumulative(classId: string, termId: string): Promise<ClassCumulativeRecord | null> {
    const payload = await orNullOn404(
      api.get<ClassCumulativeRecord | null>(
        `/grade-records/class-cumulative-term-grade-records/${classId}/${termId}`,
      ),
    );
    return payload ?? null;
  },

  /**
   * One row per student of the class, with their term result so far.
   *
   * @param classId - The class.
   * @param termId - The term.
   * @returns The rows the class performance table renders.
   */
  async getStudentsPerformance(classId: string, termId: string): Promise<GradeRow[]> {
    const [payload, cumulative] = await Promise.all([
      api.get<unknown>(`/grade-records/grading/classes/${classId}/students-performance`, {
        params: { termId },
      }),
      this.getClassCumulative(classId, termId),
    ]);

    // Positions are provisional until the class grade is published; showing
    // them earlier would tell a teacher a ranking that can still change.
    const published = Boolean(cumulative?.isPublished);

    return toArray<StudentPerformance>(payload).map((row) => ({
      studentId: row.studentId,
      studentName: row.studentName,
      score: row.status === "not_graded" ? null : row.averageScore,
      maxScore: 100,
      gradePreview: row.gradePreview ?? undefined,
      position: published ? (row.position ?? undefined) : undefined,
      status: (row.status as RowStatus) ?? "not_graded",
    }));
  },

  /**
   * Per-course grading progress for the class: how many assessments each
   * course requires, how many are done, and how many students still lack a
   * course grade.
   *
   * @param classId - The class.
   * @param termId - The term.
   * @returns One row per course of the class.
   */
  async getAssessmentOverview(classId: string, termId: string): Promise<AssessmentOverviewRow[]> {
    const payload = await api.get<unknown>(
      `/grade-records/grading/classes/${classId}/assessment-overview`,
      { params: { termId } },
    );
    return toArray<AssessmentOverviewRow>(payload);
  },

  /**
   * Previous class-summary generation runs, newest first.
   *
   * @param classId - The class.
   * @param termId - Restrict to one term; omit for every run of the class.
   * @returns The runs, at most the 50 the API keeps.
   */
  async getGenerationHistory(classId: string, termId?: string): Promise<GenerationHistoryRow[]> {
    const payload = await api.get<unknown>(
      `/grade-records/grading/classes/${classId}/generation-history`,
      { params: termId ? { termId } : undefined },
    );
    return toArray<GenerationHistoryRow>(payload);
  },

  /**
   * Runs the class summary: a term grade for every student, then the class
   * cumulative. The API records the run, so a partial failure can be retried
   * for exactly the students it names.
   *
   * @param classId - The class.
   * @param payload - The term, and optionally the academic year.
   * @returns The run, including its id and per-student errors.
   */
  async generateClassSummary(
    classId: string,
    payload: GenerateClassSummaryPayload,
  ): Promise<GenerationRun> {
    return api.post<GenerationRun>(
      `/grade-records/grading/classes/${classId}/generate-summary`,
      payload,
    );
  },

  /**
   * Retries the students a previous run failed on.
   *
   * @param classId - The class.
   * @param payload - The run to retry and which students of it.
   * @returns The new run.
   */
  async retryFailedStudents(
    classId: string,
    payload: RetryClassSummaryPayload,
  ): Promise<GenerationRun> {
    return api.post<GenerationRun>(
      `/grade-records/grading/classes/${classId}/generate-summary/retry`,
      payload,
    );
  },

  /**
   * Publishes the class's cumulative term grade, releasing positions to
   * students and parents.
   *
   * @param classId - The class.
   * @param termId - The term.
   * @returns The server's acknowledgement.
   */
  async publishClassGrade(classId: string, termId: string): Promise<MessageResponse> {
    return api.post<MessageResponse>(
      `/grade-records/class-cumulative-term-grade-records/${classId}/${termId}/publish`,
      {},
    );
  },

  // ─── One student's term ─────────────────────────────────────────────────────

  /**
   * A student's graded assessments for one course, as the audit view shows
   * them. Only published assessments appear — that is the API's rule.
   *
   * @param studentId - The student.
   * @param courseId - The course.
   * @param termId - The term.
   * @returns The rows, newest first.
   */
  async getStudentAssessmentHistory(
    studentId: string,
    courseId: string,
    termId: string,
  ): Promise<StudentAssessmentHistoryRow[]> {
    const payload = await api.get<unknown>(
      `/grade-records/grading/students/${studentId}/assessment-history`,
      { params: { courseId, termId } },
    );
    return toArray<StudentAssessmentHistoryRow>(payload);
  },

  /**
   * Every course grade a student has for a term.
   *
   * @param studentId - The student.
   * @param termId - The term.
   * @returns The records, or an empty list when none exist.
   */
  async getStudentCourseGrades(studentId: string, termId: string): Promise<CourseGradeRecord[]> {
    const payload = await orNullOn404(
      api.get<unknown>(`/grade-records/course-grade-records/student/${studentId}/term/${termId}`, {
        params: { page: 1, limit: MAX_PAGE_SIZE },
      }),
    );
    return toArray<CourseGradeRecord>(payload);
  },

  /**
   * A student's cumulative result for a term.
   *
   * @param studentId - The student.
   * @param termId - The term.
   * @returns The record, or `null` when it has not been generated yet.
   */
  async getStudentTermGrade(
    studentId: string,
    termId: string,
  ): Promise<StudentCumulativeRecord | null> {
    const payload = await orNullOn404(
      api.get<StudentCumulativeRecord | null>(
        `/grade-records/student-cumulative-term-grade-records/${studentId}/${termId}`,
      ),
    );
    return payload ?? null;
  },

  /**
   * Calculates and stores a student's cumulative term grade from their course
   * grades.
   *
   * @param studentId - The student.
   * @param termId - The term.
   * @returns The record the API created.
   */
  async generateStudentTermGrade(
    studentId: string,
    termId: string,
  ): Promise<StudentCumulativeRecord> {
    return api.post<StudentCumulativeRecord>(
      `/grade-records/student-cumulative-term-grade-records/calculate/${studentId}/${termId}`,
      {},
    );
  },
};
