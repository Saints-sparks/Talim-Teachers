import { API_BASE_URL } from "../lib/api/config";
import { apiClient } from "../lib/api/apiClient";

export interface Assessment {
  _id: string;
  name: string;
  description?: string;
  termId: string;
  startDate: string;
  endDate: string;
  status: "PENDING" | "ACTIVE" | "COMPLETED" | "CANCELLED";
  courseId?: string;
  classId?: string;
  schoolId: string;
  createdBy: string;
  maxScore?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AssessmentWithDetails extends Assessment {
  course?: {
    _id: string;
    title: string;
    courseCode: string;
  };
  class?: {
    _id: string;
    name: string;
  };
  term?: {
    _id: string;
    name: string;
  };
  gradedStudents?: number;
  totalStudents?: number;
  averageScore?: number;
}

/**
 * Assessment Management Service
 * Note: Teachers can view and manage assessments but cannot create new ones
 */
export class AssessmentManagementService {
  private getAuthHeaders(token: string) {
    return {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    };
  }

  // ===============================
  // ASSESSMENT VIEWING AND MANAGEMENT
  // ===============================

  /**
   * Get all assessments for the school with pagination
   * Used by teachers to browse available assessments
   */
  async getSchoolAssessments(
    token: string,
    page: number = 1,
    limit: number = 50,
    filters?: {
      termId?: string;
      status?: string;
      courseId?: string;
    },
  ): Promise<{
    assessments: AssessmentWithDetails[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (filters) {
        if (filters.termId) params.append("termId", filters.termId);
        if (filters.status) params.append("status", filters.status);
        if (filters.courseId) params.append("courseId", filters.courseId);
      }

      const response = await apiClient.get(
        `${API_BASE_URL}/assessments/school?${params.toString()}`,
        this.getAuthHeaders(token),
      );

      return {
        assessments: response.data.data || [],
        pagination: response.data.pagination || {
          page: 1,
          limit: 50,
          total: 0,
          totalPages: 0,
        },
      };
    } catch (error: any) {
      console.error("Error fetching school assessments:", error);
      throw new Error(
        error.response?.data?.message || "Failed to fetch school assessments",
      );
    }
  }

  /**
   * Get assessments for a specific term
   * Used by teachers to see what assessments are available for grading
   */
  async getAssessmentsForTerm(
    termId: string,
    token: string,
    activeOnly: boolean = true,
  ): Promise<AssessmentWithDetails[]> {
    try {
      const endpoint = activeOnly
        ? `${API_BASE_URL}/assessments/term/${termId}/active`
        : `${API_BASE_URL}/assessments/term/${termId}`;

      const response = await apiClient.get(
        endpoint,
        this.getAuthHeaders(token),
      );

      return response.data.data || [];
    } catch (error: any) {
      console.error("Error fetching term assessments:", error);
      if (error.response?.status === 404) {
        return [];
      }
      throw new Error(
        error.response?.data?.message || "Failed to fetch term assessments",
      );
    }
  }

  /**
   * Get assessments assigned to a specific teacher's courses
   * Filters assessments to only show those relevant to the teacher
   */
  async getTeacherAssessments(
    teacherId: string,
    token: string,
    termId?: string,
  ): Promise<AssessmentWithDetails[]> {
    try {
      const params = new URLSearchParams();
      if (termId) params.append("termId", termId);

      const response = await apiClient.get(
        `${API_BASE_URL}/assessments/teacher/${teacherId}?${params.toString()}`,
        this.getAuthHeaders(token),
      );

      return response.data.data || [];
    } catch (error: any) {
      console.error("Error fetching teacher assessments:", error);
      if (error.response?.status === 404) {
        return [];
      }
      throw new Error(
        error.response?.data?.message || "Failed to fetch teacher assessments",
      );
    }
  }

  /**
   * Get detailed information about a specific assessment
   * Including grading progress and statistics
   */
  async getAssessmentDetails(
    assessmentId: string,
    token: string,
  ): Promise<
    AssessmentWithDetails & {
      gradingProgress: {
        totalStudents: number;
        gradedStudents: number;
        pendingStudents: number;
        completionRate: number;
      };
      statistics?: {
        averageScore: number;
        highestScore: number;
        lowestScore: number;
        gradeDistribution: { [key: string]: number };
      };
    }
  > {
    try {
      const response = await apiClient.get(
        `${API_BASE_URL}/assessments/${assessmentId}/details`,
        this.getAuthHeaders(token),
      );

      return response.data.data;
    } catch (error: any) {
      console.error("Error fetching assessment details:", error);
      throw new Error(
        error.response?.data?.message || "Failed to fetch assessment details",
      );
    }
  }

  /**
   * Get grading status for an assessment
   * Shows which students have been graded and which are pending
   */
  async getAssessmentGradingStatus(
    assessmentId: string,
    courseId: string,
    token: string,
  ): Promise<{
    assessmentId: string;
    courseId: string;
    totalStudents: number;
    gradedStudents: Array<{
      studentId: string;
      studentName: string;
      actualScore: number;
      maxScore: number;
      percentage: number;
      gradedAt: Date;
    }>;
    pendingStudents: Array<{
      studentId: string;
      studentName: string;
    }>;
    completionRate: number;
  }> {
    try {
      const response = await apiClient.get(
        `${API_BASE_URL}/assessments/${assessmentId}/grading-status/course/${courseId}`,
        this.getAuthHeaders(token),
      );

      return response.data.data;
    } catch (error: any) {
      console.error("Error fetching grading status:", error);
      throw new Error(
        error.response?.data?.message || "Failed to fetch grading status",
      );
    }
  }

  // ===============================
  // ASSESSMENT ANALYTICS
  // ===============================

  /**
   * Get performance analytics for an assessment
   * Provides comprehensive statistics for teachers to analyze results
   */
  async getAssessmentAnalytics(
    assessmentId: string,
    token: string,
  ): Promise<{
    totalStudents: number;
    averageScore: number;
    medianScore: number;
    highestScore: number;
    lowestScore: number;
    standardDeviation: number;
    gradeDistribution: { [key: string]: number };
    performanceByClass: Array<{
      classId: string;
      className: string;
      averageScore: number;
      studentCount: number;
    }>;
  }> {
    try {
      const response = await apiClient.get(
        `${API_BASE_URL}/assessments/${assessmentId}/analytics`,
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

  /**
   * Compare assessment performance across different classes or terms
   */
  async compareAssessmentPerformance(
    assessmentId: string,
    comparisonType: "class" | "term",
    token: string,
  ): Promise<{
    assessment: Assessment;
    comparisons: Array<{
      id: string;
      name: string;
      averageScore: number;
      studentCount: number;
      gradeDistribution: { [key: string]: number };
    }>;
  }> {
    try {
      const response = await apiClient.get(
        `${API_BASE_URL}/assessments/${assessmentId}/compare/${comparisonType}`,
        this.getAuthHeaders(token),
      );

      return response.data.data;
    } catch (error: any) {
      console.error("Error comparing assessment performance:", error);
      throw new Error(
        error.response?.data?.message || "Failed to compare performance",
      );
    }
  }

  // ===============================
  // ASSESSMENT UTILITIES
  // ===============================

  /**
   * Search assessments by name, description, or course
   */
  async searchAssessments(
    searchTerm: string,
    token: string,
    termId?: string,
  ): Promise<AssessmentWithDetails[]> {
    try {
      const params = new URLSearchParams({
        q: searchTerm,
      });
      if (termId) params.append("termId", termId);

      const response = await apiClient.get(
        `${API_BASE_URL}/assessments/search?${params.toString()}`,
        this.getAuthHeaders(token),
      );

      return response.data.data || [];
    } catch (error: any) {
      console.error("Error searching assessments:", error);
      if (error.response?.status === 404) {
        return [];
      }
      throw new Error(
        error.response?.data?.message || "Failed to search assessments",
      );
    }
  }

  /**
   * Get upcoming assessments that need grading
   */
  async getUpcomingGradingTasks(
    teacherId: string,
    token: string,
    daysAhead: number = 7,
  ): Promise<
    Array<{
      assessment: AssessmentWithDetails;
      courseId: string;
      courseName: string;
      dueDate: Date;
      priority: "high" | "medium" | "low";
      studentsCount: number;
      gradedCount: number;
    }>
  > {
    try {
      const response = await apiClient.get(
        `${API_BASE_URL}/assessments/teacher/${teacherId}/upcoming?days=${daysAhead}`,
        this.getAuthHeaders(token),
      );

      return response.data.data || [];
    } catch (error: any) {
      console.error("Error fetching upcoming grading tasks:", error);
      if (error.response?.status === 404) {
        return [];
      }
      throw new Error(
        error.response?.data?.message || "Failed to fetch upcoming tasks",
      );
    }
  }

  /**
   * Get assessment templates (for reference only, teachers can't create)
   */
  async getAssessmentTemplates(token: string): Promise<
    Array<{
      id: string;
      name: string;
      description: string;
      suggestedMaxScore: number;
      type: "quiz" | "test" | "assignment" | "project";
    }>
  > {
    try {
      const response = await apiClient.get(
        `${API_BASE_URL}/assessments/templates`,
        this.getAuthHeaders(token),
      );

      return response.data.data || [];
    } catch (error: any) {
      console.error("Error fetching assessment templates:", error);
      if (error.response?.status === 404) {
        return [];
      }
      throw new Error(
        error.response?.data?.message || "Failed to fetch templates",
      );
    }
  }

  // ===============================
  // EXPORT AND REPORTING
  // ===============================

  /**
   * Export assessment results to CSV
   */
  async exportAssessmentResults(
    assessmentId: string,
    courseId: string,
    format: "csv" | "excel" | "pdf",
    token: string,
  ): Promise<Blob> {
    try {
      const response = await apiClient.get(
        `${API_BASE_URL}/assessments/${assessmentId}/export/${format}/course/${courseId}`,
        {
          ...this.getAuthHeaders(token),
          responseType: "blob",
        },
      );

      return response.data;
    } catch (error: any) {
      console.error("Error exporting assessment results:", error);
      throw new Error(
        error.response?.data?.message || "Failed to export results",
      );
    }
  }

  /**
   * Generate assessment summary report
   */
  async generateAssessmentReport(
    assessmentId: string,
    includeAnalytics: boolean = true,
    token: string,
  ): Promise<{
    assessment: AssessmentWithDetails;
    summary: {
      totalStudents: number;
      completionRate: number;
      averageScore: number;
      passRate: number;
    };
    analytics?: any;
    recommendations: string[];
  }> {
    try {
      const response = await apiClient.get(
        `${API_BASE_URL}/assessments/${assessmentId}/report?analytics=${includeAnalytics}`,
        this.getAuthHeaders(token),
      );

      return response.data.data;
    } catch (error: any) {
      console.error("Error generating assessment report:", error);
      throw new Error(
        error.response?.data?.message || "Failed to generate report",
      );
    }
  }
}

// Export singleton instance
export const assessmentManagementService = new AssessmentManagementService();
