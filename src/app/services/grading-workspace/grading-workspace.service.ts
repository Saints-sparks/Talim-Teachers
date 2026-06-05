import { fetchTeacherDetails } from "@/app/services/api.service";
import { gradeRecordsApi } from "@/app/services/grade-records.service";
import { apiClient } from "@/app/lib/api/apiClient";
import { API_BASE_URL } from "@/app/lib/api/config";
import { GradeRow, GenerationResult, RowStatus } from "@/components/grading/workspace/types";

const resolveId = (val: any): string => {
  if (!val) return "";
  if (typeof val === "string") return val;
  return val._id?.toString?.() || val.id?.toString?.() || val.studentId?.toString?.() || "";
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

const toStudentEntity = (record: any): any => {
  if (!record) return null;
  if (record.studentId && typeof record.studentId === "object") {
    return {
      ...record.studentId,
      _id: resolveId(record.studentId) || resolveId(record._id) || resolveId(record.studentId),
    };
  }
  if (record.student && typeof record.student === "object") {
    return {
      ...record.student,
      _id: resolveId(record.student) || resolveId(record._id),
    };
  }
  return {
    ...record,
    _id: resolveId(record),
  };
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
    return normalizeStudents(data).map(toStudentEntity).filter((s: any) => !!resolveId(s));
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

  async publishAssessmentGrades(params: {
    assessmentId: string;
    courseId: string;
    termId: string;
    token: string;
  }) {
    return gradeRecordsApi.publishAssessmentGrades(
      params.assessmentId,
      params.courseId,
      params.termId,
      params.token,
    );
  },

  async saveAssessmentScores(params: {
    assessmentId: string;
    courseId: string;
    classId: string;
    token: string;
    rows: Array<{ studentId: string; score: number; maxScore: number }>;
  }) {
    const payload = params.rows.map((row) => ({
      courseId: params.courseId,
      classId: params.classId,
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
      const rec = map.get(resolveId(s));
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

  async getPublicationStatus(params: {
    assessmentId: string;
    courseId: string;
    termId: string;
    token: string;
  }) {
    return gradeRecordsApi.getPublicationStatus(
      params.assessmentId,
      params.courseId,
      params.termId,
      params.token,
    );
  },

  async retryFailedStudents(classId: string, runId: string, studentIds: string[], token: string): Promise<GenerationResult> {
    try {
      const response = await apiClient.post(
        `${API_BASE_URL}/grade-records/grading/classes/${classId}/generate-summary/retry`,
        { runId, studentIds },
        { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } },
      );
      return response?.data || { status: "failed", successful: 0, failed: studentIds.length, skipped: 0, errors: [] };
    } catch (error: any) {
      return {
        status: "failed",
        successful: 0,
        failed: studentIds.length,
        skipped: 0,
        errors: studentIds.map((id) => ({ studentId: id, reason: error?.message || "Retry failed" })),
      };
    }
  },

  async getGenerationHistory(classId: string, token: string, termId?: string) {
    try {
      // Using the gradeRecordsApi pattern but direct fetch for this workspace endpoint
      const { apiClient } = await import("@/app/lib/api/apiClient");
      const { API_BASE_URL } = await import("@/app/lib/api/config");
      const response = await apiClient.get(
        `${API_BASE_URL}/grade-records/grading/classes/${classId}/generation-history`,
        {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          params: termId ? { termId } : {},
        },
      );
      return response.data?.data || response.data || [];
    } catch {
      return [];
    }
  },

  async getStudentAssessmentHistory(studentId: string, courseId: string, termId: string, token: string) {
    try {
      const { apiClient } = await import("@/app/lib/api/apiClient");
      const { API_BASE_URL } = await import("@/app/lib/api/config");
      const response = await apiClient.get(
        `${API_BASE_URL}/grade-records/grading/students/${studentId}/assessment-history`,
        {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          params: { courseId, termId },
        },
      );
      return response.data?.data || response.data || [];
    } catch {
      return [];
    }
  },

  async loadAllPublicationStatuses(
    assessments: any[],
    courseId: string,
    termId: string,
    token: string,
  ): Promise<Record<string, boolean>> {
    if (!assessments.length || !courseId || !termId) return {};
    const results = await Promise.allSettled(
      assessments.map((a) =>
        gradeRecordsApi.getPublicationStatus(
          resolveId(a._id),
          courseId,
          termId,
          token,
        ),
      ),
    );
    const map: Record<string, boolean> = {};
    assessments.forEach((a, i) => {
      const r = results[i];
      map[resolveId(a._id)] = r.status === "fulfilled" ? !!(r.value as any)?.published : false;
    });
    return map;
  },

  async generateStudentTermGrade(
    studentId: string,
    termId: string,
    token: string,
  ): Promise<{ message: string }> {
    const response = await apiClient.post(
      `${API_BASE_URL}/grade-records/student-cumulative-term-grade-records/calculate/${studentId}/${termId}`,
      {},
      { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } },
    );
    return response.data;
  },

  async getStudentCourseGrades(
    studentId: string,
    termId: string,
    token: string,
  ): Promise<any[]> {
    try {
      const response = await apiClient.get(
        `${API_BASE_URL}/grade-records/course-grade-records/student/${studentId}/term/${termId}`,
        { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } },
      );
      const raw = response.data?.data || response.data || [];
      return Array.isArray(raw) ? raw : [];
    } catch {
      return [];
    }
  },

  async getStudentTermGrade(
    studentId: string,
    termId: string,
    token: string,
  ): Promise<any | null> {
    try {
      const response = await apiClient.get(
        `${API_BASE_URL}/grade-records/student-cumulative-term-grade-records/${studentId}/${termId}`,
        { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } },
      );
      return response.data?.data || response.data || null;
    } catch {
      return null;
    }
  },

  async getClassCourseList(
    classId: string,
    termId: string,
    token: string,
  ): Promise<any[]> {
    try {
      const response = await apiClient.get(
        `${API_BASE_URL}/grade-records/grading/classes/${classId}/assessment-overview`,
        {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          params: { termId },
        },
      );
      const raw = response.data?.data || response.data || [];
      return Array.isArray(raw) ? raw : [];
    } catch {
      return [];
    }
  },

  async exportPlaceholder() {
    return true;
  },

  async batchUploadSupported() {
    // BACKEND CONFIRMATION NEEDED: batch upload endpoint capability for grading workspace
    return false;
  },
};
