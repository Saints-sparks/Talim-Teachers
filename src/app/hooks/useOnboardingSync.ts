"use client";

import { useCallback } from "react";
import { useTeacherOnboarding } from "@/app/context/OnboardingContext";
import { useAppContext } from "@/app/context/AppContext";
import { fetchResources, getClassAttendanceStatus } from "@/app/services/api.service";
import { getCurricula } from "@/app/services/curriculum.services";
import { getChatRooms } from "@/app/services/chat.service";
import { extractTotal, listAnnouncements, listNotifications } from "@/app/services/notifications.service";
import { logger } from "@/lib/logger";
import type { ChatRoom } from "@/types/chat";

/**
 * Whether a chat room is a group (class, course or custom) rather than a
 * one-to-one conversation.
 *
 * @param room - A room from `GET /chat/rooms`.
 * @returns True for group rooms.
 */
const isGroupRoom = (room: ChatRoom & { roomType?: string }): boolean => {
  const type = String(room.type || room.roomType || "").toLowerCase();
  return type.includes("group") || Boolean(room.classId || room.courseId);
};

/**
 * Logs a failed onboarding check and moves on: a check that cannot be read
 * just leaves its step unticked until the next sync.
 *
 * @param scope - Which check failed.
 * @returns A catch handler for that check's promise.
 */
const skipCheck = (scope: string) => (error: unknown) => {
  logger.debug("onboarding", `${scope} check skipped`, error);
};

/**
 * Ticks the onboarding checklist from what the teacher has actually done —
 * a profile name, an uploaded resource, a curriculum, a group chat, any
 * notification, a marked attendance register.
 *
 * @returns `syncProgress`, which runs every check in parallel and resolves
 * when they have all settled. It never rejects: a failed check is skipped.
 */
export function useOnboardingSync() {
  const { user, classes } = useAppContext();
  const { markStepComplete } = useTeacherOnboarding();

  const syncProgress = useCallback(async () => {
    const userId = user?.userId || user?._id || user?.id;
    // Every probe would be refused while a temporary password is still in use.
    if (!userId || user?.mustChangePassword) return;

    if (user?.firstName && user?.lastName) {
      markStepComplete("teacher-profile");
    }

    const checks: Array<Promise<void>> = [
      fetchResources(undefined, userId)
        .then((resources) => {
          if (resources.length > 0) markStepComplete("upload-resource");
        })
        .catch(skipCheck("resources")),
      getCurricula({ teacherId: userId })
        .then((curricula) => {
          if (curricula.length > 0) markStepComplete("create-curriculum");
        })
        .catch(skipCheck("curriculum")),
      getChatRooms()
        .then((rooms) => {
          if (rooms.some(isGroupRoom)) markStepComplete("create-group-chat");
        })
        .catch(skipCheck("chat")),
      // The teacher has been exposed to the notifications feature once either
      // list holds anything.
      Promise.allSettled([listAnnouncements(userId, { limit: 1 }), listNotifications(userId, { limit: 1 })])
        .then((results) => {
          const hasAny = results.some((result) => result.status === "fulfilled" && extractTotal(result.value) > 0);
          if (hasAny) markStepComplete("view-notifications");
        })
        .catch(skipCheck("notifications")),
    ];

    const classIds = (classes || [])
      .map((classItem: { _id?: string; id?: string } | null) => classItem?._id || classItem?.id)
      .filter((id): id is string => Boolean(id));

    if (classIds.length > 0) {
      checks.push(
        Promise.all(classIds.map((classId) => getClassAttendanceStatus(classId).catch(() => null))).then((statuses) => {
          const hasMarkedAttendance = statuses.some((status) =>
            (status?.students || []).some((student) => student.attendanceMarked),
          );
          if (hasMarkedAttendance) markStepComplete("mark-attendance");
        }),
      );
    }

    await Promise.all(checks);
  }, [classes, markStepComplete, user]);

  return { syncProgress };
}
