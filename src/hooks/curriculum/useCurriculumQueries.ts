"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { getCurriculumByCourseAndTerm } from "@/app/services/curriculum.services";
import { queryKeys, staleTimes } from "@/lib/queryKeys";
import { useSchoolId } from "@/hooks/useSchoolId";
import type { Curriculum } from "./types";

/**
 * The curriculum of a course in a term, cached.
 *
 * A course has at most one curriculum per term, so `data` is a single record
 * or `null` when none has been written yet. The query stays idle until both
 * ids are known, so it never fires with `undefined` in the URL.
 *
 * @param courseId - The course, or `null` while unknown.
 * @param termId - The term, or `null`/`undefined` while the current term loads.
 * @returns The query result. Saving or deleting a curriculum invalidates it.
 */
export function useCurriculumByCourseTerm(
  courseId: string | null,
  termId: string | null | undefined,
): UseQueryResult<Curriculum | null, unknown> {
  const schoolId = useSchoolId();

  return useQuery({
    queryKey: queryKeys.curriculum.list(schoolId ?? "none", { courseId, termId }),
    queryFn: () => getCurriculumByCourseAndTerm({ courseId: courseId as string, termId: termId as string }),
    enabled: Boolean(schoolId && courseId && termId),
    staleTime: staleTimes.list,
  });
}
