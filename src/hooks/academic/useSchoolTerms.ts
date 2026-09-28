"use client";

/**
 * The school's terms, for the term pickers on Grading and Subjects
 * (`GET /academic-year-term/term/school`, through the grading workspace
 * service that already reads it). Reference data: cached under
 * `queryKeys.academic.terms`.
 */
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { useAuth } from "@/app/context/AuthContext";
import { gradingWorkspaceService } from "@/app/services/grading-workspace/grading-workspace.service";
import type { Term } from "@/app/services/grading-workspace/types";
import { fixturesEnabled } from "@/lib/fixtures/flag";
import { queryKeys, staleTimes } from "@/lib/queryKeys";

/** A term as the picker lists it. */
export type SchoolTerm = Term;

/**
 * Reads the terms, from the fixtures in a dev build with `NEXT_PUBLIC_USE_FIXTURES=true`.
 *
 * @returns The terms, as the API orders them.
 * @throws ApiError when they cannot be read.
 */
export async function fetchSchoolTerms(): Promise<SchoolTerm[]> {
  if (fixturesEnabled()) {
    const { makeTermsFixture } = await import("@/lib/fixtures/grading.fixture");
    return makeTermsFixture();
  }
  return gradingWorkspaceService.getTerms();
}

/**
 * The school's terms, newest academic year first.
 *
 * @returns The query result; idle until there is a session.
 */
export function useSchoolTerms(): UseQueryResult<SchoolTerm[], unknown> {
  const { user, schoolId } = useAuth();
  return useQuery({
    queryKey: queryKeys.academic.terms(schoolId ?? "none"),
    queryFn: fetchSchoolTerms,
    enabled: Boolean(schoolId && user?.userId) && !user?.mustChangePassword,
    staleTime: staleTimes.reference,
  });
}
