"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Layout from "@/components/Layout";
import { SubjectsScreen } from "@/components/subjects/SubjectsScreen";
import { parseSubjectsParams } from "@/hooks/subjects/scheme.logic";

/**
 * Reads `?courseId=&tab=plan|resources&week=` for the subject, tab and week to open.
 *
 * @returns The screen.
 */
function SubjectsFromQuery() {
  const params = useSearchParams();
  const { courseId, tab, week } = parseSubjectsParams({ courseId: params.get("courseId"), tab: params.get("tab"), week: params.get("week") });
  return <SubjectsScreen initialCourseId={courseId} initialTab={tab} initialWeek={week} />;
}

/**
 * Subjects (`/subjects?courseId=&tab=&week=`): the scheme of work and the
 * resources of each subject the teacher teaches. Data:
 * `GET /scheme-of-work/me`, `GET /scheme-of-work/course/:courseId` and
 * `GET /resources/course/:courseId`.
 *
 * @returns The page.
 */
export default function SubjectsPage() {
  return (
    <Layout>
      <Suspense fallback={null}>
        <SubjectsFromQuery />
      </Suspense>
    </Layout>
  );
}
