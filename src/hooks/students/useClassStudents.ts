"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { studentsService, type StudentRecord } from "@/app/services/students/students.service";
import { queryKeys, staleTimes } from "@/lib/queryKeys";
import { useSchoolId } from "@/hooks/useSchoolId";

/**
 * Every student in one class, cached per class. The old screen asked for the
 * class's first page of ten and showed "Total: 10" for a class of forty.
 *
 * @param classId - The class; the query stays idle until one is chosen.
 * @returns The query result.
 */
export function useClassStudents(classId: string | null): UseQueryResult<StudentRecord[], unknown> {
  const schoolId = useSchoolId();

  return useQuery({
    queryKey: queryKeys.students.byClass(schoolId ?? "none", classId ?? "none"),
    queryFn: () => studentsService.listByClass(classId as string),
    enabled: Boolean(schoolId && classId),
    staleTime: staleTimes.list,
  });
}
