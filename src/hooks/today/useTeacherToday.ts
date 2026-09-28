"use client";

/**
 * Data hooks for the redesign's Today and Timetable screens.
 *
 * - `useTeacherToday`: `GET /teachers/today`, refetched on window focus and
 *   every five minutes.
 * - `useSchoolNow`: a 30-second tick of "now", offset to the server's clock.
 * - `useTimetableWeek`: `GET /timetable/me` for one week.
 * - `useMarkTaught`: the scheme-of-work taught toggle, optimistic across both.
 * - `useCompleteTour`: stamps the tour as finished.
 */
import { useEffect, useMemo, useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { useAuth } from "@/app/context/AuthContext";
import { todayService } from "@/app/services/today/today.service";
import { queryKeys } from "@/lib/queryKeys";
import { clockOffset } from "@/hooks/today/today.logic";
import type { Lesson, TeacherToday, TimetableWeek } from "@/types/today";

/** How often Today refetches while open. */
export const TODAY_REFETCH_MS = 5 * 60_000;
/** How often the clock-derived parts of the screens recompute. */
export const CLOCK_TICK_MS = 30_000;

/**
 * The signed-in teacher's Today aggregate.
 *
 * @param options - `enabled: false` to keep it idle (e.g. while a password must be changed).
 * @param options.enabled - Whether to fetch.
 * @returns The query result.
 */
export function useTeacherToday(options: { enabled?: boolean } = {}): UseQueryResult<TeacherToday, unknown> {
  const { user, schoolId } = useAuth();
  const userId = user?.userId ?? "";
  return useQuery({
    queryKey: queryKeys.teacher.today(schoolId ?? "none", userId || "none"),
    queryFn: todayService.getToday,
    // Nothing is requested while a temporary password must be replaced (the API refuses it).
    enabled: Boolean(schoolId && userId) && !user?.mustChangePassword && options.enabled !== false,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    refetchInterval: TODAY_REFETCH_MS,
  });
}

/**
 * "Now" on the server's clock, ticking every 30 seconds. The offset between
 * the server's `now` and the device clock is measured when the data arrives,
 * so a device with a wrong clock or timezone still shows the school's time.
 *
 * @param serverNow - The response's `now` (ISO), if loaded.
 * @param receivedAt - When that response arrived (react-query's `dataUpdatedAt`).
 * @returns Epoch milliseconds.
 */
export function useSchoolNow(serverNow: string | undefined, receivedAt: number): number {
  const offset = useMemo(() => clockOffset(serverNow, receivedAt), [serverNow, receivedAt]);
  const [tick, setTick] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setTick(Date.now()), CLOCK_TICK_MS);
    return () => clearInterval(id);
  }, []);
  // Re-read the device clock when new data lands, so the offset and the tick agree.
  useEffect(() => setTick(Date.now()), [receivedAt]);
  return tick + offset;
}

/**
 * One week of the teacher's timetable.
 *
 * @param weekStart - Any date in the week, or undefined for the current (at weekends, next) week.
 * @returns The query result; the previous week stays on screen while the next loads.
 */
export function useTimetableWeek(weekStart: string | undefined): UseQueryResult<TimetableWeek, unknown> {
  const { user, schoolId } = useAuth();
  const userId = user?.userId ?? "";
  return useQuery({
    queryKey: queryKeys.timetable.myWeek(schoolId ?? "none", userId || "none", weekStart ?? "current"),
    queryFn: () => todayService.getMyWeek(weekStart),
    enabled: Boolean(schoolId && userId) && !user?.mustChangePassword,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
    placeholderData: keepPreviousData,
  });
}

/** What the taught toggle needs. */
export interface MarkTaughtInput {
  courseId: string;
  week: number;
  termId?: string;
  taught: boolean;
}

/**
 * Sets `topic.taughtAt` on every lesson of a course's week.
 *
 * @param lessons - Lessons to update.
 * @param input - The toggle.
 * @param at - The timestamp to store when marking taught.
 * @returns Updated lessons (unchanged ones are the same objects).
 */
export function applyTaught<L extends Lesson>(lessons: L[], input: MarkTaughtInput, at: string): L[] {
  return lessons.map((lesson) =>
    lesson.course.id === input.courseId && lesson.topic?.week === input.week
      ? { ...lesson, topic: { ...lesson.topic, taughtAt: input.taught ? at : null } }
      : lesson,
  );
}

/**
 * Marks a scheme-of-work week taught (or undoes it). The Today and every
 * loaded timetable week update at once; a failure puts them back.
 *
 * @returns The mutation.
 */
export function useMarkTaught() {
  const queryClient = useQueryClient();
  const { user, schoolId } = useAuth();
  const userId = user?.userId || "none";
  const todayKey = queryKeys.teacher.today(schoolId ?? "none", userId);
  const weeksKey = queryKeys.timetable.myWeeks(schoolId ?? "none", userId);

  return useMutation({
    mutationFn: (input: MarkTaughtInput) =>
      todayService.setTaught(input.courseId, input.week, { taught: input.taught, ...(input.termId ? { termId: input.termId } : {}) }),
    onMutate: async (input) => {
      await Promise.all([queryClient.cancelQueries({ queryKey: todayKey }), queryClient.cancelQueries({ queryKey: weeksKey })]);
      const today = queryClient.getQueryData<TeacherToday>(todayKey);
      const weeks = queryClient.getQueriesData<TimetableWeek>({ queryKey: weeksKey });
      const at = new Date().toISOString();
      if (today) queryClient.setQueryData<TeacherToday>(todayKey, { ...today, lessons: applyTaught(today.lessons, input, at) });
      for (const [key, week] of weeks) {
        if (week) queryClient.setQueryData<TimetableWeek>(key, { ...week, lessons: applyTaught(week.lessons, input, at) });
      }
      return { today, weeks };
    },
    onError: (_error, _input, context) => {
      if (context?.today) queryClient.setQueryData(todayKey, context.today);
      for (const [key, week] of context?.weeks ?? []) queryClient.setQueryData(key, week);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: todayKey });
      void queryClient.invalidateQueries({ queryKey: weeksKey });
    },
  });
}

/**
 * Stores that the teacher finished the tour, then refreshes Today (its setup
 * card) and the settings (which carry the preferences).
 *
 * @returns The mutation.
 */
export function useCompleteTour() {
  const queryClient = useQueryClient();
  const { user, schoolId } = useAuth();
  const userId = user?.userId || "none";
  return useMutation({
    mutationFn: todayService.completeTour,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.teacher.today(schoolId ?? "none", userId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.settings.teacher(user?.userId ?? "") });
    },
  });
}
