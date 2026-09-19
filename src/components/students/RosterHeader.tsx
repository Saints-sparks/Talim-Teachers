import { ChevronLeft, Download, RefreshCw, Users } from "lucide-react";
import type { TeacherClass } from "@/app/context/AppContext";

interface RosterHeaderProps {
  selectedClass: TeacherClass;
  canExport: boolean;
  refreshing: boolean;
  onBack: () => void;
  onRefresh: () => void;
  onExport: () => void;
}

const headerButton =
  "flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 bg-white rounded-lg text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed dark:bg-[#0F172A] dark:border-[#263A5C] dark:text-slate-200 dark:hover:bg-[#132742]";

/**
 * The roster header: back to the class list, the class name and description,
 * Refresh and Export CSV.
 *
 * @param props - Component props.
 * @returns The header.
 */
export function RosterHeader({ selectedClass, canExport, refreshing, onBack, onRefresh, onExport }: RosterHeaderProps) {
  return (
    <div
      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
      data-guide="students-list-header"
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 bg-white text-gray-500 hover:text-[#003366] hover:border-[#003366]/30 transition-all dark:bg-[#0F172A] dark:border-[#263A5C] dark:text-slate-300 dark:hover:text-blue-200"
          title="Back to classes"
          aria-label="Back to classes"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-[#003366]">
          <Users className="w-4 h-4 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-900 leading-tight dark:text-slate-100">
            {selectedClass?.name || "Class"} — Students
          </h1>
          {selectedClass?.classDescription && (
            <p className="text-xs text-gray-500 mt-0.5 dark:text-slate-400">{selectedClass.classDescription}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <button type="button" onClick={onRefresh} disabled={refreshing} className={headerButton}>
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
        <button type="button" onClick={onExport} disabled={!canExport} className={headerButton}>
          <Download className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Export CSV</span>
        </button>
      </div>
    </div>
  );
}
