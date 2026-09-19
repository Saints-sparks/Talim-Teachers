"use client";

import { useAppContext } from "@/app/context/AppContext";
import type { SubjectCourse } from "./subjects.logic";

/** What {@link useTeacherSubjects} returns. */
export interface TeacherSubjects {
  subjects: SubjectCourse[];
  /** The teacher record is still loading. */
  isLoading: boolean;
  /** Re-reads the teacher record (and with it the roster). */
  refresh: () => Promise<void>;
}

/**
 * The courses the signed-in teacher is assigned to. They come from the teacher
 * record the app loads once at sign-in — the subjects page used to fetch that
 * same record again on every visit.
 *
 * @returns The courses, the loading flag and a refresh action.
 */
export function useTeacherSubjects(): TeacherSubjects {
  const { teacherData, isLoading, refreshClasses } = useAppContext();
  const assigned = teacherData?.assignedCourses;
  const subjects = Array.isArray(assigned) ? (assigned as SubjectCourse[]) : [];
  return { subjects, isLoading, refresh: refreshClasses };
}
