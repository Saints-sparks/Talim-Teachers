import { Search } from "lucide-react";
import type { StatusFilter } from "@/app/services/students/students.service";

interface RosterToolbarProps {
  search: string;
  status: StatusFilter;
  onSearch: (value: string) => void;
  onStatus: (value: StatusFilter) => void;
}

const control =
  "bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#003366]/20 focus:border-[#003366] transition-all dark:bg-[#111C31] dark:border-[#263A5C] dark:text-slate-100";

/**
 * Search box and status filter above the roster.
 *
 * @param props - Component props.
 * @returns The toolbar.
 */
export function RosterToolbar({ search, status, onSearch, onStatus }: RosterToolbarProps) {
  return (
    <div
      className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex flex-col sm:flex-row gap-3 dark:bg-[#0F172A] dark:border-[#263A5C]"
      data-guide="students-search-filter"
    >
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          aria-label="Search students"
          placeholder="Search by name, email or admission number..."
          className={`w-full pl-9 pr-4 py-2 placeholder-gray-400 ${control}`}
        />
      </div>
      <select
        value={status}
        onChange={(e) => onStatus(e.target.value as StatusFilter)}
        aria-label="Filter by status"
        className={`py-2 px-3 ${control}`}
      >
        <option value="all">All Status</option>
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
      </select>
    </div>
  );
}
