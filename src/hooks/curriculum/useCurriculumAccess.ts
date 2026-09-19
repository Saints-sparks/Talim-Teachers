"use client";

import { canWriteForCourse } from "./access";
import { useWriterContext } from "./useWriterContext";

/** What the signed-in user may do with a course's curriculum. */
export interface CurriculumAccess {
  /** May create a curriculum for the course. */
  canCreate: boolean;
  /** May edit or delete the curriculum. */
  canModify: boolean;
  /** False until the teacher's roster has loaded and the answer above is final. */
  isReady: boolean;
}

/**
 * Curriculum write access for one course. Teachers write for courses they
 * teach; sub-admins are shown the controls and the API enforces
 * `manage:curriculum` (see `./access`).
 *
 * @param courseId - The course the curriculum belongs to.
 * @returns What the user may do; both false (and `isReady` false) while the roster loads.
 */
export function useCurriculumAccess(courseId: string | null): CurriculumAccess {
  const writer = useWriterContext();
  // `by-course-term` does not return the author, so ownership is judged on the
  // course: the API allows the author or a teacher of the course, and a teacher
  // reaches this page from a course they teach.
  const allowed = canWriteForCourse(writer, courseId ?? "");
  return { canCreate: allowed, canModify: allowed, isReady: writer.role === "school_sub_admin" || writer.taughtCourseIds !== null };
}
