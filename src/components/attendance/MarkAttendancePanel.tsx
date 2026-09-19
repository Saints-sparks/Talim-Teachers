"use client";

import { useMemo } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  computeAttendanceStats,
  filterRoster,
  orderForMarking,
} from "@/app/services/attendance/attendance.helpers";
import { useAttendanceMarking } from "@/hooks/attendance/useAttendanceMarking";
import type { ClassAttendanceStatus } from "@/types/attendance";
import { AttendanceStatCards } from "./AttendanceStatCards";
import { StudentMarkCard } from "./StudentMarkCard";

interface MarkAttendancePanelProps {
  classId: string;
  status: ClassAttendanceStatus;
  searchQuery: string;
}

/**
 * The "Mark" mode: counters, then one card per student with Present/Absent and
 * a per-student submit. Students still to be marked come first. A banner offers
 * "Retry all" when marks could not be sent, and another explains why nothing
 * can be sent while the current term has not loaded.
 *
 * @param props - Component props.
 * @returns The marking view.
 */
export function MarkAttendancePanel({ classId, status, searchQuery }: MarkAttendancePanelProps) {
  const marking = useAttendanceMarking(classId, status);
  const stats = useMemo(() => computeAttendanceStats(status.students), [status.students]);
  const visible = useMemo(
    () => orderForMarking(filterRoster(status.students, searchQuery)),
    [status.students, searchQuery],
  );

  if (status.students.length === 0) {
    return (
      <Card className="p-6 sm:p-8 text-center border-[#F0F0F0] dark:bg-[#0F172A] dark:border-[#263A5C]">
        <CardContent>
          <p className="text-[#878787] text-sm sm:text-base dark:text-slate-400">No students found for this class</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      {marking.termFailed && (
        <div
          role="alert"
          className="flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between dark:border-amber-500/50 dark:bg-[#2B2306] dark:text-amber-100"
        >
          <span className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            The current term didn&apos;t load, so marks can&apos;t be sent yet. What you choose is kept.
          </span>
          <button
            type="button"
            onClick={marking.retryTerm}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-amber-300 px-3 py-1.5 font-medium hover:bg-amber-100 dark:border-amber-500/60 dark:hover:bg-amber-900/40"
          >
            <RefreshCw className="h-4 w-4" />
            Reload term
          </button>
        </div>
      )}

      {marking.failedCount > 0 && (
        <div
          role="alert"
          className="flex flex-col gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 sm:flex-row sm:items-center sm:justify-between dark:border-red-400/60 dark:bg-[#351012] dark:text-red-200"
        >
          <span className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {marking.failedCount === 1
              ? "1 mark didn't send. It's kept on its card."
              : `${marking.failedCount} marks didn't send. They're kept on their cards.`}
          </span>
          <button
            type="button"
            onClick={() => void marking.retryFailed()}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-300 px-3 py-1.5 font-medium hover:bg-red-100 dark:border-red-400/60 dark:hover:bg-red-900/40"
          >
            <RefreshCw className="h-4 w-4" />
            Retry all
          </button>
        </div>
      )}

      <div
        className="rounded-2xl border border-[#E6EDF5] bg-gradient-to-br from-[#F6F9FC] via-white to-[#F8FBFF] p-4 sm:p-5 dark:from-[#101B30] dark:via-[#0F172A] dark:to-[#101B30] dark:border-[#263A5C]"
        data-guide="attendance-overview"
      >
        <AttendanceStatCards stats={stats} />
      </div>

      {visible.length === 0 ? (
        <p className="py-8 text-center text-sm text-[#878787] dark:text-slate-400">No students match your search.</p>
      ) : (
        <div
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4"
          data-guide="attendance-student-cards"
        >
          {visible.map((student) => (
            <StudentMarkCard
              key={student.studentId}
              student={student}
              draft={marking.drafts[student.studentId]}
              row={marking.rows[student.studentId]}
              termReady={marking.termReady}
              onStatus={marking.setStatus}
              onReason={marking.setReason}
              onSubmit={(id) => void marking.submit(id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
