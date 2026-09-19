"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchCourseById, getStudentsByClass } from "@/app/services/api.service";
import { queryKeys, staleTimes } from "@/lib/queryKeys";
import { useSchoolId } from "@/hooks/useSchoolId";
import { idOf } from "./access";

/** One student in the avatar stack on the curriculum view. */
export interface StudentPreview {
  src?: string;
  initials: string;
  name: string;
}

/** Just the parts of a student record the avatar stack reads. */
interface StudentLike {
  userId?: { firstName?: string; lastName?: string; userAvatar?: string } | string;
  firstName?: string;
  lastName?: string;
  userAvatar?: string;
  avatar?: string;
}

/**
 * Turns a student record into what the avatar stack draws.
 *
 * @param student - A student from `GET /students/by-class/:id`.
 * @returns The avatar source, initials and display name.
 */
export function toStudentPreview(student: StudentLike): StudentPreview {
  const user = typeof student.userId === "object" && student.userId ? student.userId : undefined;
  const firstName = user?.firstName || student.firstName || "";
  const lastName = user?.lastName || student.lastName || "";
  return {
    src: user?.userAvatar || student.userAvatar || student.avatar,
    initials: `${firstName[0] || ""}${lastName[0] || ""}`.toUpperCase() || "ST",
    name: `${firstName} ${lastName}`.trim() || "Student",
  };
}

/**
 * Up to three students of the class a course belongs to, for the avatar stack
 * on the curriculum view. Purely decorative, so a failure quietly yields no
 * avatars instead of blocking the page.
 *
 * @param courseId - The course, or `null` while unknown.
 * @returns The query result; `data` is a list of at most three previews.
 */
export function useClassPreview(courseId: string | null) {
  const schoolId = useSchoolId();

  return useQuery({
    queryKey: queryKeys.students.byCourse(schoolId ?? "none", courseId ?? ""),
    queryFn: async (): Promise<StudentPreview[]> => {
      const course = await fetchCourseById(courseId as string);
      const classId = idOf(course?.classId);
      if (!classId) return [];
      const students = await getStudentsByClass(classId);
      return students.slice(0, 3).map((student) => toStudentPreview(student as unknown as StudentLike));
    },
    enabled: Boolean(schoolId && courseId),
    staleTime: staleTimes.reference,
    retry: false,
  });
}
