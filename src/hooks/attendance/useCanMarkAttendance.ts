"use client";

import { useAuth } from "@/app/context/AuthContext";
import { canMarkAttendance } from "@/app/services/attendance/attendance.helpers";

/**
 * Whether the signed-in user may record attendance. The backend only accepts
 * marks from the `teacher` role, so a sub-admin who signs in to this portal
 * gets the read-only view and never sees a control that would answer 403.
 *
 * @returns True when the "Mark" mode and submit buttons should be shown.
 */
export function useCanMarkAttendance(): boolean {
  return canMarkAttendance(useAuth().user?.role);
}
