"use client";

/**
 * The teacher dashboard's data, in one cached request.
 *
 * `GET /teachers/dashboard/me` computes every number the dashboard shows —
 * today's schedule, the weekly summary, grading/attendance/resource
 * counters, recent activity and setup-checklist completion — server-side, so
 * the page never derives them from partial client state or renders a zero as
 * if it were real data (the previous dashboard hardcoded "Pending Grading",
 * "Active Assessments" and the whole Recent Activity card).
 */
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { api } from "@/lib/apiClient";
import { queryKeys, staleTimes } from "@/lib/queryKeys";
import { useAuth } from "@/app/context/AuthContext";
import type { TeacherDashboard } from "@/types/dashboard";

/**
 * The signed-in teacher's dashboard aggregate.
 *
 * @returns The query result; idle until there is a signed-in teacher with a school.
 */
export function useTeacherDashboard(): UseQueryResult<TeacherDashboard, unknown> {
  const { user, schoolId } = useAuth();
  const userId = user?.userId ?? "";

  return useQuery({
    queryKey: queryKeys.teacher.dashboard(schoolId ?? "none", userId || "none"),
    queryFn: () => api.get<TeacherDashboard>("/teachers/dashboard/me"),
    enabled: Boolean(schoolId && userId),
    staleTime: staleTimes.list,
  });
}
