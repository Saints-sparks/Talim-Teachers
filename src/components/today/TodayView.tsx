"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { card, cardTitle, ghostButton, pageTitle, pagePad, pill, primaryButton, textLink } from "@/components/tl/styles";
import { DayList } from "@/components/lesson/DayList";
import { LessonSheet } from "@/components/lesson/LessonSheet";
import { NowCard } from "@/components/today/NowCard";
import { AttentionCard, ClassCard, SetupCard } from "@/components/today/TodayCards";
import { computeLiveToday, displayTime, longDate, registerButtonTip, registerDeadline, type LiveToday } from "@/hooks/today/today.logic";
import { pickRegisterAction } from "@/hooks/today/today.routes";
import { buildDayRows, type LessonGroup } from "@/hooks/timetable/timetableWeek.logic";
import type { TeacherToday } from "@/types/today";

/** Props for {@link TodayView}. */
export interface TodayViewProps {
  today: TeacherToday;
  /** The current instant (server-offset), from `useSchoolNow`. */
  nowMs: number;
  firstName: string;
  /** Opens the Subjects page's upload sheet, optionally for a course and week. */
  onUpload: (courseId?: string, week?: number) => void;
  /** Opens the portal tour. */
  onTour?: () => void;
}

/**
 * The sentence shown in "Your day" when there are no lessons to list.
 *
 * @param today - The aggregate.
 * @returns The message, or null when there are lessons.
 */
export function emptyDayMessage(today: TeacherToday): string | null {
  const { schoolDay } = today;
  // Precedence on the server is weekend > holiday > no_term. Outside a term the
  // timetable still runs (lessons are listed), so only say so when there are none.
  if (!schoolDay.isSchoolDay && schoolDay.reason === "no_term" && today.lessons.length === 0) {
    return "There is no current term, so there are no lessons today. Your timetable will show here when the next term starts.";
  }
  if (!schoolDay.isSchoolDay && schoolDay.reason === "holiday") {
    return `${schoolDay.holidayTitle || "Today is a holiday"}: the school is closed, so there are no lessons today.`;
  }
  if (!schoolDay.isSchoolDay && schoolDay.reason === "weekend") {
    return "It is the weekend, so there are no lessons today.";
  }
  if (today.lessons.length > 0) return null;
  if (today.periods.length === 0) {
    return "Your timetable has not been set up yet. The school office adds your lessons, and they will show here.";
  }
  return "You have no lessons today.";
}

/**
 * The "4 lessons today · 1 taught" line.
 *
 * @param live - The live view.
 * @param today - The aggregate.
 * @returns The summary.
 */
export function daySummary(live: LiveToday, today: TeacherToday): string {
  if (emptyDayMessage(today)) return "No lessons today";
  const parts = [`${live.activeCount} ${live.activeCount === 1 ? "lesson" : "lessons"} today`, `${live.taughtCount} taught`];
  if (live.cancelledCount) parts.push(`${live.cancelledCount} cancelled`);
  return parts.join(" · ");
}

/**
 * The Today screen: greeting and date, Upload resource and Take register,
 * the navy card for the lesson on now (or next), "Your day", "Needs your
 * attention", the setup card and one card per class. Everything clock-driven
 * is recomputed from `nowMs`, so the page moves on without a refetch.
 *
 * @param props - See {@link TodayViewProps}.
 * @returns The screen.
 */
export function TodayView({ today, nowMs, firstName, onUpload, onTour }: TodayViewProps) {
  const live = useMemo(() => computeLiveToday(today, nowMs), [today, nowMs]);
  const rows = useMemo(() => buildDayRows(live.lessons, today.periods), [live.lessons, today.periods]);
  const groups = useMemo(() => rows.flatMap((row) => (row.type === "lesson" ? [row.group] : [])), [rows]);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const openGroup: LessonGroup | null = groups.find((g) => g.key === openKey) ?? null;

  const register = pickRegisterAction(today.registers, today.date, today.schoolDay.isSchoolDay);
  const registerOverdue = register.kind === "take" && Boolean(registerDeadline(register.register, nowMs, today.timezone)?.overdue);
  const emptyMessage = emptyDayMessage(today);
  const termLine = today.term ? `${today.term.name}${today.weekNumber ? `, week ${today.weekNumber}` : ""}` : "";
  const showSetup = today.setup.percent < 100 && today.setup.steps.some((s) => !s.done);

  return (
    <div className={`${pagePad} flex flex-col gap-[18px]`}>
      <div className="flex flex-wrap items-end justify-between gap-3.5">
        <div>
          <h1 className={pageTitle}>
            Good {live.greeting}, {firstName}
          </h1>
          <p className="mt-[5px] text-[15px] text-tl-muted">{[longDate(today.date), termLine].filter(Boolean).join(" · ")}</p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <button type="button" className={ghostButton} onClick={() => onUpload()} title="Share a worksheet, slides or a video with one of your classes">
            Upload resource
          </button>
          {register.kind === "take" ? (
            <Link
              href={register.href}
              className={primaryButton}
              title={registerButtonTip(register.register, nowMs, today.timezone)}
              data-overdue={registerOverdue || undefined}
            >
              Take register
            </Link>
          ) : register.kind === "submitted" ? (
            <span className={`${pill} min-h-[44px] rounded-[14px] bg-tl-success-bg px-[18px] text-sm text-tl-success`} role="status">
              ✓ Register submitted
            </span>
          ) : null}
        </div>
      </div>

      {today.schoolDay.endsEarlyAt ? (
        <p role="status" className="rounded-2xl border border-tl-line bg-tl-warning-bg px-4 py-3 text-sm font-bold text-tl-warning">
          School closes early today at {displayTime(today.schoolDay.endsEarlyAt)}. Lessons after that are cancelled.
        </p>
      ) : null}

      {today.schoolDay.reason === "no_term" && today.lessons.length > 0 ? (
        <p role="status" className="rounded-2xl border border-tl-line bg-tl-subtle px-4 py-3 text-sm font-bold text-tl-body">
          There is no current term today, so registers are not taken. Your timetable is shown as usual.
        </p>
      ) : null}

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-[18px] min-[1180px]:grid-cols-2">
        {live.phase.kind !== "none" ? (
          <div className="order-1 min-[1180px]:col-start-2" data-guide="today-now">
            <NowCard
              phase={live.phase}
              clock={live.clock}
              groupOf={(lesson) => groups.find((g) => g.lessons.some((l) => l.id === lesson.id))}
              onOpenLesson={setOpenKey}
            />
          </div>
        ) : null}

        <section
          aria-labelledby="day-title"
          data-guide="today-day"
          className={`${card} order-2 min-[1180px]:col-start-1 min-[1180px]:row-span-2 min-[1180px]:row-start-1`}
        >
          <div className="mb-3 flex items-start justify-between gap-2.5">
            <div>
              <h2 id="day-title" className={cardTitle}>
                Your day
              </h2>
              <p className="mt-1 text-sm text-tl-muted">{daySummary(live, today)}</p>
            </div>
            <Link href="/timetable" className={textLink} title="Open the full week">
              Full timetable →
            </Link>
          </div>
          {emptyMessage ? (
            <p className="py-2 text-sm leading-relaxed text-tl-muted">{emptyMessage}</p>
          ) : (
            <DayList rows={rows} clock={live.clock} onOpen={setOpenKey} />
          )}
        </section>

        <div className="order-3 min-[1180px]:col-start-2">
          <AttentionCard items={today.attention} registers={today.registers} nowMs={nowMs} timezone={today.timezone} />
        </div>
      </div>

      {showSetup || today.classes.length ? (
        <div className="grid gap-[18px] [grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr))]">
          {showSetup ? <SetupCard percent={today.setup.percent} steps={today.setup.steps} onTour={onTour} onUpload={() => onUpload()} /> : null}
          {today.classes.map((cls) => (
            <ClassCard key={cls.id} cls={cls} timezone={today.timezone} />
          ))}
        </div>
      ) : null}

      <LessonSheet
        group={openGroup}
        termId={today.term?.id}
        onClose={() => setOpenKey(null)}
        onShareResource={(courseId, week) => {
          setOpenKey(null);
          onUpload(courseId, week);
        }}
      />
    </div>
  );
}
