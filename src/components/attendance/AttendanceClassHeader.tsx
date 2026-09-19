"use client";

import { ArrowLeft, RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** The two modes of the class attendance page. */
export type AttendanceMode = "mark-attendance" | "view-attendance";

interface AttendanceClassHeaderProps {
  className: string;
  mode: AttendanceMode;
  /** Only teachers may record attendance; everyone else gets the read-only view. */
  canMark: boolean;
  searchQuery: string;
  refreshing: boolean;
  onSearch: (query: string) => void;
  onMode: (mode: AttendanceMode) => void;
  onRefresh: () => void;
  onBack: () => void;
}

const idleButton =
  "border-[#D7E6F6] text-[#030E18] dark:border-[#315F95] dark:text-slate-100 dark:hover:bg-[#132742]";
const activeButton = "bg-[#003366] text-white hover:bg-[#002244]";

/**
 * The class attendance header: back button, class name, search, the Mark/View
 * switch (Mark only for roles the server lets record attendance) and Refresh.
 *
 * @param props - Component props.
 * @returns The header.
 */
export function AttendanceClassHeader({
  className,
  mode,
  canMark,
  searchQuery,
  refreshing,
  onSearch,
  onMode,
  onRefresh,
  onBack,
}: AttendanceClassHeaderProps) {
  const marking = mode === "mark-attendance";

  return (
    <div
      className="bg-white border border-[#E6EDF5] rounded-2xl p-4 sm:p-5 mb-6 sm:mb-8 dark:bg-[#0F172A] dark:border-[#263A5C]"
      data-guide="attendance-register-header"
    >
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={onBack}
            className="mt-0.5 flex items-center justify-center w-9 h-9 rounded-full text-[#6F6F6F] hover:bg-[#F0F0F0] hover:text-[#030E18] transition-all duration-200 dark:text-blue-200 dark:hover:bg-[#132742] dark:hover:text-white"
            aria-label="Back to classes"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-semibold text-[#030E18] dark:text-slate-100 truncate">
                {className}
              </h1>
              <span className="text-xs text-[#003366] bg-[#EAF2FB] border border-[#D7E6F6] rounded-full px-2 py-1 dark:border-[#315F95] dark:bg-[#10233E] dark:text-blue-200">
                {marking ? "Marking" : "Viewing"}
              </span>
            </div>
            <p className="text-sm text-[#6F6F6F] leading-tight mt-1 dark:text-slate-400">
              {marking ? "Mark attendance for today" : "View attendance analytics"}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
          <div className="flex items-center bg-white border border-[#F0F0F0] rounded-xl px-3 py-2 w-full sm:w-[260px] dark:bg-[#111C31] dark:border-[#263A5C]">
            <Search className="text-[#878787] mr-2" size={18} />
            <Input
              className="border-0 focus-visible:ring-0 focus:outline-none flex-1 placeholder:text-[#878787] shadow-none text-sm"
              placeholder="Search students..."
              aria-label="Search students"
              value={searchQuery}
              onChange={(e) => onSearch(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center" data-guide="attendance-mode-controls">
            {canMark && (
              <Button
                variant={marking ? "default" : "outline"}
                className={marking ? activeButton : idleButton}
                onClick={() => onMode("mark-attendance")}
              >
                Mark
              </Button>
            )}
            <Button
              variant={!marking ? "default" : "outline"}
              className={!marking ? activeButton : idleButton}
              onClick={() => onMode("view-attendance")}
            >
              View
            </Button>
            <Button
              variant="outline"
              className={`${canMark ? "col-span-2 sm:col-span-1" : ""} ${idleButton}`}
              onClick={onRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
