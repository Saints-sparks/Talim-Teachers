"use client";

import { useMemo } from "react";
import { Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { computeAttendanceStats, filterRoster } from "@/app/services/attendance/attendance.helpers";
import type { ClassAttendanceStatus } from "@/types/attendance";
import { AttendanceStatCards } from "./AttendanceStatCards";
import { StudentStatusCard } from "./StudentStatusCard";

interface ViewAttendancePanelProps {
  status: ClassAttendanceStatus;
  searchQuery: string;
  onViewAnalytics: (studentId: string) => void;
}

/**
 * The read-only "View" mode: today's overview and each student's recorded
 * status. Available to every role that can open the class.
 *
 * @param props - Component props.
 * @returns The view.
 */
export function ViewAttendancePanel({ status, searchQuery, onViewAnalytics }: ViewAttendancePanelProps) {
  const stats = useMemo(() => computeAttendanceStats(status.students), [status.students]);
  const visible = useMemo(() => filterRoster(status.students, searchQuery), [status.students, searchQuery]);

  if (visible.length === 0) {
    return (
      <Card className="p-8 sm:p-12 text-center border-[#F0F0F0] dark:bg-[#0F172A] dark:border-[#263A5C]">
        <CardContent>
          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-[#F8F8F8] rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 dark:bg-[#111C31]">
            <Search className="w-6 h-6 sm:w-8 sm:h-8 text-[#878787]" />
          </div>
          <h3 className="text-lg sm:text-xl font-semibold text-[#030E18] mb-2 dark:text-slate-100">No Students Found</h3>
          <p className="text-[#878787] text-sm sm:text-base dark:text-slate-400">
            {searchQuery ? "No students match your search criteria" : "No students found for this class"}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="bg-white rounded-xl border border-[#F0F0F0] p-4 sm:p-5 dark:bg-[#0F172A] dark:border-[#263A5C]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <h3 className="text-lg font-semibold text-[#030E18] dark:text-slate-100">Today’s Overview</h3>
          <span className="text-xs text-[#6F6F6F] bg-[#F8F8F8] px-2 py-1 rounded-full w-fit dark:bg-[#111C31] dark:text-slate-300">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </span>
        </div>
        <AttendanceStatCards stats={stats} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
        {visible.map((student) => (
          <StudentStatusCard key={student.studentId} student={student} onViewAnalytics={onViewAnalytics} />
        ))}
      </div>
    </div>
  );
}
