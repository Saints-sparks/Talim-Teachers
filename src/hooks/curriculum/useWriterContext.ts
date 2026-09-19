"use client";

import { useMemo } from "react";
import { useAppContext } from "@/app/context/AppContext";
import { idOf, type WriterContext } from "./access";

/**
 * The signed-in user as far as write access is concerned: their role, the ids
 * a record's owner may be stored under, and the courses they teach.
 *
 * @returns A memoised {@link WriterContext}; `taughtCourseIds` is `null` until
 *   the teacher record has loaded, so callers hide write controls rather than
 *   flash them.
 */
export function useWriterContext(): WriterContext {
  const { user, teacherData, isLoading } = useAppContext();

  return useMemo(() => {
    const ownIds = [user?.userId, user?.teacherId, teacherData?._id].filter((id): id is string => Boolean(id));
    const assigned = teacherData?.assignedCourses;
    const taughtCourseIds = Array.isArray(assigned)
      ? assigned.map((course) => idOf(course)).filter(Boolean)
      : isLoading || !teacherData
        ? null
        : [];
    return { role: user?.role, ownIds, taughtCourseIds };
  }, [user?.role, user?.userId, user?.teacherId, teacherData, isLoading]);
}
