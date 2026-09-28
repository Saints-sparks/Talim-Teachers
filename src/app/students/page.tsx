"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Layout from "@/components/Layout";
import { StudentsScreen } from "@/components/students/StudentsScreen";

/**
 * Reads `?classId=` for the tab to open.
 *
 * @returns The screen.
 */
function StudentsFromQuery() {
  const params = useSearchParams();
  return <StudentsScreen initialClassId={params.get("classId") || undefined} />;
}

/**
 * Students (`/students?classId=`): the classes the teacher teaches and their
 * rosters. Data: `GET /teachers/me/classes` and
 * `GET /teachers/me/classes/:classId/students`.
 *
 * @returns The page.
 */
export default function StudentsPage() {
  return (
    <Layout>
      <Suspense fallback={null}>
        <StudentsFromQuery />
      </Suspense>
    </Layout>
  );
}
