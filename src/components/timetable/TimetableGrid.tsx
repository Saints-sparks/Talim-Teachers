import { Clock } from "lucide-react";
import type { TimetableByDay } from "@/app/services/timetable/timetable.service";
import { DAYS, entriesInSlot, unslottedEntries } from "@/hooks/timetable/timetable.logic";
import { FreeSlot, LessonBlock } from "./LessonBlock";

interface TimetableGridProps {
  data: TimetableByDay;
  slots: string[];
  /** Show a row for lessons outside the standard slots. */
  showOtherTimes: boolean;
}

const cellBorder = "border-r border-[#F0F0F0] dark:border-[#263A5C]";

/**
 * The desktop table: one column per weekday, one row per time slot. A slot
 * holding several lessons stacks them all; lessons outside 08:00-17:00 (or
 * with an unreadable time) get their own "Other times" row instead of vanishing.
 * The table scrolls sideways inside its own container.
 *
 * @param props - Component props.
 * @returns The grid.
 */
export function TimetableGrid({ data, slots, showOtherTimes }: TimetableGridProps) {
  const hasOtherTimes = showOtherTimes && DAYS.some((day) => unslottedEntries(data[day] ?? []).length > 0);

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px]">
        <thead>
          <tr className="bg-gradient-to-r from-[#F0F0F0]/50 to-[#F0F0F0]/30 border-b-2 border-[#F0F0F0] dark:from-[#111C31] dark:to-[#111C31] dark:border-[#263A5C]">
            <th className={`px-4 py-4 text-left font-semibold text-[#030E18] min-w-[140px] dark:text-slate-100 ${cellBorder}`}>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#6F6F6F] dark:text-slate-400" />
                Time Slot
              </div>
            </th>
            {DAYS.map((day) => (
              <th key={day} className={`px-4 py-4 text-center font-semibold text-[#030E18] dark:text-slate-100 ${cellBorder}`}>
                <div className="flex flex-col items-center gap-1">
                  <span className="text-lg">{day}</span>
                  <div className="w-8 h-1 bg-[#003366] rounded-full dark:bg-blue-400" />
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {slots.map((slot, index) => (
            <tr
              key={slot}
              className={`border-b border-[#F0F0F0] dark:border-[#263A5C] ${
                index % 2 === 0 ? "bg-white dark:bg-[#0F172A]" : "bg-[#F0F0F0]/20 dark:bg-[#111C31]/60"
              } hover:bg-[#003366]/5 transition-colors`}
            >
              <td className="px-4 py-6 font-semibold text-[#030E18] border-r-2 border-[#F0F0F0] bg-[#F0F0F0]/30 dark:text-slate-100 dark:border-[#263A5C] dark:bg-[#111C31]">
                <div className="flex flex-col items-center gap-1 text-center">
                  <div className="text-sm font-bold text-[#003366] dark:text-blue-200">{slot}</div>
                  <div className="w-16 h-px bg-[#F0F0F0] dark:bg-[#263A5C]" />
                  <div className="text-xs text-[#878787] dark:text-slate-400">Slot {index + 1}</div>
                </div>
              </td>
              {DAYS.map((day) => {
                const entries = entriesInSlot(data[day] ?? [], slot);
                return (
                  <td key={`${day}-${slot}`} className={`px-2 md:px-4 py-4 md:py-6 ${cellBorder}`}>
                    {entries.length > 0 ? (
                      <div className="space-y-2">
                        {entries.map((entry, i) => (
                          <LessonBlock key={entry._id ?? `${entry.courseId}-${i}`} entry={entry} />
                        ))}
                      </div>
                    ) : (
                      <FreeSlot />
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
          {hasOtherTimes && (
            <tr className="border-b border-[#F0F0F0] dark:border-[#263A5C]">
              <td className="px-4 py-6 font-semibold text-[#030E18] border-r-2 border-[#F0F0F0] bg-[#F0F0F0]/30 text-center text-sm dark:text-slate-100 dark:border-[#263A5C] dark:bg-[#111C31]">
                Other times
              </td>
              {DAYS.map((day) => {
                const entries = unslottedEntries(data[day] ?? []);
                return (
                  <td key={`${day}-other`} className={`px-2 md:px-4 py-4 align-top ${cellBorder}`}>
                    <div className="space-y-2">
                      {entries.map((entry, i) => (
                        <LessonBlock key={entry._id ?? `${entry.courseId}-${i}`} entry={entry} />
                      ))}
                    </div>
                  </td>
                );
              })}
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
