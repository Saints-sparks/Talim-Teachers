"use client";

/**
 * Data hooks for the redesigned Students screens.
 *
 * - `useClassRoster`: `GET /teachers/me/classes/:classId/students`.
 * - `useStudentRecord`: `GET /teachers/me/students/:studentId`.
 * - `useMessageGuardian`: opens (or reuses) a direct chat with a guardian and
 *   goes to it in Messages.
 */
import { useMutation, useQuery, type UseQueryResult } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import { startDirectChat } from "@/app/services/chat.service";
import { classroomService } from "@/app/services/classroom/classroom.service";
import { toast } from "@/components/CustomToast";
import { getErrorMessage } from "@/lib/apiError";
import { queryKeys } from "@/lib/queryKeys";
import type { ClassRoster, StudentRecord } from "@/types/classroom";

/**
 * One class's roster with its stats.
 *
 * @param classId - The class, or undefined while none is chosen.
 * @returns The query result.
 */
export function useClassRoster(classId: string | undefined): UseQueryResult<ClassRoster, unknown> {
  const { user, schoolId } = useAuth();
  return useQuery({
    queryKey: queryKeys.classroom.roster(schoolId ?? "none", classId ?? "none"),
    queryFn: () => classroomService.getRoster(classId!),
    enabled: Boolean(schoolId && user?.userId && classId) && !user?.mustChangePassword,
    staleTime: 60_000,
  });
}

/**
 * One student's record.
 *
 * @param studentId - The student.
 * @returns The query result.
 */
export function useStudentRecord(studentId: string | undefined): UseQueryResult<StudentRecord, unknown> {
  const { user, schoolId } = useAuth();
  return useQuery({
    queryKey: queryKeys.classroom.student(schoolId ?? "none", studentId ?? "none"),
    queryFn: () => classroomService.getStudentRecord(studentId!),
    enabled: Boolean(schoolId && user?.userId && studentId) && !user?.mustChangePassword,
    staleTime: 60_000,
    retry: (count, error) => count < 2 && !(error && typeof error === "object" && "status" in error && [403, 404].includes((error as { status: number }).status)),
  });
}

/**
 * "Message" on the guardian card: starts (or reuses) a direct conversation
 * with the guardian's user account, then opens it at `/messages?room=`.
 *
 * @returns The mutation; `mutate(guardianUserId)`.
 */
export function useMessageGuardian() {
  const { user } = useAuth();
  const router = useRouter();
  return useMutation({
    mutationFn: async (guardianUserId: string) => {
      if (!user?.userId) throw new Error("Sign in again to send a message.");
      return startDirectChat(guardianUserId, user.userId);
    },
    onSuccess: (roomId) => router.push(`/messages?room=${encodeURIComponent(roomId)}`),
    onError: (error) => toast.error(getErrorMessage(error, "We could not open the conversation. Please try again.")),
  });
}
