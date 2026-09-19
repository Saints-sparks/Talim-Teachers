"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { attendanceService } from "@/app/services/attendance/attendance.service";
import { queryKeys, staleTimes } from "@/lib/queryKeys";
import { useSchoolId } from "@/hooks/useSchoolId";
import type { StudentAttendanceKpis } from "@/types/attendance";

/**
 * One student's attendance figures for the analytics page.
 *
 * @param studentId - The student; the query stays idle without one.
 * @returns The query result; `error` carries the `ApiError` so the page can
 *   tell "not found" from "offline".
 */
export function useStudentAttendanceKpis(studentId: string | null): UseQueryResult<StudentAttendanceKpis, unknown> {
  const schoolId = useSchoolId();

  return useQuery({
    queryKey: queryKeys.attendance.byStudent(schoolId ?? "none", studentId ?? "none", { view: "kpis" }),
    queryFn: () => attendanceService.getStudentKpis(studentId as string),
    enabled: Boolean(schoolId && studentId),
    staleTime: staleTimes.list,
  });
}
