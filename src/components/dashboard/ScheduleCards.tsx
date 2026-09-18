"use client";

import React from "react";
import { Calendar, RefreshCw } from "lucide-react";
import type { DashboardDaySummary, DashboardScheduleItem } from "@/types/dashboard";
import { EmptyState, SectionCard, TextAction, toneStyles, type DashboardStyles, type StatusTone } from "./primitives";

/**
 * Colour for a schedule status pill.
 *
 * @param status - The class's computed status.
 * @returns The tone to draw it in.
 */
function toneForStatus(status?: DashboardScheduleItem["status"]): StatusTone {
  if (status === "Completed") return "success";
  if (status === "In Progress") return "primary";
  return "warning";
}

/**
 * One status pill on a schedule row.
 *
 * @param props - The status and the dashboard's theme styles.
 * @param props.status - The class's computed status.
 * @param props.styles - The dashboard's theme styles.
 * @returns The pill element.
 */
function StatusBadge({ status, styles }: { status?: DashboardScheduleItem["status"]; styles: DashboardStyles }) {
  return (
    <span className="rounded-full px-2 py-1 text-xs font-bold" style={toneStyles(toneForStatus(status), styles)}>
      {status ?? "Upcoming"}
    </span>
  );
}

/** Props for {@link TodayScheduleCard}. */
export interface TodayScheduleCardProps {
  styles: DashboardStyles;
  schedule: DashboardScheduleItem[];
}

/**
 * Up to four of today's classes, in order, each with its computed status.
 *
 * @param props - See {@link TodayScheduleCardProps}.
 * @param props.styles - The dashboard's theme styles.
 * @param props.schedule - Today's schedule, already ordered by the server.
 * @returns The card element.
 */
export function TodayScheduleCard({ styles, schedule }: TodayScheduleCardProps) {
  return (
    <SectionCard title="Today's Schedule" action={<TextAction href="/timetable" label="Next Class" styles={styles} />} styles={styles}>
      {schedule.length > 0 ? (
        <div className="space-y-3">
          {schedule.slice(0, 4).map((item, index) => (
            <div key={`${item.id}-${index}`} className="flex items-center gap-3">
              <div className="w-16 shrink-0 text-xs font-bold" style={{ color: styles.colors.textSecondary }}>
                <p>{item.startTime}</p>
                <p className="font-medium" style={{ color: styles.colors.textTertiary }}>
                  {item.endTime}
                </p>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold" style={{ color: styles.colors.text }}>
                  {item.class} - {item.course || item.subject}
                </p>
                <p className="truncate text-xs" style={{ color: styles.colors.textTertiary }}>
                  {item.subject}
                </p>
              </div>
              <StatusBadge status={item.status} styles={styles} />
            </div>
          ))}
          <div className="border-t pt-3 text-center" style={{ borderColor: styles.colors.borderLight }}>
            <TextAction href="/timetable" label="View full schedule" styles={styles} />
          </div>
        </div>
      ) : (
        <EmptyState
          icon={<Calendar className="h-7 w-7" />}
          title="No classes scheduled today"
          description="Your classes for today will appear here once a timetable is assigned."
          action={<TextAction href="/timetable" label="View timetable" styles={styles} />}
          styles={styles}
        />
      )}
    </SectionCard>
  );
}

/** Props for {@link WeeklyTimetableCard}. */
export interface WeeklyTimetableCardProps {
  styles: DashboardStyles;
  weeklySummary: DashboardDaySummary[];
  onRefresh: () => void;
}

/**
 * A five-day class-count grid (Monday to Friday).
 *
 * @param props - See {@link WeeklyTimetableCardProps}.
 * @param props.styles - The dashboard's theme styles.
 * @param props.weeklySummary - Class counts per weekday, from the server.
 * @param props.onRefresh - Retries the dashboard query.
 * @returns The card element.
 */
export function WeeklyTimetableCard({ styles, weeklySummary, onRefresh }: WeeklyTimetableCardProps) {
  const hasTimetable = weeklySummary.some((day) => day.classes > 0);

  return (
    <SectionCard title="Weekly Timetable" action={<TextAction href="/timetable" label="View Full" styles={styles} />} styles={styles}>
      {hasTimetable ? (
        <div className="grid grid-cols-5 gap-2">
          {weeklySummary.map((day) => (
            <div
              key={day.day}
              className="rounded-xl border p-3 text-center"
              style={{ borderColor: styles.colors.borderLight, backgroundColor: styles.colors.surfaceAlt }}
            >
              <p className="text-xs font-bold" style={{ color: styles.colors.textSecondary }}>
                {day.shortDay}
              </p>
              <p className="mt-2 text-xl font-bold" style={{ color: styles.colors.text }}>
                {day.classes}
              </p>
              <p className="text-xs" style={{ color: styles.colors.textTertiary }}>
                classes
              </p>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Calendar className="h-7 w-7" />}
          title="No timetable assigned yet"
          description="You do not have a timetable set for this week."
          action={
            <button
              type="button"
              onClick={onRefresh}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold"
              style={{ borderColor: styles.colors.border, color: styles.colors.primary, backgroundColor: styles.colors.surface }}
            >
              <RefreshCw className="h-4 w-4" /> Refresh
            </button>
          }
          styles={styles}
        />
      )}
    </SectionCard>
  );
}
