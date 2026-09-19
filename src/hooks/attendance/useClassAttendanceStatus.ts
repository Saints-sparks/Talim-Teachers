"use client";

/**
 * The class roster with today's attendance, as one cached query shared by the
 * "Mark" and "View" modes (they used to fetch it separately, and the marking
 * mode fetched the roster a second time from another endpoint that returns only
 * its first ten students).
 */
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { attendanceService } from "@/app/services/attendance/attendance.service";
import { localDayKey } from "@/app/services/attendance/attendance.helpers";
import { queryKeys, staleTimes } from "@/lib/queryKeys";
import { useSchoolId } from "@/hooks/useSchoolId";
import type { ClassAttendanceStatus } from "@/types/attendance";

/**
 * The query key for a class's attendance on one local day, so the marking hook
 * can write a submitted mark into the same cache entry the screen reads.
 *
 * @param schoolId - The signed-in school, or `null` while signing in.
 * @param classId - The class.
 * @param day - Local `YYYY-MM-DD`; defaults to today.
 * @returns The query key.
 */
export function classAttendanceKey(schoolId: string | null, classId: string, day: string = localDayKey()) {
  return queryKeys.attendance.byClass(schoolId ?? "none", classId, { date: day });
}

/**
 * A class's roster and today's marks.
 *
 * On a failed refetch the previous roster stays in `data`, so a teacher on a
 * weak connection keeps working with what is on screen; `isError` is only
 * fatal when there is no `data` yet.
 *
 * @param classId - The class; the query stays idle until it is known.
 * @returns The query result.
 */
export function useClassAttendanceStatus(classId: string | undefined): UseQueryResult<ClassAttendanceStatus, unknown> {
  const schoolId = useSchoolId();

  return useQuery({
    queryKey: classAttendanceKey(schoolId, classId ?? "none"),
    queryFn: () => attendanceService.getClassStatus(classId as string),
    enabled: Boolean(schoolId && classId),
    staleTime: staleTimes.list,
  });
}
