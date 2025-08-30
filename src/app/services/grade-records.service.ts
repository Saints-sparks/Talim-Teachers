import axios from "axios";
import { API_BASE_URL } from "../lib/api/config";
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
  CourseGradeRecordWithDetails,
  StudentCumulativeWithDetails,
} from "@/types/grade-records";

export class GradeRecordsApiService {
  /**
   * Get grader records for a student in a term
   * Protected endpoint: /grade-records/course-grade-records/student/:studentId/term/:termId
   */
  async getGraderRecords(
    studentId: string,
    termId: string,
    token: string
  ): Promise<CourseGradeRecordWithDetails[]> {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/grade-records/course-grade-records/student/${studentId}/term/${termId}`,
        this.getAuthHeaders(token)
      );
      return response.data.data || [];
    } catch (error: any) {
      console.error("Error fetching grader records:", error);
      throw new Error(
        error.response?.data?.message || "Failed to fetch grader records"
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
   * Create a new assessment grade record
   */
  async createAssessmentGrade(
    data: CreateAssessmentGradeRecordDto,
    token: string
  ): Promise<AssessmentGradeRecord> {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/grade-records`,
        data,
        this.getAuthHeaders(token)
      );
      return response.data.data;
    } catch (error: any) {
      console.error("Error creating assessment grade:", error);
      throw new Error(
        error.response?.data?.message || "Failed to create assessment grade"
      );
    }
  }

  /**
   * Get assessment grades for a specific assessment
   */
  async getAssessmentGrades(
    assessmentId: string,
    token: string,
    courseId: string
  ): Promise<AssessmentGradeRecordWithDetails[]> {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/grade-records/assessment/${assessmentId}/course/${courseId}`,
        this.getAuthHeaders(token)
      );
      // Handle both wrapped and direct response formats
      return response.data.data || response.data || [];
    } catch (error: any) {
      console.error("Error fetching assessment grades:", error);
      throw new Error(
        error.response?.data?.message || "Failed to fetch assessment grades"
      );
    }
  }

  /**
   * Get all assessment grades for a course
   */
  async getAssessmentGradesByCourse(
    courseId: string,
    token: string
  ): Promise<AssessmentGradeRecord[]> {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/grade-records/course/${courseId}`,
        this.getAuthHeaders(token)
      );
      return response.data.data || response.data || [];
    } catch (error: any) {
      console.error("Error fetching course assessment grades:", error);
      throw new Error(
        error.response?.data?.message ||
          "Failed to fetch course assessment grades"
      );
    }
  }

  /**
   * Update an assessment grade record
   */
  async updateAssessmentGrade(
    gradeId: string,
    data: UpdateAssessmentGradeRecordDto,
    token: string
  ): Promise<AssessmentGradeRecord> {
    try {
      const response = await axios.put(
        `${API_BASE_URL}/grade-records/${gradeId}`,
        data,
        this.getAuthHeaders(token)
      );
      return response.data.data;
    } catch (error: any) {
      console.error("Error updating assessment grade:", error);
      throw new Error(
        error.response?.data?.message || "Failed to update assessment grade"
      );
    }
  }

  /**
   * Delete an assessment grade record
   */
  async deleteAssessmentGrade(gradeId: string, token: string): Promise<void> {
    try {
      await axios.delete(
        `${API_BASE_URL}/grade-records/${gradeId}`,
        this.getAuthHeaders(token)
      );
    } catch (error: any) {
      console.error("Error deleting assessment grade:", error);
      throw new Error(
        error.response?.data?.message || "Failed to delete assessment grade"
      );
    }
  }

  /**
   * Bulk create/update assessment grades
   */
  async bulkCreateAssessmentGrades(
    grades: CreateAssessmentGradeRecordDto[],
    token: string
  ): Promise<BulkGradeResult> {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/grade-records/bulk`,
        { grades },
        this.getAuthHeaders(token)
      );
      return response.data.data;
    } catch (error: any) {
      console.error("Error bulk creating assessment grades:", error);
      throw new Error(
        error.response?.data?.message ||
          "Failed to bulk create assessment grades"
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
    token: string
  ): Promise<CourseGradeRecordWithDetails[]> {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/grade-records/course-grade-records/course/${courseId}/term/${termId}`,
        this.getAuthHeaders(token)
      );

      // Ensure we always return an array
      const data = response.data.data || response.data || [];
      return Array.isArray(data) ? data : [];
    } catch (error: any) {
      console.error("Error fetching course grades:", error);

      // Check if it's a 404 (no grades found) and return empty array
      if (error.response?.status === 404) {
        console.log(
          "No course grades found for course:",
          courseId,
          "term:",
          termId
        );
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
    token: string
  ): Promise<CourseGradeRecordWithDetails> {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/grade-records/course-grade-records/student/${studentId}/course/${courseId}/term/${termId}`,
        this.getAuthHeaders(token)
      );
      return response.data.data;
    } catch (error: any) {
      console.error("Error fetching student course grade:", error);
      throw new Error(
        error.response?.data?.message || "Failed to fetch student course grade"
      );
    }
  }

  /**
   * Create a course grade record
   */
  async createCourseGrade(
    data: CreateCourseGradeRecordDto,
    token: string
  ): Promise<CourseGradeRecord> {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/grade-records/course-grade-record`,
        data,
        this.getAuthHeaders(token)
      );
      return response.data.data;
    } catch (error: any) {
      console.error("Error creating course grade:", error);
      throw new Error(
        error.response?.data?.message || "Failed to create course grade"
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
    classId?: string
  ): Promise<CourseGradeRecord> {
    try {
      // First, fetch all assessment grades for this student in this course
      const assessmentGrades = await this.getAssessmentGradesByCourse(
        courseId,
        token
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
          "No assessment grades found for this student in this course"
        );
      }

      // Calculate cumulative scores
      const cumulativeScore = studentGrades.reduce(
        (sum: number, grade: any) => sum + grade.actualScore,
        0
      );
      const maxScore = studentGrades.reduce(
        (sum: number, grade: any) => sum + grade.maxScore,
        0
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

      const response = await axios.post(
        `${API_BASE_URL}/grade-records/course-grade-record`,
        courseGradeData,
        this.getAuthHeaders(token)
      );

      return response.data.data;
    } catch (error: any) {
      console.error("Error auto-calculating course grade:", error);
      throw new Error(
        error.response?.data?.message || "Failed to auto-calculate course grade"
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
    token: string
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
      // Since the bulk endpoint expects fully calculated grades, we'll use individual auto-calculation
      // calls for each student to let the backend handle the calculation logic
      const results = [];
      let successful = 0;
      let failed = 0;

      for (const studentId of data.studentIds) {
        try {
          await this.autoCalculateCourseGrade(
            studentId,
            data.courseId,
            data.termId,
            token,
            data.classId
          );

          results.push({
            studentId,
            success: true,
            message: "Course grade calculated successfully",
          });
          successful++;
        } catch (error: any) {
          console.error(
            `Error creating course grade for student ${studentId}:`,
            error
          );
          results.push({
            studentId,
            success: false,
            message: error.message || "Failed to calculate course grade",
          });
          failed++;
        }
      }

      return {
        successful,
        failed,
        results,
      };
    } catch (error: any) {
      console.error("Error bulk creating course grade records:", error);
      throw new Error(
        error.response?.data?.message ||
          "Failed to bulk create course grade records"
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
    token: string
  ): Promise<CourseGradeRecordWithDetails[]> {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/grade-records/course-grade-records/student/${studentId}/term/${termId}`,
        this.getAuthHeaders(token)
      );
      return response.data.data;
    } catch (error: any) {
      console.error("Error fetching student term grades:", error);
      throw new Error(
        error.response?.data?.message || "Failed to fetch student term grades"
      );
    }
  }

  /**
   * Get student cumulative record
   */
  async getStudentCumulative(
    studentId: string,
    termId: string,
    token: string
  ): Promise<StudentCumulativeWithDetails> {
    try {
      console.log(
        "Fetching student cumulative record for:",
        studentId,
        "and term:",
        termId
      );
      const url = `${API_BASE_URL}/grade-records/student-cumulative-term-grade-records/${studentId}/${termId}`;
      console.log("Request URL:", url);
      const response = await axios.get(url, this.getAuthHeaders(token));
      return response.data.data;
    } catch (error: any) {
      console.error("Error fetching student cumulative:", error);
      throw new Error(
        error.response?.data?.message ||
          "Failed to fetch student cumulative record"
      );
    }
  }

  /**
   * Auto-calculate student cumulative grade
   */
  async autoCalculateStudentCumulative(
    studentId: string,
    termId: string,
    token: string
  ): Promise<StudentCumulativeTermGradeRecord> {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/grade-records/student-cumulative-term-grade-records/calculate/${studentId}/${termId}`,
        {},
        this.getAuthHeaders(token)
      );
      return response.data.data;
    } catch (error: any) {
      console.error("Error auto-calculating student cumulative:", error);
      throw new Error(
        error.response?.data?.message ||
          "Failed to auto-calculate student cumulative"
      );
    }
  }

  // ===============================
  // CLASS CUMULATIVE GRADE RECORDS
  // ===============================

  /**
   * Get class cumulative record
   */
  async getClassCumulative(
    classId: string,
    termId: string,
    token: string
  ): Promise<ClassCumulativeTermGradeRecord> {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/grade-records/class-cumulative-term-grade-records/${classId}/${termId}`,
        this.getAuthHeaders(token)
      );
      return response.data.data;
    } catch (error: any) {
      console.error("Error fetching class cumulative:", error);
      throw new Error(
        error.response?.data?.message ||
          "Failed to fetch class cumulative record"
      );
    }
  }

  /**
   * Auto-calculate class cumulative grade
   */
  async autoCalculateClassCumulative(
    classId: string,
    termId: string,
    token: string
  ): Promise<ClassCumulativeTermGradeRecord> {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/grade-records/class-cumulative-term-grade-records/calculate/${classId}/${termId}`,
        {},
        this.getAuthHeaders(token)
      );
      return response.data.data;
    } catch (error: any) {
      console.error("Error auto-calculating class cumulative:", error);
      throw new Error(
        error.response?.data?.message ||
          "Failed to auto-calculate class cumulative"
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
      const response = await axios.get(
        `${API_BASE_URL}/students/by-class/${classId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: {
            page: 1,
            limit: 10,
          },
        }
      );
      return response.data.data || response.data;
    } catch (error: any) {
      console.error("Error fetching students for course:", error);
      throw new Error(
        error.response?.data?.message || "Failed to fetch students for course"
      );
    }
  }

  /**
   * Get available terms (uses existing endpoint)
   */
  async getTerms(token: string) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/academic-year-term/term/school`,
        {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-cache", // Prevent browser caching
        }
      );
      if (response.status === 304) {
        // Handle 304: Return cached data or retry without caching headers
        console.log("Resource not modified, using cached data or retrying");
        return null; // Or fetch from local storage if cached
      }
      if (!response.ok)
        throw new Error(`Failed to fetch current term: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error("Error fetching current term:", error);
      throw error;
    }
  }

  /**
   * Get current term (uses existing endpoint)
   */
  async getCurrentTerm(token: string) {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/academic-year-term/term/current`,
        this.getAuthHeaders(token)
      );
      return response.data.data || response.data;
    } catch (error: any) {
      console.error("Error fetching current term:", error);
      throw new Error(
        error.response?.data?.message || "Failed to fetch current term"
      );
    }
  }

  /**
   * Get assessments for a term (uses existing endpoint)
   */
  async getAssessmentsForTerm(termId: string, token: string) {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/assessments/term/${termId}/active`,
        this.getAuthHeaders(token)
      );

      // Ensure we always return an array
      const data = response.data.data || response.data || [];
      return Array.isArray(data) ? data : [];
    } catch (error: any) {
      console.error("Error fetching assessments for term:", error);

      // Check if it's a 404 (no assessments found) and return empty array
      if (error.response?.status === 404) {
        console.log("No assessments found for term:", termId);
        return [];
      }

      // For other errors, still return empty array to prevent crashes
      console.warn("Returning empty array due to error:", error.message);
      return [];
    }
  }
}

// Export singleton instance
export const gradeRecordsApi = new GradeRecordsApiService();
