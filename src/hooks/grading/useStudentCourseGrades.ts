"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { gradingWorkspaceService } from "@/app/services/grading-workspace/grading-workspace.service";
import type { StudentAssessmentHistoryRow, StudentCumulativeRecord } from "@/app/services/grading-workspace/types";
import { queryKeys, staleTimes } from "@/lib/queryKeys";
import { useSchoolId } from "@/hooks/useSchoolId";
import { buildCourseReview, type CourseReview } from "./studentCourseGrades.helpers";

/** What {@link useStudentCourseGrades} is asked about. */
export interface StudentCourseGradesOptions {
  /** The student under review. */
  studentId: string;
  /** The student's class — the class whose courses are listed. */
  classId: string;
  /** The term under review. */
  termId: string;
  /** True while the modal is open; nothing is fetched (or kept expanded) otherwise. */
  enabled: boolean;
  /** Called once a term grade has been generated and the caches refreshed. */
  onGenerated?: (record: StudentCumulativeRecord) => void;
}

/** Everything the review modal renders, from three parallel reads plus a lazy fourth. */
export interface StudentCourseGrades extends CourseReview {
  /** True while any of the three initial reads is still on its first load. */
  isLoading: boolean;
  /** True when any of the three initial reads failed. */
  isError: boolean;
  /** The first error among the initial reads, for `ApiErrorState`. */
  error: unknown;
  /** Refetches whichever initial read failed (or all of them). */
  refetch: () => void;
  /** The student's term grade, or `null` when it has not been generated. */
  termGrade: StudentCumulativeRecord | null;
  /** The course whose assessments are open, or `null`. */
  expandedCourseId: string | null;
  /** Opens a course (loading its assessments) or closes it when it is already open. */
  toggleCourse: (courseId: string) => void;
  /** The assessments of the expanded course; idle until one is expanded. */
  history: UseQueryResult<StudentAssessmentHistoryRow[], unknown>;
  /** Generating the term grade. */
  generate: {
    /** Starts generation; ignored while one is already running. */
    run: () => void;
    isPending: boolean;
    isSuccess: boolean;
    error: unknown;
    reset: () => void;
  };
}

/**
 * Everything behind the "Course Grade Review" modal for one student and term.
 *
 * - The class's course list, the student's course grades and the student's
 *   term grade are independent, so they load in parallel as three queries.
 * - A course's assessments load only when it is expanded, and are cached, so
 *   collapsing and re-opening does not fetch again.
 * - Generating the term grade is a mutation that stays pending until the
 *   term-grade and course-grade queries have been refetched, so the modal
 *   never shows the "generate" button again between the write and the refresh.
 *   A second call while one is running is ignored.
 *
 * @param options - See {@link StudentCourseGradesOptions}.
 * @returns The merged course review, the load state, the lazy history and the generate mutation.
 */
export function useStudentCourseGrades({
  studentId,
  classId,
  termId,
  enabled,
  onGenerated,
}: StudentCourseGradesOptions): StudentCourseGrades {
  const schoolId = useSchoolId();
  const queryClient = useQueryClient();
  const school = schoolId ?? "none";
  const ready = Boolean(schoolId && enabled && studentId && classId && termId);

  const overview = useQuery({
    queryKey: queryKeys.grades.assessmentOverview(school, classId, termId),
    queryFn: () => gradingWorkspaceService.getAssessmentOverview(classId, termId),
    enabled: ready,
    staleTime: staleTimes.list,
  });

  const courseGrades = useQuery({
    queryKey: queryKeys.grades.studentCourseGrades(school, studentId, termId),
    queryFn: () => gradingWorkspaceService.getStudentCourseGrades(studentId, termId),
    enabled: ready,
    staleTime: staleTimes.live,
  });

  const termGradeQuery = useQuery({
    queryKey: queryKeys.grades.studentCumulative(school, studentId, termId),
    queryFn: () => gradingWorkspaceService.getStudentTermGrade(studentId, termId),
    enabled: ready,
    staleTime: staleTimes.live,
  });

  const [expandedCourseId, setExpandedCourseId] = useState<string | null>(null);

  const history = useQuery({
    queryKey: queryKeys.grades.studentAssessmentHistory(school, studentId, expandedCourseId ?? "none", termId),
    queryFn: () => gradingWorkspaceService.getStudentAssessmentHistory(studentId, expandedCourseId as string, termId),
    enabled: ready && Boolean(expandedCourseId),
    staleTime: staleTimes.list,
  });

  const inFlight = useRef(false);
  const mutation = useMutation<StudentCumulativeRecord, unknown, void>({
    mutationFn: () => gradingWorkspaceService.generateStudentTermGrade(studentId, termId),
    onSuccess: async (record) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.grades.studentCumulative(school, studentId, termId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.grades.studentCourseGrades(school, studentId, termId) }),
      ]);
      onGenerated?.(record);
    },
    onSettled: () => {
      inFlight.current = false;
    },
  });
  const { mutate, reset: resetMutation } = mutation;

  const run = useCallback(() => {
    if (inFlight.current) return;
    inFlight.current = true;
    mutate();
  }, [mutate]);

  // A closed modal, or a different student or term, starts from a clean slate.
  useEffect(() => {
    setExpandedCourseId(null);
    resetMutation();
  }, [enabled, studentId, classId, termId, resetMutation]);

  const toggleCourse = useCallback((courseId: string) => {
    setExpandedCourseId((current) => (current === courseId ? null : courseId));
  }, []);

  const review = useMemo(
    () => buildCourseReview(overview.data ?? [], courseGrades.data ?? []),
    [overview.data, courseGrades.data],
  );

  const initial = [overview, courseGrades, termGradeQuery];
  const failed = initial.find((query) => query.isError);

  return {
    ...review,
    isLoading: ready && initial.some((query) => query.isPending),
    isError: Boolean(failed),
    error: failed?.error ?? null,
    refetch: () => {
      initial.filter((query) => query.isError).forEach((query) => void query.refetch());
    },
    termGrade: termGradeQuery.data ?? null,
    expandedCourseId,
    toggleCourse,
    history,
    generate: {
      run,
      isPending: mutation.isPending,
      isSuccess: mutation.isSuccess,
      error: mutation.error,
      reset: resetMutation,
    },
  };
}
