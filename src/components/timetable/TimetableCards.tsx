import { BookOpen, Calendar, Clock, Users } from "lucide-react";
import type { TimetableByDay } from "@/app/services/timetable/timetable.service";
import { DAYS, formatEntryTimeRange, sortByStart } from "@/hooks/timetable/timetable.logic";

/**
 * The phone layout: one card per weekday listing that day's lessons in time order.
 *
 * @param props - Component props.
 * @param props.data - The week grouped by day.
 * @returns The card list.
 */
export function TimetableCards({ data }: { data: TimetableByDay }) {
  return (
    <div className="p-4 space-y-4">
      {DAYS.map((day) => {
        const entries = sortByStart(data[day] ?? []);
        return (
          <div
            key={day}
            className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg p-4 dark:from-[#111C31] dark:to-[#10233E]"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-[#003366] rounded-lg flex items-center justify-center">
                <Calendar className="w-4 h-4 text-white" />
              </div>
              <h3 className="text-lg font-medium text-[#003366] dark:text-blue-200">{day}</h3>
              <div className="flex-1 h-px bg-[#003366]/20 dark:bg-blue-300/20" />
              <span className="text-sm text-[#6F6F6F] dark:text-slate-400">{entries.length} classes</span>
            </div>

            {entries.length === 0 ? (
              <div className="text-center py-8 text-[#878787] dark:text-slate-400">
                <Clock className="w-8 h-8 mx-auto mb-2 text-[#F0F0F0] dark:text-slate-600" />
                <p>No classes scheduled</p>
              </div>
            ) : (
              <div className="space-y-3">
                {entries.map((entry, index) => (
                  <div
                    key={entry._id ?? index}
                    className="bg-white rounded-lg p-4 border border-[#F0F0F0] dark:bg-[#0F172A] dark:border-[#263A5C]"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-[#003366] dark:text-blue-300" />
                        <div>
                          <h4 className="font-semibold text-[#030E18] dark:text-slate-100">{entry.course}</h4>
                          <p className="text-sm text-[#6F6F6F] dark:text-slate-400">{entry.subject}</p>
                        </div>
                      </div>
                      <div className="text-sm font-medium text-[#003366] text-right dark:text-blue-200">
                        {formatEntryTimeRange(entry)}
                      </div>
                    </div>
                    {entry.class && (
                      <div className="flex items-center gap-2 text-sm text-[#6F6F6F] dark:text-slate-400">
                        <Users className="w-4 h-4" />
                        <span>{entry.class}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
