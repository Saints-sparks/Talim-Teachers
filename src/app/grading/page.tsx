"use client";

import React, { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Layout from "@/components/Layout";
import { GradingScreen, type GradingLink } from "@/components/grading/GradingScreen";
import type { ReportTab } from "@/components/grading/ClassReport";

const TABS: readonly ReportTab[] = ["subjects", "summary", "remarks"];

/**
 * Reads `?courseId=&assessmentId=` (Today's attention links),
 * `?mode=class&classId=&tab=` and `?termId=`.
 *
 * @returns The screen.
 */
function GradingFromQuery() {
  const params = useSearchParams();
  const courseId = params.get("courseId") || undefined;
  const assessmentId = params.get("assessmentId") || undefined;
  const mode = params.get("mode");
  const classId = params.get("classId") || undefined;
  const termId = params.get("termId") || undefined;
  const tab = params.get("tab");
  const link = useMemo<GradingLink>(
    () => ({
      courseId,
      assessmentId,
      mode: mode === "class" || mode === "course" ? mode : undefined,
      classId,
      termId,
      tab: TABS.includes(tab as ReportTab) ? (tab as ReportTab) : undefined,
    }),
    [courseId, assessmentId, mode, classId, termId, tab],
  );
  return <GradingScreen link={link} />;
}

/**
 * Grading (`/grading`): subject scores and, for class teachers, the class
 * report. Data: `GET /teachers/me/classes` and the Round 3 grading routes;
 * see `src/components/grading/GradingScreen.tsx`.
 *
 * @returns The page.
 */
export default function GradingPage() {
  return (
    <Layout>
      <Suspense fallback={null}>
        <GradingFromQuery />
      </Suspense>
    </Layout>
  );
}
