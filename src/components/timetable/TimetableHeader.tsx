import { Calendar, ChevronLeft, Download, RefreshCw, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TIME_WINDOWS, type TimeWindow } from "@/hooks/timetable/timetable.logic";

interface TimetableHeaderProps {
  timeWindow: TimeWindow;
  onWindow: (key: string) => void;
  cardView: boolean;
  onToggleCardView: () => void;
  refreshing: boolean;
  onRefresh: () => void;
  /** Export is offered only when there is something to export. */
  canExport: boolean;
  onExport: () => void;
}

const actionButton =
  "flex items-center gap-2 border-[#F0F0F0] shadow-none transition-all duration-200 dark:border-[#263A5C] dark:bg-transparent";

/**
 * The timetable header: title, the time-window filter, the phone card/table
 * switch, Refresh and Export.
 *
 * @param props - Component props.
 * @returns The header.
 */
export function TimetableHeader({
  timeWindow,
  onWindow,
  cardView,
  onToggleCardView,
  refreshing,
  onRefresh,
  canExport,
  onExport,
}: TimetableHeaderProps) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 p-4 md:p-6 bg-gradient-to-r from-white to-blue-50 rounded-xl border border-[#F0F0F0] dark:from-[#0F172A] dark:to-[#10233E] dark:border-[#263A5C]">
      <div className="flex items-center gap-3 md:gap-4">
        <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-[#003366] to-[#004080] rounded-xl flex items-center justify-center">
          <Calendar className="w-5 h-5 md:w-6 md:h-6 text-white" />
        </div>
        <div>
          <h2 className="text-xl md:text-2xl font-medium text-[#030E18] mb-1 dark:text-slate-100">Weekly Timetable</h2>
          <p className="text-[#6F6F6F] flex items-center gap-2 text-sm md:text-base dark:text-slate-400">
            <Users className="w-4 h-4" />
            Your class schedule for the week
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-2">
          <label htmlFor="timetable-window" className="text-sm font-medium text-[#2F2F2F] dark:text-slate-200">
            Time:
          </label>
          <select
            id="timetable-window"
            value={timeWindow.key}
            onChange={(e) => onWindow(e.target.value)}
            className="px-3 py-2 border border-[#F0F0F0] rounded-md text-sm bg-white text-[#030E18] focus:outline-none focus:ring-2 focus:ring-[#003366] transition-all dark:bg-[#111C31] dark:text-slate-100 dark:border-[#263A5C]"
          >
            {TIME_WINDOWS.map((w) => (
              <option key={w.key} value={w.key}>
                {w.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-3">
          <Button
            onClick={onToggleCardView}
            variant="outline"
            size="sm"
            className={`flex md:hidden text-purple-600 hover:bg-purple-50 hover:text-purple-600 hover:border-purple-200 dark:text-purple-300 dark:hover:bg-purple-900/30 ${actionButton}`}
          >
            <ChevronLeft className={`w-4 h-4 transition-transform ${cardView ? "rotate-180" : ""}`} />
            <span>{cardView ? "Card View" : "Table View"}</span>
          </Button>
          <Button
            onClick={onRefresh}
            variant="outline"
            size="sm"
            disabled={refreshing}
            className={`text-[#6F6F6F] hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 dark:text-slate-300 dark:hover:bg-blue-900/30 ${actionButton}`}
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">{refreshing ? "Refreshing..." : "Refresh"}</span>
          </Button>
          <Button
            onClick={onExport}
            variant="outline"
            size="sm"
            disabled={!canExport}
            className={`text-green-600 hover:bg-green-50 hover:text-green-600 hover:border-green-200 dark:text-green-300 dark:hover:bg-green-900/30 ${actionButton}`}
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
