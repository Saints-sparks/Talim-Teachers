"use client";

/**
 * The school's current academic term, as a cached query.
 *
 * This replaces the five-minute `currentTermCache` module global that used to
 * live in `api.service.ts`: a hand-rolled cache that no mutation could
 * invalidate and that every tab kept its own copy of. The term is reference
 * data — it changes when an admin rolls the term over — so it is cached under
 * `queryKeys.academic.currentTerm(schoolId)` with the `reference` stale time
 * and invalidated explicitly by {@link useInvalidateCurrentTerm}.
 */
import { useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { getCurrentTerm, type CurrentTerm } from "@/app/services/api.service";
import { queryKeys, staleTimes } from "@/lib/queryKeys";
import { useSchoolId } from "@/hooks/useSchoolId";

/**
 * The current term for the signed-in teacher's school.
 *
 * @returns The query result; `data` is `undefined` until the term arrives and
 *   the query stays idle while there is no school in the session.
 */
export function useCurrentTerm(): UseQueryResult<CurrentTerm, unknown> {
  const schoolId = useSchoolId();

  return useQuery({
    queryKey: queryKeys.academic.currentTerm(schoolId ?? "none"),
    queryFn: () => getCurrentTerm(),
    enabled: Boolean(schoolId),
    staleTime: staleTimes.reference,
  });
}

/**
 * Drops the cached term so the next read goes back to the server. Call it
 * after anything that can roll the term over.
 *
 * @returns A function that invalidates the current-term query.
 */
export function useInvalidateCurrentTerm(): () => void {
  const queryClient = useQueryClient();
  const schoolId = useSchoolId();

  return () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.academic.currentTerm(schoolId ?? "none") });
  };
}
