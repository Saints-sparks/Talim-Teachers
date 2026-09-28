"use client";

import React from "react";
import Link from "next/link";
import { displayRange, displayTime, lessonProgress, lessonTitle, toMinutes, type DayPhase, type SchoolClock } from "@/hooks/today/today.logic";
import { schemeOfWorkRoute } from "@/hooks/today/today.routes";
import { groupPeriodLabel, type LessonGroup } from "@/hooks/timetable/timetableWeek.logic";
import type { TodayLesson } from "@/types/today";

/** Props for {@link NowCard}. */
export interface NowCardProps {
  phase: Exclude<DayPhase, { kind: "none" }>;
  clock: SchoolClock;
  /** The group (double period) each lesson belongs to, by lesson id. */
  groupOf: (lesson: TodayLesson) => LessonGroup | undefined;
  onOpenLesson: (groupKey: string) => void;
}

const onNavyPrimary = `inline-flex min-h-[44px] items-center justify-center whitespace-nowrap rounded-[14px] bg-[#fff] px-[18px] py-3 text-sm font-bold text-[#0B2E5E] hover:bg-[#EEF3FB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-tl-now`;
const onNavyGhost = `inline-flex min-h-[44px] items-center justify-center whitespace-nowrap rounded-[14px] border border-white/40 px-[18px] py-3 text-sm font-bold text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-tl-now`;

/**
 * Minutes until a lesson starts, for "starts in 12 min".
 *
 * @param start - `HH:mm`.
 * @param clock - The school clock.
 * @returns Whole minutes, at least 1.
 */
function minutesUntil(start: string, clock: SchoolClock): number {
  return Math.max(1, Math.ceil(toMinutes(start) - clock.minutes));
}

/**
 * The navy card at the top of Today (the design computes a `now` object but
 * never draws it; this is that card). During a lesson: the period, times,
 * class · subject, students and room, this week's topic, a progress bar and
 * "35 min left · ends 11:00", with Open lesson and Scheme of work. Before the
 * first lesson and in a free period it shows what is next; after the last,
 * that the day's teaching is done.
 *
 * @param props - See {@link NowCardProps}.
 * @returns The card.
 */
export function NowCard({ phase, clock, groupOf, onOpenLesson }: NowCardProps) {
  if (phase.kind === "after") {
    return (
      <section aria-label="Your lessons" className="rounded-[22px] bg-tl-now p-[clamp(18px,2.4vw,24px)] text-white dark:border dark:border-tl-line">
        <div className="text-xs font-extrabold uppercase tracking-[0.07em] text-white/75">Day done</div>
        <h2 className="mt-2 text-[22px] font-extrabold tracking-[-0.4px]">That is all your lessons for today</h2>
        <p className="mt-1.5 text-sm text-white/80">
          {phase.taught} {phase.taught === 1 ? "lesson" : "lessons"} taught.
        </p>
        <div className="mt-4 flex flex-wrap gap-2.5">
          <Link href="/timetable" className={onNavyGhost}>
            See the week
          </Link>
        </div>
      </section>
    );
  }

  const lesson = phase.kind === "now" ? phase.lesson : phase.next;
  const group = groupOf(lesson);
  const start = group?.startTime ?? lesson.startTime;
  const end = group?.endTime ?? lesson.endTime;
  const periodLabel = group ? groupPeriodLabel(group) : displayRange(start, end);
  const isNow = phase.kind === "now";
  const eyebrowText = isNow ? `Now · ${periodLabel}` : phase.kind === "before" ? `First lesson · ${periodLabel}` : `Free period · next is ${periodLabel}`;
  const progress = isNow ? lessonProgress({ date: lesson.date, startTime: start, endTime: end }, clock) : 0;
  const left = isNow ? Math.max(1, Math.ceil(toMinutes(end) - clock.minutes)) : null;
  const details = [`${lesson.studentCount} ${lesson.studentCount === 1 ? "student" : "students"}`, lesson.room].filter(Boolean).join(" · ");

  return (
    <section aria-label={isNow ? "The lesson on now" : "Your next lesson"} className="rounded-[22px] bg-tl-now p-[clamp(18px,2.4vw,24px)] text-white dark:border dark:border-tl-line">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="text-xs font-extrabold uppercase tracking-[0.07em] text-white/75">{eyebrowText}</div>
        <div className="text-[13px] font-bold tabular-nums text-white/80">{displayRange(start, end)}</div>
      </div>
      <h2 className="mt-2 text-[22px] font-extrabold tracking-[-0.4px]">{lessonTitle(lesson)}</h2>
      <p className="mt-1 text-sm text-white/80">{details}</p>

      {lesson.topic?.topic ? (
        <div className="mt-3.5 rounded-[14px] bg-white/10 px-3.5 py-3">
          <div className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-white/70">Week {lesson.topic.week} topic</div>
          <div className="mt-1 text-[15px] font-bold">{lesson.topic.topic}</div>
        </div>
      ) : null}

      {isNow ? (
        <div className="mt-4">
          <div
            role="progressbar"
            aria-label="Lesson progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress * 100)}
            className="h-1.5 overflow-hidden rounded-[3px] bg-white/20"
          >
            <div className="h-full rounded-[3px] bg-[#6EE7B7]" style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
          <p className="mt-2 text-[13px] font-bold text-white/90">
            {left} min left · ends {displayTime(end)}
            {phase.kind === "now" && phase.next ? <span className="font-semibold text-white/75"> · next at {displayTime(phase.next.startTime)}</span> : null}
          </p>
        </div>
      ) : (
        <p className="mt-3.5 text-[13px] font-bold text-white/90">
          Starts at {displayTime(start)} · in {minutesUntil(start, clock)} min
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2.5">
        <button type="button" className={onNavyPrimary} onClick={() => onOpenLesson(group?.key ?? `${lesson.date}:${lesson.id}`)}>
          Open lesson
        </button>
        <Link href={schemeOfWorkRoute(lesson.course.id, lesson.topic?.week)} className={onNavyGhost}>
          Scheme of work
        </Link>
      </div>
    </section>
  );
}
