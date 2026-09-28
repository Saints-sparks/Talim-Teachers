"use client";

import React from "react";
import { focusRing } from "@/components/tl/styles";
import { displayRange, displayTime, lessonState, lessonTitle, minutesLeft, type SchoolClock } from "@/hooks/today/today.logic";
import { groupPeriodLabel, toneIndex, type DayRow, type LessonGroup } from "@/hooks/timetable/timetableWeek.logic";
import type { Lesson, LessonState } from "@/types/today";

/**
 * A group's state on the clock: a double period is "now" from the start of
 * its first period to the end of its last.
 *
 * @param group - The lesson group.
 * @param clock - The school clock.
 * @returns The state.
 */
export function groupState(group: LessonGroup, clock: SchoolClock): LessonState {
  return lessonState({ date: group.lesson.date, startTime: group.startTime, endTime: group.endTime }, clock);
}

/**
 * Minutes left in a group that is on now.
 *
 * @param group - The lesson group.
 * @param clock - The school clock.
 * @returns Minutes, or null.
 */
export function groupMinutesLeft(group: LessonGroup, clock: SchoolClock): number | null {
  return minutesLeft({ date: group.lesson.date, startTime: group.startTime, endTime: group.endTime }, clock);
}

/**
 * The second line of a lesson row: topic and room.
 *
 * @param lesson - The lesson.
 * @param merged - Whether it is a double period.
 * @returns The meta text.
 */
export function lessonMeta(lesson: Lesson, merged: boolean): string {
  const parts: string[] = [];
  if (lesson.cancelled) parts.push(`Cancelled: ${lesson.cancelled.reason}`);
  else if (lesson.topic?.topic) parts.push(`Week ${lesson.topic.week}: ${lesson.topic.topic}`);
  if (lesson.room) parts.push(lesson.room);
  if (merged) parts.push("Double period");
  return parts.join(" · ");
}

/** Props for {@link DayList}. */
export interface DayListProps {
  rows: DayRow[];
  clock: SchoolClock;
  /** Opens the lesson sheet for a group. */
  onOpen: (groupKey: string) => void;
}

/**
 * One day as rows (the design's `dayline`): start time, a subject-coloured
 * dot, "Mathematics · JSS1 A", the week's topic and the room, and a tag for
 * the lesson on now ("Now · 35 min left"), the next one, or a cancellation.
 * Breaks show as quiet rows. Each lesson row is a button that opens the
 * lesson sheet.
 *
 * @param props - See {@link DayListProps}.
 * @returns The list.
 */
export function DayList({ rows, clock, onOpen }: DayListProps) {
  const nextKey = rows.find(
    (row) => row.type === "lesson" && !row.group.lesson.cancelled && row.group.lesson.date === clock.date && groupState(row.group, clock) === "later",
  )?.key;

  return (
    <ul className="flex flex-col gap-0.5">
      {rows.map((row) => {
        if (row.type === "break") {
          return (
            <li key={row.key} className="flex items-center gap-3.5 rounded-[14px] px-3.5 py-1.5">
              <span className="w-11 shrink-0 text-xs font-bold tabular-nums text-tl-faint">{displayTime(row.period.startTime)}</span>
              <span aria-hidden className="w-2 shrink-0" />
              <span className="text-[13px] font-semibold text-tl-faint">{row.period.label}</span>
            </li>
          );
        }
        const { group } = row;
        const lesson = group.lesson;
        const cancelled = Boolean(lesson.cancelled);
        const state = groupState(group, clock);
        const isNow = state === "now" && !cancelled;
        const isNext = row.key === nextKey;
        const done = state === "done" || cancelled;
        const left = isNow ? groupMinutesLeft(group, clock) : null;
        const tag = cancelled ? "Cancelled" : isNow ? `Now · ${left} min left` : isNext ? "Next" : lesson.topic?.taughtAt ? "Taught" : "";
        return (
          <li key={row.key} className={`tl-tone-${toneIndex(lesson.course.id)}`}>
            <button
              type="button"
              onClick={() => onOpen(group.key)}
              title="Open lesson details"
              aria-current={isNow ? "time" : undefined}
              className={`flex min-h-[44px] w-full items-center gap-3.5 rounded-[14px] px-3.5 py-3 text-left transition-colors ${
                isNow ? "bg-tl-success-soft" : "hover:bg-tl-subtle"
              } ${focusRing}`}
            >
              <span className={`w-11 shrink-0 text-sm font-bold tabular-nums ${done ? "text-tl-faint" : "text-tl-ink"}`}>
                {displayTime(group.startTime)}
              </span>
              <span aria-hidden className={`h-2 w-2 shrink-0 rounded-full ${done ? "bg-tl-line" : "bg-tone-fg"}`} />
              <span className="min-w-0 flex-1">
                <span className={`block text-[15px] font-bold ${done ? "text-tl-faint" : "text-tl-ink"} ${cancelled ? "line-through" : ""}`}>
                  {lessonTitle(lesson)}
                  <span className="sr-only">, {groupPeriodLabel(group)}, {displayRange(group.startTime, group.endTime)}</span>
                </span>
                <span className={`mt-0.5 block truncate text-[13px] ${done ? "text-tl-faint" : "text-tl-muted"}`}>{lessonMeta(lesson, group.merged)}</span>
              </span>
              {tag ? (
                <span
                  className={`whitespace-nowrap text-[13px] font-bold ${
                    isNow ? "text-tl-success" : cancelled ? "text-tl-danger" : "text-tl-faint"
                  }`}
                >
                  {tag}
                </span>
              ) : null}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
