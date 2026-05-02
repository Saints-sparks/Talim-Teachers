import { API_BASE_URL } from "../lib/api/config";
import { apiClient } from "../lib/api/apiClient";
import {
  AssessmentGradeRecord,
  CourseGradeRecord,
  StudentCumulativeTermGradeRecord,
  ClassCumulativeTermGradeRecord,
  CreateAssessmentGradeRecordDto,
  UpdateAssessmentGradeRecordDto,
  CreateCourseGradeRecordDto,
  GradeRecordsApiResponse,
  BulkGradeResult,
  AssessmentGradeRecordWithDetails,
  AssessmentGradesResponse,
  GradingStatus,
  CourseGradeRecordWithDetails,
  StudentCumulativeWithDetails,
} from "@/types/grade-records";

export class GradeRecordsApiService {
  private termsCache: any[] | null = null;
  /**
   * Get grader records for a student in a term
   * Protected endpoint: /grade-records/course-grade-records/student/:studentId/term/:termId
   */
  async getGraderRecords(
    studentId: string,
    termId: string,
    token: string,
  ): Promise<CourseGradeRecordWithDetails[]> {
    try {
      const response = await apiClient.get(
        `${API_BASE_URL}/grade-records/course-grade-records/student/${studentId}/term/${termId}`,
        this.getAuthHeaders(token),
      );
      return response.data.data || [];
    } catch (error: any) {
      console.error("Error fetching grader records:", error);
      throw new Error(
        error.response?.data?.message || "Failed to fetch grader records",
      );
    }
  }
  private getAuthHeaders(token: string) {
    return {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    };
  }

  // ===============================
  // ASSESSMENT GRADE RECORDS
  // ===============================

  /**
   * Get all assessment grades for a class
   */
  async getAssessmentGradesByClass(
    classId: string,
    token: string,
  ): Promise<AssessmentGradeRecordWithDetails[]> {
    try {
      const response = await apiClient.get(
        `${API_BASE_URL}/grade-records/class/${classId}`,
        this.getAuthHeaders(token),
      );
      return response.data.data || response.data || [];
    } catch (error: any) {
      console.error("Error fetching class assessment grades:", error);
      if (error.response?.status === 404) {
        return [];
      }
      throw new Error(
        error.response?.data?.message ||
          "Failed to fetch class assessment grades",
      );
    }
  }

  /**
   * Create a new assessment grade record
   */
  async createAssessmentGrade(
    data: CreateAssessmentGradeRecordDto,
    token: string,
  ): Promise<AssessmentGradeRecord> {
    try {
      const response = await apiClient.post(
        `${API_BASE_URL}/grade-records`,
        data,
        this.getAuthHeaders(token),
      );
      return response.data.data;
    } catch (error: any) {
      console.error("Error creating assessment grade:", error);
      throw new Error(
        error.response?.data?.message || "Failed to create assessment grade",
      );
    }
  }

  /**
   * Get assessment grades for a specific assessment
   */
  async getAssessmentGrades(
    assessmentId: string,
    token: string,
    courseId: string,
  ): Promise<AssessmentGradesResponse> {
    try {
      const response = await apiClient.get(
        `${API_BASE_URL}/grade-records/assessment/${assessmentId}/course/${courseId}`,
        this.getAuthHeaders(token),
      );
      const payload = response.data;
      const grades: AssessmentGradeRecordWithDetails[] = payload.data || payload || [];
      const gradingStatus: GradingStatus = payload.gradingStatus ?? {
        gradedCount: grades.length,
        totalStudents: grades.length,
        completionPercentage: grades.length > 0 ? 100 : 0,
        isFullyGraded: true,
        ungradedStudents: [],
      };
      return { grades, gradingStatus };
    } catch (error: any) {
      console.error("Error fetching assessment grades:", error);
      throw new Error(
        error.response?.data?.message || "Failed to fetch assessment grades",
      );
    }
  }

  /**
   * Get all assessment grades for a course
   */
  async getAssessmentGradesByCourse(
    courseId: string,
    token: string,
  ): Promise<AssessmentGradeRecord[]> {
    try {
      const response = await apiClient.get(
        `${API_BASE_URL}/grade-records/course/${courseId}`,
        this.getAuthHeaders(token),
      );
      return response.data.data || response.data || [];
    } catch (error: any) {
      console.error("Error fetching course assessment grades:", error);
      throw new Error(
        error.response?.data?.message ||
          "Failed to fetch course assessment grades",
      );
    }
  }

  /**
   * Update an assessment grade record
   */
  async updateAssessmentGrade(
    gradeId: string,
    data: UpdateAssessmentGradeRecordDto,
    token: string,
  ): Promise<AssessmentGradeRecord> {
    try {
      const response = await apiClient.put(
        `${API_BASE_URL}/grade-records/${gradeId}`,
        data,
        this.getAuthHeaders(token),
      );
      return response.data.data;
    } catch (error: any) {
      console.error("Error updating assessment grade:", error);
      throw new Error(
        error.response?.data?.message || "Failed to update assessment grade",
      );
    }
  }

  /**
   * Delete an assessment grade record
   */
  async deleteAssessmentGrade(gradeId: string, token: string): Promise<void> {
    try {
      await apiClient.delete(
        `${API_BASE_URL}/grade-records/${gradeId}`,
        this.getAuthHeaders(token),
      );
    } catch (error: any) {
      console.error("Error deleting assessment grade:", error);
      throw new Error(
        error.response?.data?.message || "Failed to delete assessment grade",
      );
    }
  }

  /**
   * Bulk create/update assessment grades
   */
  async bulkCreateAssessmentGrades(
    grades: CreateAssessmentGradeRecordDto[],
    token: string,
  ): Promise<BulkGradeResult> {
    try {
      const response = await apiClient.post(
        `${API_BASE_URL}/grade-records/bulk`,
        { grades },
        this.getAuthHeaders(token),
      );
      return response.data.data;
    } catch (error: any) {
      console.error("Error bulk creating assessment grades:", error);
      throw new Error(
        error.response?.data?.message ||
          "Failed to bulk create assessment grades",
      );
    }
  }

  // ===============================
  // COURSE GRADE RECORDS
  // ===============================

  /**
   * Get course grade records for a specific course and term
   */
  async getCourseGrades(
    courseId: string,
    termId: string,
    token: string,
  ): Promise<CourseGradeRecordWithDetails[]> {
    try {
      if (!termId) return [];
      const response = await apiClient.get(
        `${API_BASE_URL}/grade-records/course-grade-records/course/${courseId}/term/${termId}`,
        this.getAuthHeaders(token),
      );

      // Ensure we always return an array
      const data = response.data.data || response.data || [];
      return Array.isArray(data) ? data : [];
    } catch (error: any) {
      console.error("Error fetching course grades:", error);

      // Check if it's a 404 (no grades found) and return empty array
      if (error.response?.status === 404) {
       
        return [];
      }

      // For other errors, still return empty array to prevent crashes
      console.warn("Returning empty array due to error:", error.message);
      return [];
    }
  }

  /**
   * Get a specific student's course grade
   */
  async getStudentCourseGrade(
    studentId: string,
    courseId: string,
    termId: string,
    token: string,
  ): Promise<CourseGradeRecordWithDetails> {
    try {
      const response = await apiClient.get(
        `${API_BASE_URL}/grade-records/course-grade-records/student/${studentId}/course/${courseId}/term/${termId}`,
        this.getAuthHeaders(token),
      );
      return response.data.data;
    } catch (error: any) {
      console.error("Error fetching student course grade:", error);
      throw new Error(
        error.response?.data?.message || "Failed to fetch student course grade",
      );
    }
  }

  /**
   * Create a course grade record
   */
  async createCourseGrade(
    data: CreateCourseGradeRecordDto,
    token: string,
  ): Promise<CourseGradeRecord> {
    try {
      const response = await apiClient.post(
        `${API_BASE_URL}/grade-records/course-grade-record`,
        data,
        this.getAuthHeaders(token),
      );
      return response.data.data;
    } catch (error: any) {
      console.error("Error creating course grade:", error);
      throw new Error(
        error.response?.data?.message || "Failed to create course grade",
      );
    }
  }

  /**
   * Auto-calculate course grade from assessment grades
   * Creates a course grade record by fetching assessment grades and calculating cumulative scores
   */
  async autoCalculateCourseGrade(
    studentId: string,
    courseId: string,
    termId: string,
    token: string,
    classId?: string,
  ): Promise<CourseGradeRecord> {
    try {
      // First, fetch all assessment grades for this student in this course
      const assessmentGrades = await this.getAssessmentGradesByCourse(
        courseId,
        token,
      );

      // Filter to get this student's grades
      const studentGrades = assessmentGrades.filter((grade: any) => {
        const gradeStudentId =
          typeof grade.studentId === "object"
            ? grade.studentId._id
            : grade.studentId;
        return gradeStudentId === studentId;
      });

      if (studentGrades.length === 0) {
        throw new Error(
          "No assessment grades found for this student in this course",
        );
      }

      // Calculate cumulative scores
      const cumulativeScore = studentGrades.reduce(
        (sum: number, grade: any) => sum + grade.actualScore,
        0,
      );
      const maxScore = studentGrades.reduce(
        (sum: number, grade: any) => sum + grade.maxScore,
        0,
      );
      const percentage = maxScore > 0 ? (cumulativeScore / maxScore) * 100 : 0;

      // Determine grade level
      const gradeLevel = this.calculateGradeLevel(percentage);

      // Create course grade record with calculated data
      const courseGradeData = {
        courseId,
        studentId,
        termId,
        assessmentGradeRecords: studentGrades.map((grade: any) => grade._id),
        // gradeLevel,
        cumulativeScore,
        maxScore,
        percentage,
      };

      const response = await apiClient.post(
        `${API_BASE_URL}/grade-records/course-grade-record`,
        courseGradeData,
        this.getAuthHeaders(token),
      );

      return response.data.data;
    } catch (error: any) {
      console.error("Error auto-calculating course grade:", error);
      throw new Error(
        error.response?.data?.message ||
          "Failed to auto-calculate course grade",
      );
    }
  }

  /**
   * Calculate grade level from percentage
   */
  private calculateGradeLevel(percentage: number): string {
    if (percentage >= 90) return "A+";
    if (percentage >= 85) return "A";
    if (percentage >= 80) return "B+";
    if (percentage >= 75) return "B";
    if (percentage >= 70) return "C+";
    if (percentage >= 65) return "C";
    if (percentage >= 60) return "D+";
    if (percentage >= 55) return "D";
    if (percentage >= 50) return "E";
    return "F";
  }

  /**
   * Bulk create/update course grade records
   */
  async bulkCreateCourseGrades(
    grades: CreateCourseGradeRecordDto[],
    token: string,
  ): Promise<BulkGradeResult> {
    try {
      const response = await apiClient.post(
        `${API_BASE_URL}/grade-records/course-grade-records/bulk`,
        { grades },
        this.getAuthHeaders(token),
      );
      return response.data.data;
    } catch (error: any) {
      console.error("Error bulk creating course grades:", error);
      throw new Error(
        error.response?.data?.message || "Failed to bulk create course grades",
      );
    }
  }

  /**
   * Bulk create course grade records from assessment data
   * Creates course grades for multiple students by auto-calculating cumulative scores
   * from all their assessment grades in the specified term
   */
  async bulkCreateCourseGradeRecords(
    data: {
      courseId: string;
      termId: string;
      classId: string;
      studentIds: string[];
    },
    token: string,
  ): Promise<{
    successful: number;
    failed: number;
    results: Array<{
      studentId: string;
      success: boolean;
      message?: string;
      courseGradeRecord?: CourseGradeRecord;
    }>;
  }> {
    try {
      const assessmentGrades = await this.getAssessmentGradesByCourse(
        data.courseId,
        token,
      );

      const grades = data.studentIds
        .map((studentId) => {
          const studentGrades = assessmentGrades.filter((grade: any) => {
            const gradeStudentId =
              typeof grade.studentId === "object"
                ? grade.studentId._id
                : grade.studentId;
            return gradeStudentId === studentId;
          });

          if (studentGrades.length === 0) return null;

          const cumulativeScore = studentGrades.reduce((sum: number, g: any) => sum + g.actualScore, 0);
          const maxScore = studentGrades.reduce((sum: number, g: any) => sum + g.maxScore, 0);
          const percentage = maxScore > 0 ? (cumulativeScore / maxScore) * 100 : 0;

          return {
            courseId: data.courseId,
            studentId,
            assessmentGradeRecords: studentGrades.map((g: any) => g._id),
            classId: data.classId,
            termId: data.termId,
            cumulativeScore,
            maxScore,
            percentage,
          };
        })
        .filter(Boolean);

      if (grades.length === 0) {
        return { successful: 0, failed: data.studentIds.length, results: [] };
      }

      await apiClient.post(
        `${API_BASE_URL}/grade-records/course-grade-records/bulk`,
        { grades },
        this.getAuthHeaders(token),
      );

      return {
        successful: grades.length,
        failed: data.studentIds.length - grades.length,
        results: grades.map((g: any) => ({
          studentId: g.studentId,
          success: true,
          message: "Course grade created successfully",
        })),
      };
    } catch (error: any) {
      console.error("Error bulk creating course grade records:", error);
      throw new Error(
        error.response?.data?.message ||
          "Failed to bulk create course grade records",
      );
    }
  }

  // ===============================
  // STUDENT CUMULATIVE GRADE RECORDS
  // ===============================

  /**
   * Get all course grades for a student in a term
   */
  async getStudentTermGrades(
    studentId: string,
    termId: string,
    token: string,
  ): Promise<CourseGradeRecordWithDetails[]> {
    try {
      const response = await apiClient.get(
        `${API_BASE_URL}/grade-records/course-grade-records/student/${studentId}/term/${termId}`,
        this.getAuthHeaders(token),
      );
      const data = response.data?.data || response.data || [];
      return Array.isArray(data) ? data : [];
    } catch (error: any) {
      console.error("Error fetching student term grades:", error);
      if (error.response?.status === 404) return [];
      return [];
    }
  }

  /**
   * Get student cumulative record. Returns null if not yet created (API returns 200 + null).
   */
  async getStudentCumulative(
    studentId: string,
    termId: string,
    token: string,
  ): Promise<StudentCumulativeWithDetails | null> {
    try {
      const url = `${API_BASE_URL}/grade-records/student-cumulative-term-grade-records/${studentId}/${termId}`;
      const response = await apiClient.get(url, this.getAuthHeaders(token));
      return response.data?.data ?? response.data ?? null;
    } catch (error: any) {
      console.error("Error fetching student cumulative:", error);
      return null;
    }
  }

  /**
   * Auto-calculate student cumulative grade
   */
  async autoCalculateStudentCumulative(
    studentId: string,
    termId: string,
    token: string,
  ): Promise<StudentCumulativeTermGradeRecord> {
    try {
      const response = await apiClient.post(
        `${API_BASE_URL}/grade-records/student-cumulative-term-grade-records/calculate/${studentId}/${termId}`,
        {},
        this.getAuthHeaders(token),
      );
      return response.data.data;
    } catch (error: any) {
      console.error("Error auto-calculating student cumulative:", error);
      throw new Error(
        error.response?.data?.message ||
          "Failed to auto-calculate student cumulative",
      );
    }
  }

  /**
   * Create student cumulative grade record manually
   */
  async createStudentCumulative(
    data: {
      classId: string;
      studentId: string;
      courseGradeRecords: string[];
      termId?: string;
      remarks?: string;
    },
    token: string,
  ): Promise<StudentCumulativeTermGradeRecord> {
    try {
      const response = await apiClient.post(
        `${API_BASE_URL}/grade-records/student-cumulative-term-grade-records`,
        data,
        this.getAuthHeaders(token),
      );
      return response.data.data;
    } catch (error: any) {
      console.error("Error creating student cumulative:", error);
      throw new Error(
        error.response?.data?.message || "Failed to create student cumulative",
      );
    }
  }

  /**
   * Update student cumulative grade record
   */
  async updateStudentCumulative(
    id: string,
    data: { remarks?: string; isActive?: boolean },
    token: string,
  ): Promise<StudentCumulativeTermGradeRecord> {
    try {
      const response = await apiClient.put(
        `${API_BASE_URL}/grade-records/student-cumulative-term-grade-records/${id}`,
        data,
        this.getAuthHeaders(token),
      );
      return response.data.data;
    } catch (error: any) {
      console.error("Error updating student cumulative:", error);
      throw new Error(
        error.response?.data?.message || "Failed to update student cumulative",
      );
    }
  }

  /**
   * Get all student cumulative records for a student
   */
  async getAllStudentCumulativeRecords(
    studentId: string,
    token: string,
  ): Promise<StudentCumulativeTermGradeRecord[]> {
    try {
      const response = await apiClient.get(
        `${API_BASE_URL}/grade-records/student-cumulative-term-grade-records/${studentId}`,
        this.getAuthHeaders(token),
      );
      return response.data.data || [];
    } catch (error: any) {
      console.error("Error fetching student cumulative records:", error);
      if (error.response?.status === 404) {
        return [];
      }
      throw new Error(
        error.response?.data?.message ||
          "Failed to fetch student cumulative records",
      );
    }
  }

  /**
   * Get all student cumulative records for a class and term
   * Uses endpoint: GET /grade-records/student-cumulative-term-grade-records/class/:classId/term/:termId
   */
  async getStudentCumulativeByClass(
    classId: string,
    termId: string,
    token: string,
  ): Promise<any[]> {
    try {
      const response = await apiClient.get(
        `${API_BASE_URL}/grade-records/student-cumulative-term-grade-records/class/${classId}/term/${termId}`,
        this.getAuthHeaders(token),
      );
      return response.data || [];
    } catch (error: any) {
      console.error("Error fetching student cumulative records by class:", error);
      if (error.response?.status === 404) {
        return [];
      }
      throw new Error(
        error.response?.data?.message ||
          "Failed to fetch student cumulative records by class",
      );
    }
  }

  // ===============================
  // CLASS CUMULATIVE GRADE RECORDS
  // ===============================

  /**
   * Get class cumulative record. Returns null if not yet created (API returns 200 + null).
   */
  async getClassCumulative(
    classId: string,
    termId: string,
    token: string,
  ): Promise<ClassCumulativeTermGradeRecord | null> {
    try {
      const response = await apiClient.get(
        `${API_BASE_URL}/grade-records/class-cumulative-term-grade-records/${classId}/${termId}`,
        this.getAuthHeaders(token),
      );
      return response.data?.data ?? response.data ?? null;
    } catch (error: any) {
      console.error("Error fetching class cumulative:", error);
      return null;
    }
  }

  /**
   * Auto-calculate class cumulative grade
   */
  async autoCalculateClassCumulative(
    classId: string,
    termId: string,
    token: string,
  ): Promise<ClassCumulativeTermGradeRecord> {
    try {
      const response = await apiClient.post(
        `${API_BASE_URL}/grade-records/class-cumulative-term-grade-records/calculate/${classId}/${termId}`,
        {},
        this.getAuthHeaders(token),
      );
      return response.data.data;
    } catch (error: any) {
      console.error("Error auto-calculating class cumulative:", error);
      throw new Error(
        error.response?.data?.message ||
          "Failed to auto-calculate class cumulative",
      );
    }
  }

  /**
   * Create class cumulative grade record manually
   */
  async createClassCumulative(
    data: {
      classId: string;
      studentCumulativeTermGradeRecords: string[];
      termId?: string;
    },
    token: string,
  ): Promise<ClassCumulativeTermGradeRecord> {
    try {
      const response = await apiClient.post(
        `${API_BASE_URL}/grade-records/class-cumulative-term-grade-records`,
        data,
        this.getAuthHeaders(token),
      );
      return response.data.data;
    } catch (error: any) {
      console.error("Error creating class cumulative:", error);
      throw new Error(
        error.response?.data?.message || "Failed to create class cumulative",
      );
    }
  }

  /**
   * Get all class cumulative records for a class
   */
  async getAllClassCumulativeRecords(
    classId: string,
    token: string,
  ): Promise<ClassCumulativeTermGradeRecord[]> {
    try {
      const response = await apiClient.get(
        `${API_BASE_URL}/grade-records/class-cumulative-term-grade-records/${classId}`,
        this.getAuthHeaders(token),
      );
      return response.data.data || [];
    } catch (error: any) {
      console.error("Error fetching class cumulative records:", error);
      if (error.response?.status === 404) {
        return [];
      }
      throw new Error(
        error.response?.data?.message ||
          "Failed to fetch class cumulative records",
      );
    }
  }

  // ===============================
  // UTILITY METHODS
  // ===============================

  /**
   * Get students for a course (uses existing endpoint)
   */
  async getStudentsForCourse(classId: string, token: string) {
    try {
      const response = await apiClient.get(
        `${API_BASE_URL}/students/by-class/${classId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: {
            page: 1,
            limit: 100, // Increased to get more students
          },
        },
      );
      return response.data.data || response.data;
    } catch (error: any) {
      console.error("Error fetching students for course:", error);
      throw new Error(
        error.response?.data?.message || "Failed to fetch students for course",
      );
    }
  }

  /**
   * Get existing grades for an assessment
   */
  async getGradesByAssessment(assessmentId: string, token: string) {
    try {
      const response = await apiClient.get(
        `${API_BASE_URL}/grade-records/assessment/${assessmentId}`,
        this.getAuthHeaders(token),
      );
      return response.data.data || response.data || [];
    } catch (error: any) {
      console.error("Error fetching grades by assessment:", error);
      throw new Error(
        error.response?.data?.message || "Failed to fetch assessment grades",
      );
    }
  }

  /**
   * Get available terms (uses existing endpoint)
   */
  async getTerms(token: string) {
    try {
      const response = await apiClient.get(
        `${API_BASE_URL}/academic-year-term/term/school`,
        this.getAuthHeaders(token),
      );
      if (response.status === 304 && this.termsCache) {
        return this.termsCache;
      }
      const data = response.data;
      const terms =
        data?.terms || data?.data?.terms || data?.data || data || [];
      const normalized = Array.isArray(terms) ? terms : [];
      this.termsCache = normalized;
      return normalized;
    } catch (error) {
      console.error("Error fetching current term:", error);
      if (this.termsCache) return this.termsCache;
      throw error;
    }
  }

  /**
   * Get current term (uses existing endpoint)
   */
  async getCurrentTerm(token: string) {
    try {
      const response = await apiClient.get(
        `${API_BASE_URL}/academic-year-term/term/current`,
        this.getAuthHeaders(token),
      );
      return response.data.data || response.data;
    } catch (error: any) {
      console.error("Error fetching current term:", error);
      throw new Error(
        error.response?.data?.message || "Failed to fetch current term",
      );
    }
  }

  /**
   * Get assessments for a term (uses existing endpoint)
   */
  async getAssessmentsForTerm(termId: string, token: string) {
    try {
      const response = await apiClient.get(
        `${API_BASE_URL}/assessments/term/${termId}/active`,
        this.getAuthHeaders(token),
      );

      // Ensure we always return an array
      const data = response.data.data || response.data || [];
      return Array.isArray(data) ? data : [];
    } catch (error: any) {
      console.error("Error fetching assessments for term:", error);

      // Check if it's a 404 (no assessments found) and return empty array
      if (error.response?.status === 404) {
       
        return [];
      }

      // For other errors, still return empty array to prevent crashes
     
      return [];
    }
  }

  /**
   * Get all assessments for the school with pagination
   */
  async getSchoolAssessments(
    token: string,
    page: number = 1,
    limit: number = 50,
  ) {
    try {
      const response = await apiClient.get(
        `${API_BASE_URL}/assessments/school`,
        {
          ...this.getAuthHeaders(token),
          params: { page, limit },
        },
      );
      return response.data.data || response.data || [];
    } catch (error: any) {
      console.error("Error fetching school assessments:", error);
      if (error.response?.status === 404) {
        return [];
      }
      throw new Error(
        error.response?.data?.message || "Failed to fetch school assessments",
      );
    }
  }

  /**
   * Get performance analytics for a specific assessment
   */
  async getAssessmentAnalytics(
    assessmentId: string,
    token: string,
  ): Promise<{
    totalStudents: number;
    averageScore: number;
    highestScore: number;
    lowestScore: number;
    gradeDistribution: { [key: string]: number };
  }> {
    try {
      const response = await apiClient.get(
        `${API_BASE_URL}/grade-records/analytics/assessment/${assessmentId}`,
        this.getAuthHeaders(token),
      );
      return response.data.data;
    } catch (error: any) {
      console.error("Error fetching assessment analytics:", error);
      throw new Error(
        error.response?.data?.message || "Failed to fetch assessment analytics",
      );
    }
  }

  // ===============================
  // KPI ENDPOINTS
  // ===============================

  /**
   * Get school-wide grading KPIs
   * Protected endpoint: /grade-records/kpis
   */
  async getSchoolKpis(token: string): Promise<{
    totalAssessments: number;
    studentsGraded: number;
    averageScore: number;
    pendingReviews: number;
  }> {
    try {
      const response = await apiClient.get(
        `${API_BASE_URL}/grade-records/kpis`,
        this.getAuthHeaders(token),
      );
      return response.data.data || response.data;
    } catch (error: any) {
      console.error("Error fetching school KPIs:", error);
      throw new Error(
        error.response?.data?.message || "Failed to fetch school KPIs",
      );
    }
  }

  /**
   * Get class-specific grading KPIs
   * Protected endpoint: /grade-records/kpis/class/:classId
   */
  async getClassKpis(
    classId: string,
    token: string,
  ): Promise<{
    totalAssessments: number;
    studentsGraded: number;
    averageScore: number;
    pendingReviews: number;
    completionRate: number;
    classTrend: "improving" | "declining" | "stable";
  }> {
    try {
      const response = await apiClient.get(
        `${API_BASE_URL}/grade-records/kpis/class/${classId}`,
        this.getAuthHeaders(token),
      );
      return response.data.data || response.data;
    } catch (error: any) {
      console.error("Error fetching class KPIs:", error);
      throw new Error(
        error.response?.data?.message || "Failed to fetch class KPIs",
      );
    }
  }

  /**
   * Get teacher-specific grading progress
   */
  async getTeacherGradingProgress(
    teacherId: string,
    termId: string,
    token: string,
  ): Promise<{
    coursesAssigned: number;
    assessmentsToGrade: number;
    assessmentsGraded: number;
    studentsGraded: number;
    completionRate: number;
  }> {
    try {
      const response = await apiClient.get(
        `${API_BASE_URL}/grade-records/kpis/teacher/${teacherId}/term/${termId}`,
        this.getAuthHeaders(token),
      );
      return response.data.data;
    } catch (error: any) {
      console.error("Error fetching teacher grading progress:", error);
      throw new Error(
        error.response?.data?.message || "Failed to fetch teacher progress",
      );
    }
  }

  // ===============================
  // VALIDATION AND UTILITY METHODS
  // ===============================

  /**
   * Validate assessment grade data before submission
   */
  validateAssessmentGrade(data: CreateAssessmentGradeRecordDto): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!data.actualScore && data.actualScore !== 0) {
      errors.push("Actual score is required");
    } else if (data.actualScore < 0) {
      errors.push("Actual score cannot be negative");
    }

    if (!data.maxScore || data.maxScore <= 0) {
      errors.push("Max score must be greater than 0");
    }

    if (data.actualScore > data.maxScore) {
      errors.push("Actual score cannot exceed maximum score");
    }

    if (!data.studentId || !data.courseId || !data.assessmentId) {
      errors.push("Student ID, Course ID, and Assessment ID are required");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Batch process grades with progress tracking
   */
  async processBatchGrades(
    grades: CreateAssessmentGradeRecordDto[],
    token: string,
    onProgress?: (processed: number, total: number) => void,
  ): Promise<{
    successful: number;
    failed: number;
    results: Array<{ success: boolean; error?: string; data?: any }>;
  }> {
    const batchSize = 50; // Process in batches to avoid timeouts
    const results: Array<{ success: boolean; error?: string; data?: any }> = [];
    let successful = 0;
    let failed = 0;

    for (let i = 0; i < grades.length; i += batchSize) {
      const batch = grades.slice(i, i + batchSize);

      try {
        const batchResult = await this.bulkCreateAssessmentGrades(batch, token);
        results.push({ success: true, data: batchResult });
        successful += batch.length;
      } catch (error: any) {
        results.push({ success: false, error: error.message });
        failed += batch.length;
      }

      // Report progress
      if (onProgress) {
        onProgress(i + batch.length, grades.length);
      }
    }

    return { successful, failed, results };
  }

  /**
   * Get grade statistics for a course
   */
  async getCourseGradeStatistics(
    courseId: string,
    termId: string,
    token: string,
  ): Promise<{
    totalStudents: number;
    averageGrade: number;
    gradeDistribution: { [key: string]: number };
    topPerformers: Array<{ studentId: string; grade: number }>;
    needsAttention: Array<{ studentId: string; grade: number }>;
  }> {
    try {
      const response = await apiClient.get(
        `${API_BASE_URL}/grade-records/analytics/course/${courseId}/term/${termId}`,
        this.getAuthHeaders(token),
      );
      return response.data.data;
    } catch (error: any) {
      console.error("Error fetching course statistics:", error);
      throw new Error(
        error.response?.data?.message || "Failed to fetch course statistics",
      );
    }
  }
}

// Export singleton instance
export const gradeRecordsApi = new GradeRecordsApiService();
