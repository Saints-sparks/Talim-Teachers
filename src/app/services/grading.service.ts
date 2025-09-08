import { Assessment } from "@/types/grading";
import { getActiveAssessmentsByTerm as getActiveAssessmentsByTermApi } from "./api.service";

export class GradingService {
  /**
   * Get active assessments by term ID
   */
  async getActiveAssessmentsByTerm(
    termId: string,
    token: string
  ): Promise<Assessment[]> {
    try {
      const assessments = await getActiveAssessmentsByTermApi(termId, token);
      return assessments;
    } catch (error) {
      console.error(
        "Error in GradingService.getActiveAssessmentsByTerm:",
        error
      );
      throw error;
    }
  }
}

// Export Assessment type for convenience
export type { Assessment } from "@/types/grading";
