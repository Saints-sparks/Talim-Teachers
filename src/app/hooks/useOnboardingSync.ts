"use client";

import { useCallback } from "react";
import { useAuth } from "./useAuth";
import { useTeacherOnboarding } from "@/app/context/OnboardingContext";
import { useAppContext } from "@/app/context/AppContext";
import {
  fetchResources,
  getClassAttendanceStatus,
} from "@/app/services/api.service";
import { getCurricula } from "@/app/services/curriculum.services";
import { getChatRooms } from "@/app/services/chat.service";

const isGroupRoom = (room: any) => {
  const type = String(room?.type || room?.roomType || "").toLowerCase();
  return type.includes("group") || Boolean(room?.classId || room?.courseId);
};

export function useOnboardingSync() {
  const { getAccessToken } = useAuth();
  const { user, classes } = useAppContext();
  const { markStepComplete } = useTeacherOnboarding();

  const syncProgress = useCallback(async () => {
    const token = getAccessToken();
    const userId = user?.userId || user?._id || user?.id;
    if (!token || !userId) return;

    if (user?.firstName && user?.lastName) {
      markStepComplete("teacher-profile");
    }

    const checks: Array<Promise<void>> = [
      fetchResources(token, userId)
        .then((resources) => {
          if (Array.isArray(resources) && resources.length > 0) {
            markStepComplete("upload-resource");
          }
        })
        .catch(() => {}),
      getCurricula({ teacherId: userId }, token)
        .then((curricula) => {
          if (Array.isArray(curricula) && curricula.length > 0) {
            markStepComplete("create-curriculum");
          }
        })
        .catch(() => {}),
      getChatRooms(token)
        .then((rooms) => {
          if (Array.isArray(rooms) && rooms.some(isGroupRoom)) {
            markStepComplete("create-group-chat");
          }
        })
        .catch(() => {}),
    ];

    const classIds = (classes || [])
      .map((classItem: any) => classItem?._id || classItem?.id)
      .filter(Boolean)
      .slice(0, 3);

    if (classIds.length > 0) {
      checks.push(
        Promise.all(
          classIds.map((classId: string) =>
            getClassAttendanceStatus(classId, token).catch(() => null)
          )
        ).then((statuses) => {
          const hasMarkedAttendance = statuses.some((status: any) =>
            (status?.students || []).some((student: any) => student?.attendanceMarked)
          );

          if (hasMarkedAttendance) {
            markStepComplete("mark-attendance");
          }
        })
      );
    }

    await Promise.all(checks);
  }, [classes, getAccessToken, markStepComplete, user]);

  return { syncProgress };
}
