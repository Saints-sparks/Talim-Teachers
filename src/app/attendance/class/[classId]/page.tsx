"use client";

import { Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Layout from "@/components/Layout";
import { AttendanceScreen } from "@/components/attendance/AttendanceScreen";

/**
 * Reads the class from the path and `?date=` from the query.
 *
 * @returns The screen.
 */
function AttendanceForClass() {
  const params = useParams<{ classId: string }>();
  const search = useSearchParams();
  const classId = params?.classId ? decodeURIComponent(params.classId) : undefined;
  const date = search.get("date") || undefined;
  return <AttendanceScreen initialClassId={classId} initialDate={date} />;
}

/**
 * `/attendance/class/:classId?date=`, where Today's "Take register" and
 * attention items link: the same Attendance screen, opened on that class and
 * day. Picking another class or day moves the address to
 * `/attendance?classId=&date=`.
 *
 * @returns The page.
 */
export default function AttendanceClassPage() {
  return (
    <Layout>
      <Suspense fallback={null}>
        <AttendanceForClass />
      </Suspense>
    </Layout>
  );
}
