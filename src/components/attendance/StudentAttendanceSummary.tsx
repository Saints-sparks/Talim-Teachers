import { Calendar, CheckCircle, TrendingUp, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { attendanceBand, initialsOf, type AttendanceBand } from "@/app/services/attendance/attendance.helpers";
import type { StudentAttendanceKpis } from "@/types/attendance";

const BAND_STYLES: Record<AttendanceBand, { box: string; title: string; text: string; message: string }> = {
  excellent: {
    box: "bg-green-50 border-green-200 dark:bg-[#062B1A] dark:border-green-500/60",
    title: "text-green-900 dark:text-green-200",
    text: "text-green-700 dark:text-green-300",
    message: "✅ Excellent attendance! Keep up the great work.",
  },
  good: {
    box: "bg-yellow-50 border-yellow-200 dark:bg-[#2B2306] dark:border-yellow-500/50",
    title: "text-yellow-900 dark:text-yellow-200",
    text: "text-yellow-700 dark:text-yellow-300",
    message: "⚠️ Good attendance, but room for improvement.",
  },
  poor: {
    box: "bg-red-50 border-red-200 dark:bg-[#351012] dark:border-red-400/60",
    title: "text-red-900 dark:text-red-200",
    text: "text-red-700 dark:text-red-300",
    message: "❌ Poor attendance. Needs immediate attention.",
  },
};

const longDate = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
    : "N/A";

const cardClass = "border-0 shadow-md dark:bg-[#0F172A] dark:border dark:border-[#263A5C]";
const labelClass = "text-sm font-medium text-gray-600 dark:text-slate-300";
const captionClass = "text-sm text-gray-500 mt-1 dark:text-slate-400";

interface FigureCardProps {
  label: string;
  icon: React.ReactNode;
  value: React.ReactNode;
  valueClass: string;
  caption?: string;
  children?: React.ReactNode;
}

/** One headline figure of the summary. */
function FigureCard({ label, icon, value, valueClass, caption, children }: FigureCardProps) {
  return (
    <Card className={cardClass}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className={labelClass}>{label}</CardTitle>
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className={`text-3xl font-bold ${valueClass}`}>{value}</div>
        {children}
        {caption && <p className={captionClass}>{caption}</p>}
      </CardContent>
    </Card>
  );
}

/**
 * A student's attendance figures: identity banner, four headline numbers, the
 * analysis period, late/excused counts and a banded verdict.
 *
 * @param props - Component props.
 * @param props.kpis - The student's KPIs from `GET /attendance/student/:id/kpis`.
 * @returns The summary.
 */
export function StudentAttendanceSummary({ kpis }: { kpis: StudentAttendanceKpis }) {
  const rate = kpis.attendanceRate ?? 0;
  const band = BAND_STYLES[attendanceBand(rate)];

  return (
    <>
      <Card className="border-0 shadow-lg bg-gradient-to-r from-[#003366] to-[#004080] text-white">
        <CardHeader>
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
              <span className="text-2xl font-bold">{initialsOf(kpis.firstName, kpis.lastName)}</span>
            </div>
            <div>
              <CardTitle className="text-2xl font-bold text-white">
                {kpis.firstName} {kpis.lastName}
              </CardTitle>
              <p className="text-blue-100">
                {kpis.email} | Class: {kpis.classInfo?.name ?? "N/A"}
              </p>
              {kpis.termInfo && <p className="text-blue-100 text-sm">Term: {kpis.termInfo.name}</p>}
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <FigureCard
          label="Attendance Rate"
          icon={<TrendingUp className="w-5 h-5 text-green-500" />}
          value={`${rate.toFixed(1)}%`}
          valueClass="text-green-600 dark:text-green-400"
        >
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-slate-700">
            <div
              className="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-300"
              style={{ width: `${Math.min(Math.max(rate, 0), 100)}%` }}
            />
          </div>
        </FigureCard>
        <FigureCard
          label="Total Days"
          icon={<Calendar className="w-5 h-5 text-blue-500" />}
          value={kpis.totalDays ?? 0}
          valueClass="text-gray-900 dark:text-slate-100"
          caption="School days"
        />
        <FigureCard
          label="Present Days"
          icon={<CheckCircle className="w-5 h-5 text-green-500" />}
          value={kpis.presentDays ?? 0}
          valueClass="text-green-600 dark:text-green-400"
          caption="Days attended"
        />
        <FigureCard
          label="Absent Days"
          icon={<XCircle className="w-5 h-5 text-red-500" />}
          value={kpis.absentDays ?? 0}
          valueClass="text-red-600 dark:text-red-400"
          caption="Days missed"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className={cardClass}>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 dark:text-slate-100">
              <Calendar className="w-5 h-5 text-blue-500" />
              <span>Analysis Period</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-blue-50 border border-blue-200 dark:bg-[#10233E] dark:border-[#315F95]">
              <h4 className="font-semibold text-blue-900 mb-2 dark:text-blue-200">Date Range</h4>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                <strong>From:</strong> {longDate(kpis.dateRange?.startDate)}
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                <strong>To:</strong> {longDate(kpis.dateRange?.endDate)}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-200 dark:bg-[#2B2306] dark:border-yellow-500/50">
              <h4 className="font-semibold text-yellow-900 mb-2 dark:text-yellow-200">Additional Metrics</h4>
              <div className="grid grid-cols-2 gap-4 text-sm text-yellow-700 dark:text-yellow-300">
                <p>
                  <strong>Late Days:</strong> {kpis.lateDays ?? 0}
                </p>
                <p>
                  <strong>Excused Days:</strong> {kpis.excusedDays ?? 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={cardClass}>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 dark:text-slate-100">
              <TrendingUp className="w-5 h-5 text-green-500" />
              <span>Performance Summary</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className={`p-4 rounded-lg border-2 ${band.box}`}>
              <h4 className={`font-semibold mb-2 ${band.title}`}>Attendance Status</h4>
              <p className={`text-sm ${band.text}`}>{band.message}</p>
            </div>
            <div className="p-4 rounded-lg bg-gray-50 border border-gray-200 dark:bg-[#111C31] dark:border-[#263A5C]">
              <h4 className="font-semibold text-gray-900 mb-2 dark:text-slate-100">Quick Stats</h4>
              <div className="grid grid-cols-1 gap-2 text-sm text-gray-700 dark:text-slate-300">
                <p>
                  <strong>Days Present:</strong> {kpis.presentDays ?? 0} out of {kpis.totalDays ?? 0}
                </p>
                <p>
                  <strong>Class:</strong> {kpis.classInfo?.name ?? "N/A"}
                </p>
                {kpis.termInfo && (
                  <p>
                    <strong>Term:</strong> {kpis.termInfo.name}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
