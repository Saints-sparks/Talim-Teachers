"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { studentsService, type StudentRecord } from "@/app/services/students/students.service";
import { queryKeys, staleTimes } from "@/lib/queryKeys";
import { useSchoolId } from "@/hooks/useSchoolId";

/**
 * One student's profile.
 *
 * @param studentId - The student; the query stays idle without one.
 * @returns The query result; `data` is `null` when the server has no such record.
 */
export function useStudent(studentId: string | undefined): UseQueryResult<StudentRecord | null, unknown> {
  const schoolId = useSchoolId();

  return useQuery({
    queryKey: queryKeys.students.detail(schoolId ?? "none", studentId ?? "none"),
    queryFn: () => studentsService.getById(studentId as string),
    enabled: Boolean(schoolId && studentId),
    staleTime: staleTimes.list,
  });
}
