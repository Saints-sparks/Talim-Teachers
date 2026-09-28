"use client";

import React from "react";
import { focusRing } from "@/components/tl/styles";
import { groupState } from "@/components/lesson/DayList";
import { dayMonth, displayRange, displayTime, lessonTitle, type SchoolClock } from "@/hooks/today/today.logic";
import { toneIndex, type GridBlock, type WeekGrid as WeekGridModel } from "@/hooks/timetable/timetableWeek.logic";
import type { TimetableDay } from "@/types/today";

/** Props for {@link WeekGrid}. */
export interface WeekGridProps {
  days: TimetableDay[];
  grid: WeekGridModel;
  clock: SchoolClock;
  onOpen: (groupKey: string) => void;
}

/**
 * One lesson cell: the subject in its tone; a double period spans its rows;
 * the lesson on now is outlined; a cancelled one is struck through with the
 * reason.
 *
 * @param props - The block and clock.
 * @param props.block - The placed lesson group.
 * @param props.day - Its day.
 * @param props.clock - The school clock.
 * @param props.onOpen - Opens the lesson sheet.
 * @returns The cell's button.
 */
function LessonCell({ block, day, clock, onOpen }: { block: GridBlock; day: TimetableDay; clock: SchoolClock; onOpen: (key: string) => void }) {
  const { group } = block;
  const lesson = group.lesson;
  const cancelled = lesson.cancelled;
  const isNow = !cancelled && day.isToday && groupState(group, clock) === "now";
  const sub = [lesson.class.name, lesson.room].filter(Boolean).join(" · ");
  const tone = `tl-tone-${toneIndex(lesson.course.id)}`;
  const style = cancelled
    ? "border border-dashed border-tl-control bg-tl-subtle text-tl-muted"
    : `bg-tone-bg text-tone-fg ${isNow ? "border-2 border-tone-fg" : "border border-tone-bd"}`;
  return (
    <button
      type="button"
      onClick={() => onOpen(group.key)}
      title="Open lesson details"
      aria-label={`${lessonTitle(lesson)}, ${day.day} ${displayRange(group.startTime, group.endTime)}${lesson.room ? `, ${lesson.room}` : ""}${isNow ? ", on now" : ""}${cancelled ? `, cancelled: ${cancelled.reason}` : ""}`}
      className={`${tone} ${style} flex h-full min-h-[62px] w-full flex-col justify-start rounded-[14px] px-3 py-2.5 text-left ${focusRing}`}
    >
      <span className={`text-sm font-extrabold ${cancelled ? "line-through" : ""}`}>{lesson.course.title}</span>
      <span className="mt-0.5 text-xs">
        {sub}
        {isNow ? " · now" : ""}
      </span>
      {group.merged ? <span className="mt-0.5 text-xs font-bold">Double period · {displayRange(group.startTime, group.endTime)}</span> : null}
      {cancelled ? <span className="mt-0.5 text-xs font-bold">Cancelled: {cancelled.reason}</span> : null}
    </button>
  );
}

/**
 * The week as a table: periods down the side (breaks as full-width rows),
 * the school days across, today's column tinted and holiday or early-close
 * days labelled in their heading. A double period is one cell spanning its
 * rows (`rowSpan`). Printed on its own by the page's Print button.
 *
 * @param props - See {@link WeekGridProps}.
 * @returns The table.
 */
export function WeekGrid({ days, grid, clock, onOpen }: WeekGridProps) {
  const todayCell = (day: TimetableDay) => (day.isToday ? "bg-tl-today print:bg-transparent" : "");
  return (
    <div className="tl-print-grid overflow-x-auto rounded-[22px] border border-tl-line bg-tl-surface shadow-[0_1px_2px_rgba(15,27,46,0.04)] print:overflow-visible print:rounded-none print:border-0 print:shadow-none">
      <table className="w-full min-w-[860px] table-fixed border-collapse text-tl-ink print:min-w-0">
        <caption className="sr-only">Your lessons this week, by period</caption>
        <colgroup>
          <col className="w-[120px]" />
          {days.map((day) => (
            <col key={day.date} />
          ))}
        </colgroup>
        <thead>
          <tr className="border-b border-tl-line-soft">
            <th scope="col" className="p-4 text-left align-middle">
              <span className="text-xs font-extrabold uppercase tracking-[0.07em] text-tl-faint">Period</span>
            </th>
            {days.map((day) => (
              <th key={day.date} scope="col" className={`px-3 py-3.5 text-center align-top ${todayCell(day)}`} aria-current={day.isToday ? "date" : undefined}>
                <span className={`block text-[15px] font-extrabold ${day.isToday ? "text-tl-brand" : "text-tl-ink"}`}>{day.day}</span>
                <span className="mt-0.5 block text-xs font-normal text-tl-faint">
                  {dayMonth(day.date)}
                  {day.isToday ? " · today" : ""}
                </span>
                {day.holiday ? (
                  <span className="mt-1 block text-xs font-bold text-tl-danger">Holiday: {day.holiday.title}</span>
                ) : day.endsEarlyAt ? (
                  <span className="mt-1 block text-xs font-bold text-tl-warning">Closes {displayTime(day.endsEarlyAt)}</span>
                ) : null}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {grid.periods.map((period, row) =>
            period.isBreak ? (
              <tr key={period.key} className="border-b border-tl-line-soft bg-tl-subtle">
                <th scope="row" className="px-4 py-[9px] text-left text-xs font-bold text-tl-faint">
                  {displayRange(period.startTime, period.endTime)}
                </th>
                <td colSpan={days.length} className="px-4 py-[9px] text-center">
                  <span className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-tl-faint">{period.label}</span>
                </td>
              </tr>
            ) : (
              <tr key={period.key} className="border-b border-tl-line-soft">
                <th scope="row" className="px-4 py-3.5 text-left align-top">
                  <span className="block text-[13px] font-extrabold text-tl-ink">{period.label}</span>
                  <span className="mt-0.5 block text-xs font-normal text-tl-faint">{displayRange(period.startTime, period.endTime)}</span>
                </th>
                {days.map((day, dayIndex) => {
                  const key = `${dayIndex}:${row}`;
                  if (grid.covered.has(key)) return null;
                  const blocks = grid.cells.get(key) ?? [];
                  const span = Math.max(1, ...blocks.map((b) => b.span));
                  return (
                    <td key={day.date} rowSpan={span > 1 ? span : undefined} className={`h-px p-[7px] align-top ${todayCell(day)}`}>
                      {blocks.length === 0 ? (
                        <div className="flex h-full min-h-[62px] items-center justify-center rounded-[14px] border border-dashed border-tl-line text-xs text-tl-faint">
                          Free
                        </div>
                      ) : (
                        <div className="flex h-full flex-col gap-1.5">
                          {blocks.map((block) => (
                            <LessonCell key={block.group.key} block={block} day={day} clock={clock} onOpen={onOpen} />
                          ))}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ),
          )}
        </tbody>
      </table>
    </div>
  );
}
