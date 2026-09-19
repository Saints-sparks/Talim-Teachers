"use client";

import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { initialsOf } from "@/app/services/attendance/attendance.helpers";
import type { StudentAttendanceStatus } from "@/types/attendance";
import { formatRecordedTime, statusStyle } from "./statusStyles";

interface StudentStatusCardProps {
  student: StudentAttendanceStatus;
  onViewAnalytics: (studentId: string) => void;
}

/**
 * One student in the read-only "View" mode: today's recorded status (or
 * "Attendance Pending") and a link into their analytics.
 *
 * @param props - Component props.
 * @returns The student card.
 */
export function StudentStatusCard({ student, onViewAnalytics }: StudentStatusCardProps) {
  const style = statusStyle(student.attendanceStatus);
  const time = formatRecordedTime(student.recordedAt);

  return (
    <Card className="group hover:shadow-md transition-all duration-300 border-[#F0F0F0] hover:border-[#003366]/30 overflow-hidden bg-white dark:bg-[#0F172A] dark:border-[#263A5C] dark:hover:border-blue-400/50">
      <CardHeader className="pb-3 bg-white border-b border-[#F0F0F0] dark:bg-[#0F172A] dark:border-[#263A5C]">
        <div className="text-center">
          <div className="relative inline-flex">
            <div className="w-11 h-11 bg-gradient-to-br from-[#003366] to-[#004080] rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-sm">
              {initialsOf(student.firstName, student.lastName)}
            </div>
            {student.attendanceMarked && (
              <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${style.dot}`} />
            )}
          </div>
          <CardTitle className="mt-2 text-sm font-semibold text-[#030E18] truncate dark:text-slate-100">
            {student.firstName} {student.lastName}
          </CardTitle>
          <p className="text-xs text-[#6F6F6F] truncate dark:text-slate-400">{student.email}</p>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="space-y-3">
          {student.attendanceMarked ? (
            <div className={`p-3 rounded-lg border transition-all duration-300 ${style.panel}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${style.dot}`} />
                  <span className="font-semibold text-xs text-[#030E18] dark:text-slate-100">Attendance Status</span>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${style.pill}`}>
                  {student.attendanceStatus}
                </span>
              </div>
              {time && (
                <p className="text-xs text-[#6F6F6F] flex items-center gap-2 dark:text-slate-300">
                  <span className="font-medium">Time:</span>
                  {time}
                </p>
              )}
              {student.absenceReason && (
                <p className="mt-1 text-xs text-[#6F6F6F] dark:text-slate-300">
                  <span className="font-medium">Reason:</span> {student.absenceReason}
                </p>
              )}
            </div>
          ) : (
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg dark:bg-[#2A1000] dark:border-orange-400/70">
              <div className="text-center">
                <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-2 dark:bg-orange-900/50">
                  <div className="w-2 h-2 bg-orange-500 rounded-full" />
                </div>
                <span className="text-orange-700 font-semibold text-xs block mb-1 dark:text-orange-300">
                  Attendance Pending
                </span>
                <p className="text-xs text-orange-600 dark:text-orange-300/80">No attendance recorded for today</p>
              </div>
            </div>
          )}

          <Button
            onClick={() => onViewAnalytics(student.studentId)}
            className="w-full bg-[#003366] hover:bg-[#002244] text-white transition-all duration-200 font-medium py-2.5 text-sm shadow-none"
            size="sm"
          >
            <Eye size={16} className="mr-2" />
            <span className="hidden sm:inline">View Analytics</span>
            <span className="sm:hidden">Analytics</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
