"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Layout from "@/components/Layout";
import { AttendanceScreen } from "@/components/attendance/AttendanceScreen";

/**
 * Reads `?classId=&date=` and opens that register.
 *
 * @returns The screen.
 */
function AttendanceFromQuery() {
  const params = useSearchParams();
  const classId = params.get("classId") || undefined;
  const date = params.get("date") || undefined;
  return <AttendanceScreen initialClassId={classId} initialDate={date} />;
}

/**
 * Attendance: the morning register (`/attendance?classId=&date=`). Data:
 * `GET /teachers/me/classes` and `GET|PUT /registers/:classId`; see
 * `src/components/attendance/AttendanceScreen.tsx`.
 *
 * @returns The page.
 */
export default function AttendancePage() {
  return (
    <Layout>
      <Suspense fallback={null}>
        <AttendanceFromQuery />
      </Suspense>
    </Layout>
  );
}
