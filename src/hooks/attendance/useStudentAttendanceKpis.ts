"use client";

import { useQueries, useQuery, type UseQueryResult } from "@tanstack/react-query";
import { attendanceService } from "@/app/services/attendance/attendance.service";
import { queryKeys, staleTimes } from "@/lib/queryKeys";
import { useSchoolId } from "@/hooks/useSchoolId";
import type { StudentAttendanceKpis, StudentKpiFilter } from "@/types/attendance";

/** At most this many KPI requests are in flight at once when a whole class is read. */
export const KPI_CONCURRENCY = 6;

/**
 * Runs async work with at most `limit` jobs in flight; the rest wait their turn.
 *
 * @param limit - How many may run at once.
 * @returns A function that queues a job and resolves with its result.
 */
export function createLimiter(limit: number): <T>(job: () => Promise<T>) => Promise<T> {
  let active = 0;
  const waiting: Array<() => void> = [];
  const next = () => {
    active -= 1;
    waiting.shift()?.();
  };
  return <T>(job: () => Promise<T>) =>
    new Promise<T>((resolve, reject) => {
      const start = () => {
        active += 1;
        job().then(resolve, reject).finally(next);
      };
      if (active < limit) start();
      else waiting.push(start);
    });
}

const kpiLimiter = createLimiter(KPI_CONCURRENCY);

/**
 * The query options of one student's attendance figures, shared by the
 * single-student and the whole-class hooks so they read one cache.
 *
 * @param schoolId - The session's school.
 * @param studentId - The student.
 * @param filter - Term or date range; none for the server's default (the academic year).
 * @returns Key, fetcher and stale time.
 */
export function studentKpisQuery(schoolId: string, studentId: string, filter: StudentKpiFilter = {}) {
  return {
    queryKey: queryKeys.attendance.byStudent(schoolId, studentId, { view: "kpis", ...filter }),
    queryFn: () => kpiLimiter(() => attendanceService.getStudentKpis(studentId, filter)),
    staleTime: staleTimes.list,
  };
}

/**
 * One student's attendance figures (`GET /attendance/student/:id/kpis`).
 * The history page uses it to find the class of a link that names only a
 * student.
 *
 * @param studentId - The student; the query stays idle without one.
 * @param filter - Optional term or date range.
 * @returns The query result; `error` carries the `ApiError` so the page can
 *   tell "not found" from "offline".
 */
export function useStudentAttendanceKpis(studentId: string | null, filter: StudentKpiFilter = {}): UseQueryResult<StudentAttendanceKpis, unknown> {
  const schoolId = useSchoolId();
  return useQuery({
    ...studentKpisQuery(schoolId ?? "none", studentId ?? "none", filter),
    enabled: Boolean(schoolId && studentId),
  });
}

/**
 * Every listed student's figures over one date range, one cached query each
 * (the same cache as {@link useStudentAttendanceKpis}), at most
 * {@link KPI_CONCURRENCY} requests at a time. There is no class-wide
 * endpoint for a range, so a class is read student by student.
 *
 * @param studentIds - The class's students.
 * @param range - The range; nothing is requested without one.
 * @param range.from - First day, `YYYY-MM-DD`.
 * @param range.to - Last day, `YYYY-MM-DD`.
 * @returns One query result per student, in the same order.
 */
export function useClassAttendanceKpis(studentIds: readonly string[], range: { from: string; to: string } | null): UseQueryResult<StudentAttendanceKpis, unknown>[] {
  const schoolId = useSchoolId();
  return useQueries({
    queries: studentIds.map((id) => ({
      ...studentKpisQuery(schoolId ?? "none", id, range ? { startDate: range.from, endDate: range.to } : {}),
      enabled: Boolean(schoolId && range),
    })),
  });
}
