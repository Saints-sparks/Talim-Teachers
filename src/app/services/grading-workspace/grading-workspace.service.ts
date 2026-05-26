import { fetchTeacherDetails } from "@/app/services/api.service";
import { gradeRecordsApi } from "@/app/services/grade-records.service";
import { GradeRow, GenerationResult, RowStatus } from "@/components/grading/workspace/types";

const resolveId = (val: any): string => {
  if (!val) return "";
  if (typeof val === "string") return val;
  return val._id?.toString?.() || "";
};

const resolveStudentName = (student: any): string => {
  if (!student) return "Unknown Student";
  if (student.name && String(student.name).trim()) return String(student.name).trim();
  if (student.userId?.name && String(student.userId.name).trim()) {
    return String(student.userId.name).trim();
  }

  const first =
    student.firstName ||
    student.userId?.firstName ||
    student.userId?.profile?.firstName ||
    "";
  const last =
    student.lastName ||
    student.userId?.lastName ||
    student.userId?.profile?.lastName ||
    "";

  const full = `${first} ${last}`.trim();
  return full || "Unknown Student";
};

const normalizeStudents = (payload: any): any[] => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.students)) return payload.students;
  if (Array.isArray(payload?.data?.students)) return payload.data.students;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  return [];
};

const toRowStatus = (status?: string, generated?: boolean): RowStatus => {
  if (generated) return "generated";
  switch ((status || "").toLowerCase()) {
    case "graded":
    case "completed":
      return "graded";
    case "ready_to_generate":
      return "ready_to_generate";
    case "failed":
      return "failed";
    case "skipped":
      return "skipped";
    case "needs_review":
      return "needs_review";
    case "in_progress":
      return "needs_review";
    default:
      return "not_graded";
  }
};

export const gradingWorkspaceService = {
  async getAssignedCoursesAndClasses(userId: string, token: string) {
    const teacherData = await fetchTeacherDetails(userId, token);
    return {
      courses: teacherData?.assignedCourses || teacherData?.classTeacherCourses || [],
      classes: teacherData?.classTeacherClasses || teacherData?.assignedClasses || [],
    };
  },

  async getTerms(token: string) {
    const terms = await gradeRecordsApi.getTerms(token);
    return Array.isArray(terms) ? terms : [];
  },

  async getAssessmentsForScope(termId: string, token: string) {
    const data = await gradeRecordsApi.getAssessmentsForTerm(termId, token);
    return Array.isArray(data) ? data : [];
  },

  async getCourseStudents(classId: string, token: string) {
    const resolvedClassId = resolveId(classId);
    if (!resolvedClassId) return [];
    const data = await gradeRecordsApi.getStudentsForCourse(resolvedClassId, token);
    return normalizeStudents(data);
  },

  async getAssessmentGradeRows(params: {
    assessmentId: string;
    courseId: string;
    classId: string;
    token: string;
    termId?: string;
    defaultMaxScore?: number;
  }): Promise<GradeRow[]> {
    const [students, gradesPayload, courseGrades] = await Promise.all([
      this.getCourseStudents(params.classId, params.token),
      gradeRecordsApi.getAssessmentGrades(params.assessmentId, params.token, params.courseId),
      params.termId ? gradeRecordsApi.getCourseGrades(params.courseId, params.termId, params.token).catch(() => []) : Promise.resolve([]),
    ]);

    const grades = gradesPayload.grades || [];
    return students.map((student: any) => {
      const grade = grades.find((g: any) => {
        const sid = resolveId(g.studentId);
        return sid === resolveId(student._id);
      });
      const generated = Array.isArray(courseGrades)
        ? courseGrades.some((cg: any) => {
            const sid = resolveId(cg.studentId);
            return sid === resolveId(student._id);
          })
        : false;

      return {
        studentId: resolveId(student._id),
        studentName: resolveStudentName(student),
        score: grade?.actualScore ?? null,
        maxScore: grade?.maxScore ?? params.defaultMaxScore ?? 20,
        status: toRowStatus(grade ? "graded" : "not_graded", generated),
        lastUpdated: grade?.updatedAt
          ? new Date(grade.updatedAt).toISOString()
          : undefined,
        generated,
      };
    });
  },

  async saveAssessmentScores(params: {
    assessmentId: string;
    courseId: string;
    classId: string;
    schoolId: string;
    token: string;
    rows: Array<{ studentId: string; score: number; maxScore: number }>;
  }) {
    const payload = params.rows.map((row) => ({
      courseId: params.courseId,
      classId: params.classId,
      schoolId: params.schoolId,
      studentId: row.studentId,
      assessmentId: params.assessmentId,
      actualScore: row.score,
      maxScore: row.maxScore,
    }));

    return gradeRecordsApi.bulkCreateAssessmentGrades(payload, params.token);
  },

  async generateCourseGrades(params: {
    courseId: string;
    classId: string;
    termId: string;
    token: string;
    studentIds: string[];
  }) {
    return gradeRecordsApi.bulkCreateCourseGradeRecords(
      {
        courseId: params.courseId,
        classId: params.classId,
        termId: params.termId,
        studentIds: params.studentIds,
      },
      params.token,
    );
  },

  async getClassSummary(classId: string, termId: string, token: string) {
    const [students, classCumulative] = await Promise.all([
      this.getCourseStudents(classId, token),
      gradeRecordsApi.getClassCumulative(classId, termId, token),
    ]);

    const totalStudents = students.length;
    const graded = classCumulative?.studentCumulativeTermGradeRecords?.length || 0;
    const needsAttention =
      classCumulative?.studentCumulativeTermGradeRecords?.filter((r: any) => (r.percentage || 0) < 60).length || 0;

    return {
      studentsCount: totalStudents,
      assessmentsCompleted: 0,
      assessmentsTotal: 0,
      studentsFullyGraded: graded,
      studentsTotal: totalStudents,
      needsAttention,
      classAverage: classCumulative?.classAverage || 0,
      lastGenerated: classCumulative?.updatedAt ? { date: classCumulative.updatedAt, status: "success" } : null,
    };
  },

  async getStudentsPerformance(classId: string, termId: string, token: string): Promise<GradeRow[]> {
    const [students, cumulative] = await Promise.all([
      this.getCourseStudents(classId, token),
      gradeRecordsApi.getClassCumulative(classId, termId, token),
    ]);

    const map = new Map<string, any>();
    (cumulative?.studentCumulativeTermGradeRecords || []).forEach((rec: any) => {
      const sid = resolveId(rec.studentId);
      if (sid) map.set(sid, rec);
    });

    return students.map((s: any) => {
      const rec = map.get(s._id);
      const pct = rec?.percentage ?? null;
      return {
        studentId: resolveId(s._id),
        studentName: resolveStudentName(s),
        score: pct,
        maxScore: 100,
        gradePreview: rec?.grade,
        position: rec?.position,
        status: rec ? (pct < 60 ? "needs_review" : "ready_to_generate") : "not_graded",
        lastUpdated: rec?.updatedAt
          ? new Date(rec.updatedAt).toISOString()
          : undefined,
      } as GradeRow;
    });
  },

  async getAssessmentOverview(classId: string, termId: string, token: string) {
    // BACKEND CONFIRMATION NEEDED: /grading/classes/:classId/assessment-overview?termId=
    // Fallback summary from currently available term assessments
    const assessments = await this.getAssessmentsForScope(termId, token);
    return [
      {
        courseName: "Available Courses",
        teacherName: "—",
        requiredAssessments: assessments.length,
        completedAssessments: assessments.filter((a: any) => (a.status || "").toLowerCase() === "completed").length,
        missingGrades: 0,
        status: "incomplete",
      },
    ];
  },

  async generateClassSummary(classId: string, termId: string, token: string): Promise<GenerationResult> {
    try {
      await gradeRecordsApi.autoCalculateClassCumulative(classId, termId, token);
      return { status: "completed", successful: 1, failed: 0, skipped: 0, errors: [] };
    } catch (error: any) {
      return {
        status: "failed",
        successful: 0,
        failed: 1,
        skipped: 0,
        errors: [{ studentId: "", reason: error?.message || "Generation failed" }],
      };
    }
  },

  async retryFailedStudents(_classId: string, _runId: string, _studentIds: string[], _token: string): Promise<GenerationResult> {
    // BACKEND CONFIRMATION NEEDED: /grading/classes/:classId/generate-summary/retry
    return {
      status: "partial_failed",
      successful: 0,
      failed: _studentIds.length,
      skipped: 0,
      errors: _studentIds.map((id) => ({ studentId: id, reason: "Retry endpoint not yet mapped" })),
    };
  },

  async getGenerationHistory(_classId: string, _token: string) {
    // BACKEND CONFIRMATION NEEDED: /grading/classes/:classId/generation-history?termId=
    return [] as Array<{ runId: string; date: string; generatedBy: string; successful: number; failed: number; skipped: number; status: string }>;
  },

  async getStudentAssessmentHistory(studentId: string, courseId: string, termId: string, token: string) {
    // BACKEND CONFIRMATION NEEDED: /grading/students/:studentId/assessment-history?courseId=&termId=
    const grades = await gradeRecordsApi.getStudentTermGrades(studentId, termId, token);
    return grades.filter((g) => {
      const cId = typeof g.courseId === "object" ? (g.courseId as any)._id : g.courseId;
      return cId === courseId;
    });
  },

  async exportPlaceholder() {
    return true;
  },

  async batchUploadSupported() {
    // BACKEND CONFIRMATION NEEDED: batch upload endpoint capability for grading workspace
    return false;
  },
};
