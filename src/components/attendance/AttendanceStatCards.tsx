import { percentOf } from "@/app/services/attendance/attendance.helpers";
import type { AttendanceStats } from "@/types/attendance";

interface StatCardProps {
  label: string;
  value: number;
  /** Share of the class this figure covers, 0-100. */
  percent: number;
  card: string;
  labelColor: string;
  valueColor: string;
  track: string;
  bar: string;
}

/** One figure with a bar that shows its real share of the class. */
function StatCard({ label, value, percent, card, labelColor, valueColor, track, bar }: StatCardProps) {
  return (
    <div className={`rounded-xl border p-3 text-left ${card}`}>
      <div className={`text-[11px] uppercase tracking-wide ${labelColor}`}>{label}</div>
      <div className={`mt-1 text-lg sm:text-xl font-semibold ${valueColor}`}>{value}</div>
      <div className={`mt-2 h-1.5 w-full rounded-full ${track}`}>
        <div className={`h-1.5 rounded-full ${bar}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

/**
 * The four attendance counters — Total, Present, Absent, Marked — drawn from
 * the roster the screen holds, so they move the moment a mark is stored.
 *
 * @param props - Component props.
 * @param props.stats - Counters from `computeAttendanceStats`.
 * @returns The stat grid.
 */
export function AttendanceStatCards({ stats }: { stats: AttendanceStats }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
      <StatCard
        label="Total"
        value={stats.total}
        percent={100}
        card="border-[#E6EDF5] bg-white/80 dark:bg-[#111C31] dark:border-[#315F95]"
        labelColor="text-[#6F6F6F] dark:text-slate-400"
        valueColor="text-[#030E18] dark:text-slate-100"
        track="bg-[#EEF3F9] dark:bg-[#1B2B45]"
        bar="bg-[#003366] dark:bg-blue-400"
      />
      <StatCard
        label="Present"
        value={stats.present}
        percent={percentOf(stats.present, stats.total)}
        card="border-green-200 bg-green-50/60 dark:bg-[#062B1A] dark:border-green-500/60"
        labelColor="text-green-700 dark:text-green-300"
        valueColor="text-green-700 dark:text-green-300"
        track="bg-green-100 dark:bg-green-900/50"
        bar="bg-green-600"
      />
      <StatCard
        label="Absent"
        value={stats.absent}
        percent={percentOf(stats.absent, stats.total)}
        card="border-red-200 bg-red-50/60 dark:bg-[#351012] dark:border-red-400/60"
        labelColor="text-red-700 dark:text-red-300"
        valueColor="text-red-700 dark:text-red-300"
        track="bg-red-100 dark:bg-red-900/50"
        bar="bg-red-600"
      />
      <StatCard
        label="Marked"
        value={stats.marked}
        percent={percentOf(stats.marked, stats.total)}
        card="border-[#D7E6F6] bg-[#EAF2FB]/60 dark:bg-[#10233E] dark:border-[#315F95]"
        labelColor="text-[#003366] dark:text-blue-200"
        valueColor="text-[#003366] dark:text-blue-200"
        track="bg-[#DDEAF7] dark:bg-[#1B2B45]"
        bar="bg-[#003366] dark:bg-blue-400"
      />
    </div>
  );
}
