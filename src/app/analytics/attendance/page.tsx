"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import LoadingCard from "@/components/LoadingCard";
import { ApiErrorState, ErrorState } from "@/components/states";
import { StudentAttendanceSummary } from "@/components/attendance/StudentAttendanceSummary";
import { useStudentAttendanceKpis } from "@/hooks/attendance/useStudentAttendanceKpis";

/** The page frame shared by every state. */
function Frame({ children, onBack }: { children: React.ReactNode; onBack: () => void }) {
  return (
    <Layout>
      <div className="space-y-1 bg-[#F8F8F8] text-black min-h-screen dark:bg-[#0F1629] dark:text-slate-100">
        <div className="h-full flex-1 flex-col space-y-8 p-4 sm:p-8 flex">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              aria-label="Go back"
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 dark:text-slate-300 dark:hover:text-white"
            >
              <ArrowLeft size={16} />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Attendance Analytics</h1>
              <p className="text-gray-600 dark:text-slate-400">Detailed attendance insights for one student</p>
            </div>
          </div>
          {children}
        </div>
      </div>
    </Layout>
  );
}

/**
 * One student's attendance analytics, opened from the class attendance page
 * with `?studentId=`. Every failure is shown as itself: an offline device, a
 * student the caller cannot see (404) and a missing id are different messages.
 *
 * @returns The page content.
 */
const AttendanceAnalyticsContent: React.FC = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const studentId = searchParams.get("studentId");
  const kpis = useStudentAttendanceKpis(studentId);
  const back = () => router.back();

  if (!studentId) {
    return (
      <Frame onBack={back}>
        <ErrorState title="No student selected" message="Open this page from a student's card on the attendance screen." />
      </Frame>
    );
  }

  return (
    <Frame onBack={back}>
      {kpis.isPending ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <LoadingCard key={i} height="h-32" />
          ))}
        </div>
      ) : kpis.isError ? (
        <ApiErrorState
          error={kpis.error}
          fallback="We couldn't load this student's attendance."
          onRetry={() => void kpis.refetch()}
        />
      ) : (
        <StudentAttendanceSummary kpis={kpis.data} />
      )}
    </Frame>
  );
};

/**
 * Wraps the content in `Suspense`, which `useSearchParams` requires.
 *
 * @returns The page.
 */
const AttendanceAnalyticsPage: React.FC = () => (
  <Suspense fallback={<LoadingCard />}>
    <AttendanceAnalyticsContent />
  </Suspense>
);

export default AttendanceAnalyticsPage;
