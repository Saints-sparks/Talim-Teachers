import { useCallback, useState } from "react";
import { getCurriculumByCourseAndTerm } from "../services/curriculum.services";
import { getCurrentTerm } from "../services/api.service";
import type { Curriculum } from "@/hooks/curriculum/types";

/** What {@link useCurriculum} provides. */
export interface UseCurriculumResult {
  /** True while a lookup is in flight. */
  isLoading: boolean;
  /**
   * The curriculum of a course in the school's current term.
   *
   * Rejects with an `ApiError` when the term or the curriculum cannot be read.
   */
  fetchCurriculumByCourse: (courseId: string) => Promise<Curriculum | null>;
}

/**
 * One-shot curriculum lookup for callers that decide what to do with the
 * answer themselves (the subject cards route to "create" or "view").
 *
 * The curriculum pages read through the cached hooks in `src/hooks/curriculum`
 * instead; this hook exists so the subject cards keep working unchanged.
 *
 * @returns The loading flag and the lookup function.
 */
export function useCurriculum(): UseCurriculumResult {
  const [isLoading, setIsLoading] = useState(false);

  const fetchCurriculumByCourse = useCallback(async (courseId: string) => {
    setIsLoading(true);
    try {
      const term = await getCurrentTerm();
      return await getCurriculumByCourseAndTerm({ courseId, termId: term._id });
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { isLoading, fetchCurriculumByCourse };
}
