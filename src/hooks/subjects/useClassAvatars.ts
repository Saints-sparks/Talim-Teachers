"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { studentsService } from "@/app/services/students/students.service";
import { toStudentPreview, type StudentPreview } from "@/hooks/curriculum/useClassPreview";
import { queryKeys, staleTimes } from "@/lib/queryKeys";
import { useSchoolId } from "@/hooks/useSchoolId";

/** How many avatars a card shows. */
export const AVATAR_COUNT = 3;

/**
 * Up to three students of a class for the avatar stack on a subject card.
 * Each card asks for its own class, and courses of one class share a single
 * cached request; the cards render at once and the avatars fill in. The stack
 * is decorative, so a failure quietly leaves it empty instead of failing the card.
 *
 * @param classId - The course's class; idle without one.
 * @returns The query result; `data` holds at most three previews.
 */
export function useClassAvatars(classId: string): UseQueryResult<StudentPreview[], unknown> {
  const schoolId = useSchoolId();

  return useQuery({
    queryKey: queryKeys.students.list(schoolId ?? "none", { classId, preview: AVATAR_COUNT }),
    queryFn: async () => {
      const students = await studentsService.previewByClass(classId, AVATAR_COUNT);
      return students.slice(0, AVATAR_COUNT).map((student) => toStudentPreview(student));
    },
    enabled: Boolean(schoolId && classId),
    staleTime: staleTimes.reference,
    retry: false,
  });
}
