"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Layout from "@/components/Layout";
import { SubjectsScreen } from "@/components/subjects/SubjectsScreen";
import { parseSubjectsParams } from "@/hooks/subjects/scheme.logic";

/**
 * Reads `?courseId=&tab=plan|resources&upload=1&week=` for the subject, tab
 * and week to open, and whether to open the upload sheet.
 *
 * @returns The screen.
 */
function SubjectsFromQuery() {
  const params = useSearchParams();
  const { courseId, tab, week, upload } = parseSubjectsParams({
    courseId: params.get("courseId"),
    tab: params.get("tab"),
    week: params.get("week"),
    upload: params.get("upload"),
  });
  return <SubjectsScreen initialCourseId={courseId} initialTab={tab} initialWeek={week} initialUpload={upload} />;
}

/**
 * Subjects (`/subjects?courseId=&tab=&upload=1&week=`): the scheme of work and the
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
