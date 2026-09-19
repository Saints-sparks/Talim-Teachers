"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { timetableService, type TimetableByDay } from "@/app/services/timetable/timetable.service";
import { useAuth } from "@/app/context/AuthContext";
import { queryKeys, staleTimes } from "@/lib/queryKeys";

/**
 * The signed-in teacher's weekly timetable, cached for ten minutes: it only
 * changes when a school admin edits it, so the page no longer refetches on
 * every visit. The Refresh button forces a re-read.
 *
 * @returns The query result; idle until there is a signed-in teacher.
 */
export function useTeacherTimetable(): UseQueryResult<TimetableByDay, unknown> {
  const { user, schoolId } = useAuth();
  const userId = user?.userId ?? "";

  return useQuery({
    queryKey: queryKeys.timetable.byTeacher(schoolId ?? "none", userId || "none"),
    queryFn: () => timetableService.getForTeacher(userId),
    enabled: Boolean(schoolId && userId),
    staleTime: staleTimes.reference,
  });
}
