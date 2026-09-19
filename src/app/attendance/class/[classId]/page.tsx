"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Layout from "@/components/Layout";
import LoadingCard from "@/components/LoadingCard";
import { ApiErrorState } from "@/components/states";
import { AttendanceClassHeader, type AttendanceMode } from "@/components/attendance/AttendanceClassHeader";
import { MarkAttendancePanel } from "@/components/attendance/MarkAttendancePanel";
import { ViewAttendancePanel } from "@/components/attendance/ViewAttendancePanel";
import { useCanMarkAttendance } from "@/hooks/attendance/useCanMarkAttendance";
import { useClassAttendanceStatus } from "@/hooks/attendance/useClassAttendanceStatus";
import { getErrorMessage } from "@/lib/apiError";

/** Placeholder cards while the roster loads. */
function RosterSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <LoadingCard key={i} height="h-32" />
      ))}
    </div>
  );
}

/**
 * Attendance for one class. Teachers mark; other roles that can open the class
 * (a promoted sub-admin) only view. Both modes read one cached roster query.
 *
 * @returns The page.
 */
const AttendanceClassPage: React.FC = () => {
  const params = useParams<{ classId: string }>();
  const classId = params?.classId;
  const router = useRouter();
  const canMark = useCanMarkAttendance();
  const [requestedMode, setRequestedMode] = useState<AttendanceMode>("mark-attendance");
  const [searchQuery, setSearchQuery] = useState("");

  const mode: AttendanceMode = canMark ? requestedMode : "view-attendance";
  const roster = useClassAttendanceStatus(classId);
  const status = roster.data;

  return (
    <Layout>
      <div className="min-h-screen bg-[#F8F8F8] dark:bg-[#0F1629]">
        <div className="p-3 sm:p-6">
          <AttendanceClassHeader
            className={status?.className || "Attendance"}
            mode={mode}
            canMark={canMark}
            searchQuery={searchQuery}
            refreshing={roster.isFetching}
            onSearch={setSearchQuery}
            onMode={setRequestedMode}
            onRefresh={() => void roster.refetch()}
            onBack={() => router.push("/attendance")}
          />

          {roster.isError && status && (
            <div
              role="alert"
              className="mb-4 flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between dark:border-amber-500/50 dark:bg-[#2B2306] dark:text-amber-100"
            >
              <span>Couldn&apos;t refresh: {getErrorMessage(roster.error)} Showing the last loaded list.</span>
              <button
                type="button"
                onClick={() => void roster.refetch()}
                className="rounded-lg border border-amber-300 px-3 py-1.5 font-medium hover:bg-amber-100 dark:border-amber-500/60 dark:hover:bg-amber-900/40"
              >
                Try again
              </button>
            </div>
          )}

          {roster.isPending ? (
            <RosterSkeleton />
          ) : roster.isError && !status ? (
            <ApiErrorState
              error={roster.error}
              fallback="We couldn't load this class's attendance."
              onRetry={() => void roster.refetch()}
            />
          ) : status && mode === "mark-attendance" ? (
            <MarkAttendancePanel classId={classId} status={status} searchQuery={searchQuery} />
          ) : status ? (
            <ViewAttendancePanel
              status={status}
              searchQuery={searchQuery}
              onViewAnalytics={(studentId) =>
                router.push(`/analytics/attendance?studentId=${studentId}&classId=${classId}`)
              }
            />
          ) : null}
        </div>
      </div>
    </Layout>
  );
};

export default AttendanceClassPage;
