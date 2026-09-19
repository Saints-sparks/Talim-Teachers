import { Hash, User, Users } from "lucide-react";

interface RosterStatsProps {
  total: number;
  active: number;
  /** The class's configured capacity; blank when the school never set one. */
  capacity: string | number | null | undefined;
}

const card =
  "bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center gap-3 dark:bg-[#0F172A] dark:border-[#263A5C]";

/**
 * Total, active and capacity counters for the class.
 *
 * @param props - Component props.
 * @returns The stat row.
 */
export function RosterStats({ total, active, capacity }: RosterStatsProps) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <div className={card}>
        <div className="w-8 h-8 rounded-lg bg-[#003366]/10 flex items-center justify-center flex-shrink-0 dark:bg-[#10233E]">
          <Users className="w-4 h-4 text-[#003366] dark:text-blue-200" />
        </div>
        <div>
          <p className="text-xl font-bold text-gray-900 dark:text-slate-100">{total}</p>
          <p className="text-xs text-gray-500 dark:text-slate-400">Total</p>
        </div>
      </div>
      <div className={card}>
        <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0 dark:bg-emerald-900/30">
          <User className="w-4 h-4 text-emerald-600 dark:text-emerald-300" />
        </div>
        <div>
          <p className="text-xl font-bold text-gray-900 dark:text-slate-100">{active}</p>
          <p className="text-xs text-gray-500 dark:text-slate-400">Active</p>
        </div>
      </div>
      <div className={card}>
        <div className="w-8 h-8 rounded-lg bg-[#003366]/10 flex items-center justify-center flex-shrink-0 dark:bg-[#10233E]">
          <Hash className="w-4 h-4 text-[#003366] dark:text-blue-200" />
        </div>
        <div>
          <p className="text-xl font-bold text-gray-900 dark:text-slate-100">{capacity || "—"}</p>
          <p className="text-xs text-gray-500 dark:text-slate-400">Capacity</p>
        </div>
      </div>
    </div>
  );
}
