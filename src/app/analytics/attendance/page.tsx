"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Layout from "@/components/Layout";
import { AttendanceHistoryScreen } from "@/components/attendance/AttendanceHistoryScreen";
import { parseHistoryParams } from "@/hooks/attendance/history.logic";

/**
 * Reads `?classId=&from=&to=&studentId=` for the class, the period and the
 * student to highlight.
 *
 * @returns The screen.
 */
function HistoryFromQuery() {
  const params = useSearchParams();
  const initial = parseHistoryParams(params);
  return <AttendanceHistoryScreen initial={initial} />;
}

/**
 * Attendance history (`/analytics/attendance`): one class's attendance over a
 * period, student by student. Opened from Attendance ("History") and from a
 * student's record ("Full attendance history", which highlights them).
 *
 * @returns The page.
 */
export default function AttendanceHistoryPage() {
  return (
    <Layout>
      <Suspense fallback={null}>
        <HistoryFromQuery />
      </Suspense>
    </Layout>
  );
}
