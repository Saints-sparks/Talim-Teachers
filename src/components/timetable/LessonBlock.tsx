import { BookOpen, Clock, MapPin, Users } from "lucide-react";
import type { TimetableEntry } from "@/app/services/timetable/timetable.service";
import { formatEntryTimeRange } from "@/hooks/timetable/timetable.logic";

/**
 * One lesson as a filled block in a grid cell: course, subject, class and time.
 *
 * @param props - Component props.
 * @param props.entry - The lesson.
 * @returns The block.
 */
export function LessonBlock({ entry }: { entry: TimetableEntry }) {
  return (
    <div className="bg-gradient-to-br from-[#003366] to-[#004080] text-white rounded-xl p-3 md:p-4 hover:from-[#002244] hover:to-[#003366] transition-all duration-300 dark:from-[#10233E] dark:to-[#1B3A63] dark:border dark:border-[#315F95]">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <BookOpen className="w-3 h-3 md:w-4 md:h-4 text-blue-200" />
          <div className="font-semibold text-xs md:text-sm">{entry.course}</div>
        </div>
        <Clock className="w-3 h-3 text-blue-200" />
      </div>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-2 h-2 bg-blue-200 rounded-full" />
        <div className="text-xs text-blue-100 font-medium">{entry.subject}</div>
      </div>
      <div className="flex items-center gap-2">
        <Users className="w-3 h-3 text-blue-200" />
        <div className="text-xs text-blue-200">{entry.class}</div>
      </div>
      <div className="mt-2 pt-2 border-t border-blue-400/30">
        <div className="text-xs text-blue-200 flex items-center gap-1">
          <MapPin className="w-3 h-3" />
          <span className="hidden md:inline">{formatEntryTimeRange(entry)}</span>
        </div>
      </div>
    </div>
  );
}

/** The empty cell shown for a slot with no lesson. */
export function FreeSlot() {
  return (
    <div className="h-20 md:h-24 bg-gradient-to-br from-[#F0F0F0]/50 to-[#F0F0F0]/30 rounded-xl border-2 border-dashed border-[#F0F0F0] flex flex-col items-center justify-center dark:from-[#111C31] dark:to-[#0F172A] dark:border-[#263A5C]">
      <div className="w-6 h-6 md:w-8 md:h-8 bg-[#F0F0F0] rounded-full flex items-center justify-center mb-1 dark:bg-[#1B2B45]">
        <Clock className="w-3 h-3 md:w-4 md:h-4 text-[#878787]" />
      </div>
      <span className="text-[#878787] text-xs font-medium dark:text-slate-400">Free</span>
    </div>
  );
}
