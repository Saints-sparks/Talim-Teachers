"use client";

import { useMemo } from "react";
import { useAppContext } from "@/app/context/AppContext";
import type { ClassLike, CourseLike } from "./display";

/** The teacher's classes and courses, as the resource screens need them. */
export interface TeacherRoster {
  /** Classes the teacher is assigned to or is form teacher of, de-duplicated. */
  classes: ClassLike[];
  /** Courses the teacher teaches. */
  courses: CourseLike[];
  /** True while the teacher record is loading. */
  isLoading: boolean;
}

/**
 * The teacher's roster from the app context, which loads it once per session.
 * The upload modal used to fetch the same two lists again every time it opened.
 *
 * Classes come from both `assignedClasses` and `classTeacherClasses`: the
 * context's own `classes` is `classTeacherClasses || assignedClasses`, and an
 * empty `classTeacherClasses` is truthy, so it hides the assigned classes.
 *
 * @returns The roster.
 */
export function useTeacherRoster(): TeacherRoster {
  const { teacherData, classes, isLoading } = useAppContext();

  return useMemo(() => {
    const lists: ClassLike[][] = [
      (teacherData?.assignedClasses as ClassLike[] | undefined) ?? [],
      (teacherData?.classTeacherClasses as ClassLike[] | undefined) ?? [],
      (classes as ClassLike[] | undefined) ?? [],
    ];
    const seen = new Set<string>();
    const merged: ClassLike[] = [];
    for (const item of lists.flat()) {
      const id = item?._id ?? item?.id ?? "";
      if (id && !seen.has(id)) {
        seen.add(id);
        merged.push(item);
      }
    }
    const courses = (teacherData?.assignedCourses as CourseLike[] | undefined) ?? [];
    return { classes: merged, courses, isLoading };
  }, [teacherData, classes, isLoading]);
}
