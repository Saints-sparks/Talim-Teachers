"use client";

import { Check, Loader2, RefreshCw, Send, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { initialsOf, type DraftMark } from "@/app/services/attendance/attendance.helpers";
import type { RowState } from "@/hooks/attendance/useAttendanceMarking";
import type { MarkableStatus, StudentAttendanceStatus } from "@/types/attendance";
import { formatRecordedTime, statusStyle } from "./statusStyles";

interface StudentMarkCardProps {
  student: StudentAttendanceStatus;
  draft: DraftMark | undefined;
  row: RowState | undefined;
  /** The current term is loaded, so a mark can be sent. */
  termReady: boolean;
  onStatus: (studentId: string, status: MarkableStatus) => void;
  onReason: (studentId: string, reason: string) => void;
  onSubmit: (studentId: string) => void;
}

/**
 * One student on the marking grid. Before a mark is stored it offers
 * Present/Absent, a reason box for absences and a submit button that shows
 * "Submitting…" while the request is out (and ignores taps), and "Retry" with
 * the reason when it failed — the chosen status and reason stay put either way.
 * After a mark is stored it shows the recorded status.
 *
 * @param props - Component props.
 * @returns The student card.
 */
export function StudentMarkCard({ student, draft, row, termReady, onStatus, onReason, onSubmit }: StudentMarkCardProps) {
  const name = `${student.firstName} ${student.lastName}`.trim();
  const isAbsent = draft?.status === "Absent";
  const reasonMissing = isAbsent && !(draft?.reason ?? "").trim();
  const submitting = row?.phase === "submitting";
  const failed = row?.phase === "failed";
  const canSubmit = Boolean(draft?.status) && !reasonMissing && !submitting && termReady && row?.retryable !== false;

  return (
    <Card className="overflow-hidden border transition-all duration-200 border-[#F0F0F0] bg-white hover:border-[#003366]/20 dark:bg-[#0F172A] dark:border-[#263A5C] dark:hover:border-blue-400/50">
      <CardContent className="p-3 sm:p-4">
        <div className="mb-3 text-center">
          <div className="mx-auto mb-2 w-10 h-10 bg-gradient-to-r from-[#003366] to-[#004080] rounded-full flex items-center justify-center text-white font-semibold text-sm">
            {initialsOf(student.firstName, student.lastName)}
          </div>
          <h3 className="font-semibold text-[#030E18] text-sm sm:text-base truncate dark:text-slate-100">{name}</h3>
          {student.attendanceMarked && formatRecordedTime(student.recordedAt) && (
            <p className="mt-1 text-xs text-[#878787] dark:text-slate-400">
              Marked at {formatRecordedTime(student.recordedAt)}
            </p>
          )}
        </div>

        {student.attendanceMarked ? (
          <>
            <div className="flex justify-center">
              <span
                className={`px-3 py-1.5 rounded-md text-xs font-medium ${statusStyle(student.attendanceStatus).pill}`}
              >
                {student.attendanceStatus}
              </span>
            </div>
            {student.absenceReason && (
              <div className="mt-3 p-2.5 bg-yellow-50 border border-yellow-200 rounded-md dark:bg-[#2B2306] dark:border-yellow-500/50">
                <p className="text-xs text-yellow-800 dark:text-yellow-200">
                  <strong>Reason for absence:</strong> {student.absenceReason}
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <button
                type="button"
                disabled={submitting}
                aria-pressed={draft?.status === "Present"}
                onClick={() => onStatus(student.studentId, "Present")}
                className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-md font-medium transition-all duration-200 text-sm disabled:opacity-60 ${
                  draft?.status === "Present"
                    ? "bg-green-600 text-white"
                    : "bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 dark:bg-[#062B1A] dark:text-green-300 dark:border-green-500/60 dark:hover:bg-green-900/40"
                }`}
              >
                <Check className="w-4 h-4" />
                Present
              </button>
              <button
                type="button"
                disabled={submitting}
                aria-pressed={isAbsent}
                onClick={() => onStatus(student.studentId, "Absent")}
                className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-md font-medium transition-all duration-200 text-sm disabled:opacity-60 ${
                  isAbsent
                    ? "bg-red-600 text-white"
                    : "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 dark:bg-[#351012] dark:text-red-300 dark:border-red-400/60 dark:hover:bg-red-900/40"
                }`}
              >
                <X className="w-4 h-4" />
                Absent
              </button>
            </div>

            {isAbsent && (
              <div className="space-y-2">
                <label
                  htmlFor={`reason-${student.studentId}`}
                  className="text-xs font-medium text-red-700 block dark:text-red-300"
                >
                  Reason for Absence *
                </label>
                <textarea
                  id={`reason-${student.studentId}`}
                  value={draft?.reason ?? ""}
                  disabled={submitting}
                  onChange={(e) => onReason(student.studentId, e.target.value)}
                  placeholder="Enter reason for absence..."
                  className="w-full p-2.5 border border-red-200 rounded-md bg-red-50 text-red-900 placeholder-red-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none text-sm dark:bg-[#351012] dark:text-red-100 dark:placeholder-red-300/60 dark:border-red-400/60"
                  rows={2}
                />
              </div>
            )}

            {failed && row?.message && (
              <p role="alert" className="text-xs text-red-700 dark:text-red-300">
                {row.message}
              </p>
            )}

            <button
              type="button"
              onClick={() => onSubmit(student.studentId)}
              disabled={!canSubmit}
              className={`w-full px-3 py-2.5 rounded-md font-medium transition-all duration-200 flex items-center justify-center gap-2 text-sm ${
                canSubmit
                  ? "bg-[#003366] text-white hover:bg-[#002244]"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-slate-700 dark:text-slate-400"
              }`}
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : failed ? (
                <RefreshCw className="w-4 h-4" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">
                {submitting ? "Submitting…" : failed ? "Retry" : isAbsent ? "Submit with Reason" : "Submit Attendance"}
              </span>
              <span className="sm:hidden">{submitting ? "Sending…" : failed ? "Retry" : "Submit"}</span>
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
