"use client";

import React, { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Download, Printer } from "lucide-react";
import { card, cardTitle, focusRing, ghostButton, pageTitle, pagePad } from "@/components/tl/styles";
import { DayList } from "@/components/lesson/DayList";
import { LessonSheet } from "@/components/lesson/LessonSheet";
import { WeekGrid } from "@/components/timetable/WeekGrid";
import { dayMonth, displayRange, displayTime, lessonTitle, schoolClock, weekLabel } from "@/hooks/today/today.logic";
import { buildDayRows, buildWeekGrid, legendOf, subjectCount, type LessonGroup } from "@/hooks/timetable/timetableWeek.logic";
import type { TimetableWeek } from "@/types/today";

/** How much of the timetable to show (the `teaching.timetableDisplay` preference). */
export type TimetableMode = "week" | "today";

/** Props for {@link TimetableView}. */
export interface TimetableViewProps {
  week: TimetableWeek;
  nowMs: number;
  mode: TimetableMode;
  onMode: (mode: TimetableMode) => void;
  /** Loads another week; undefined returns to the current one. */
  onWeek: (weekStart: string | undefined) => void;
  /** True while another week is loading (the old one stays on screen). */
  loadingWeek?: boolean;
  onExportCsv: () => void;
  onPrint: () => void;
  onShareResource: (courseId: string, week?: number) => void;
}

/**
 * The header line under "Timetable".
 *
 * @param week - The week.
 * @returns E.g. "Week 3 · 21 – 25 September · 17 lessons across 3 subjects".
 */
export function timetableLine(week: TimetableWeek): string {
  const n = week.lessons.length;
  const subjects = subjectCount(week.lessons);
  const counts = n ? ` · ${n} ${n === 1 ? "lesson" : "lessons"} across ${subjects} ${subjects === 1 ? "subject" : "subjects"}` : "";
  // `week.end` is the Sunday; the heading spans the school days shown (Monday to Friday).
  const lastDay = week.days[week.days.length - 1]?.date ?? week.week.end;
  return `${weekLabel({ ...week.week, end: lastDay })}${counts}`;
}

/**
 * The redesigned timetable: week navigation, Week/Today toggle, Print and
 * CSV export; the period grid (wide screens and print) or one day at a time
 * with Monday–Friday tabs (below 960px, and in the Today view); the legend;
 * and the lesson sheet.
 *
 * @param props - See {@link TimetableViewProps}.
 * @returns The screen.
 */
export function TimetableView({ week, nowMs, mode, onMode, onWeek, loadingWeek, onExportCsv, onPrint, onShareResource }: TimetableViewProps) {
  const clock = useMemo(() => schoolClock(nowMs, week.timezone), [nowMs, week.timezone]);
  const grid = useMemo(() => buildWeekGrid(week), [week]);
  const legend = useMemo(() => legendOf(week.lessons), [week.lessons]);
  const todayIndex = week.days.findIndex((d) => d.isToday);
  const [pickedDay, setPickedDay] = useState<{ week: string; index: number } | null>(null);
  const dayIndex = pickedDay && pickedDay.week === week.week.start ? pickedDay.index : Math.max(0, todayIndex);
  const day = week.days[dayIndex];
  const dayRows = useMemo(
    () => (day ? buildDayRows(week.lessons.filter((l) => l.date === day.date), grid.periods) : []),
    [day, week.lessons, grid.periods],
  );
  const groups = useMemo(() => {
    const all: LessonGroup[] = [];
    for (const blocks of grid.cells.values()) for (const b of blocks) all.push(b.group);
    for (const row of dayRows) if (row.type === "lesson") all.push(row.group);
    return all;
  }, [grid, dayRows]);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const openGroup = groups.find((g) => g.key === openKey) ?? null;

  const noTimetable = week.periods.length === 0 && week.lessons.length === 0;
  const noLessons = !noTimetable && week.lessons.length === 0;
  const todayLabel = week.week.isCurrent ? "Today" : "Day";

  const segment = (value: TimetableMode, label: string, tip: string) => (
    <button
      type="button"
      aria-pressed={mode === value}
      title={tip}
      onClick={() => onMode(value)}
      className={`flex min-h-[40px] items-center rounded-[10px] px-4 py-2 text-sm font-bold ${focusRing} ${
        mode === value ? "bg-tl-surface text-tl-brand shadow-[0_1px_2px_rgba(15,27,46,0.1),0_1px_1px_rgba(15,27,46,0.04)]" : "text-tl-muted"
      }`}
    >
      {label}
    </button>
  );

  const navButton = `${ghostButton} px-3`;

  return (
    <div className={`${pagePad} flex flex-col gap-[18px]`}>
      <div className="flex flex-wrap items-end justify-between gap-3.5">
        <div>
          <h1 className={pageTitle}>Timetable</h1>
          <p className="mt-[5px] text-[15px] text-tl-muted" aria-live="polite">
            {timetableLine(week)}
            {loadingWeek ? <span className="sr-only"> (loading)</span> : null}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5" data-print-hide>
          <div className="flex items-center gap-1.5" role="group" aria-label="Week">
            <button type="button" className={navButton} onClick={() => onWeek(week.week.prevStart)} aria-label="Previous week" title="Previous week">
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </button>
            <button
              type="button"
              className={ghostButton}
              onClick={() => onWeek(undefined)}
              disabled={week.week.isCurrent}
              title="Back to this week"
            >
              This week
            </button>
            <button type="button" className={navButton} onClick={() => onWeek(week.week.nextStart)} aria-label="Next week" title="Next week">
              <ChevronRight className="h-4 w-4" aria-hidden />
            </button>
          </div>
          <div role="group" aria-label="Show" title="Choose how much of the timetable to show" className="hidden gap-0.5 rounded-[13px] bg-tl-track p-1 min-[960px]:flex">
            {segment("week", "Week", "Monday to Friday")}
            {segment("today", todayLabel, week.week.isCurrent ? "Only today's periods" : "One day at a time")}
          </div>
          <button type="button" className={ghostButton} onClick={onPrint} title="Print or save the week as a PDF" disabled={noTimetable}>
            <Printer className="h-4 w-4" aria-hidden />
            <span>Print</span>
          </button>
          <button type="button" className={ghostButton} onClick={onExportCsv} title="Download the week as a spreadsheet" disabled={week.lessons.length === 0}>
            <Download className="h-4 w-4" aria-hidden />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {noTimetable ? (
        <section className={card}>
          <h2 className={cardTitle}>No timetable yet</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-tl-muted">
            Your timetable has not been set up yet. The school office adds your lessons, and they will show here as soon as they do.
          </p>
        </section>
      ) : noLessons ? (
        <section className={card}>
          <h2 className={cardTitle}>No lessons this week</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-tl-muted">
            {week.week.inTerm
              ? "You have no lessons timetabled for this week."
              : "This week is outside the term, so there are no lessons. Use the arrows to go back to a term week."}
          </p>
        </section>
      ) : (
        <>
          <div className={mode === "week" ? "hidden min-[960px]:block print:block" : "hidden print:block"}>
            <WeekGrid days={week.days} grid={grid} clock={clock} onOpen={setOpenKey} />
          </div>

          <div className={mode === "week" ? "min-[960px]:hidden print:hidden" : "print:hidden"}>
            <div role="tablist" aria-label="Day" className="mb-3 flex gap-1.5 overflow-x-auto pb-1">
              {week.days.map((d, i) => (
                <button
                  key={d.date}
                  type="button"
                  role="tab"
                  id={`tt-tab-${i}`}
                  aria-selected={i === dayIndex}
                  aria-controls="tt-day-panel"
                  onClick={() => setPickedDay({ week: week.week.start, index: i })}
                  className={`flex min-h-[44px] min-w-[64px] flex-col items-center justify-center rounded-xl border px-3 py-1.5 text-sm font-bold ${focusRing} ${
                    i === dayIndex ? "border-tl-control bg-tl-select text-tl-brand" : "border-tl-line bg-tl-surface text-tl-muted"
                  }`}
                >
                  <span>{d.day.slice(0, 3)}</span>
                  <span className="text-[11px] font-semibold">{d.isToday ? "Today" : dayMonth(d.date)}</span>
                </button>
              ))}
            </div>
            {day ? (
              <section id="tt-day-panel" role="tabpanel" aria-labelledby={`tt-tab-${dayIndex}`} className={`${card} max-w-[760px]`}>
                <div className="mb-2">
                  <h2 className={cardTitle}>
                    {day.day}, {dayMonth(day.date)}
                  </h2>
                  {day.holiday ? (
                    <p className="mt-1 text-sm font-bold text-tl-danger">Holiday: {day.holiday.title}. Lessons are cancelled.</p>
                  ) : day.endsEarlyAt ? (
                    <p className="mt-1 text-sm font-bold text-tl-warning">School closes at {displayTime(day.endsEarlyAt)}. Later lessons are cancelled.</p>
                  ) : null}
                </div>
                {dayRows.length ? (
                  <DayList rows={dayRows} clock={clock} onOpen={setOpenKey} />
                ) : (
                  <p className="py-2 text-sm text-tl-muted">No lessons on {day.day}.</p>
                )}
              </section>
            ) : null}
          </div>

          {grid.unplaced.length ? (
            <section className={card} aria-label="Lessons outside the periods">
              <h2 className={cardTitle}>Other lessons</h2>
              <ul className="mt-2 text-sm text-tl-muted">
                {grid.unplaced.map((l) => (
                  <li key={`${l.date}:${l.id}`}>
                    <button type="button" className={`min-h-[44px] text-left hover:underline ${focusRing}`} onClick={() => setOpenKey(`${l.date}:${l.id}`)}>
                      {l.day} {displayRange(l.startTime, l.endTime)} · {lessonTitle(l)}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {legend.length ? (
            <ul aria-label="Subjects" className="flex flex-wrap gap-2.5">
              {legend.map((item) => (
                <li
                  key={item.key}
                  className={`tl-tone-${item.tone} rounded-[10px] border border-tone-bd bg-tone-bg px-3 py-[7px] text-[13px] font-bold text-tone-fg`}
                >
                  {item.label}
                </li>
              ))}
            </ul>
          ) : null}
        </>
      )}

      <LessonSheet
        group={openGroup ?? unplacedGroup(grid.unplaced, openKey)}
        termId={week.term?.id}
        onClose={() => setOpenKey(null)}
        onShareResource={(courseId, wk) => {
          setOpenKey(null);
          onShareResource(courseId, wk);
        }}
      />
    </div>
  );
}

/**
 * A single-lesson group for a lesson that sits outside the periods.
 *
 * @param lessons - The unplaced lessons.
 * @param key - The open key.
 * @returns The group, or null.
 */
function unplacedGroup(lessons: TimetableWeek["lessons"], key: string | null): LessonGroup | null {
  const lesson = key ? lessons.find((l) => `${l.date}:${l.id}` === key) : undefined;
  return lesson ? { key: key!, lessons: [lesson], lesson, startTime: lesson.startTime, endTime: lesson.endTime, periods: [], merged: false } : null;
}
