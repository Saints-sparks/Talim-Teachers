"use client";

import React from "react";
import { AlertCircle, CheckCircle2, ClipboardList } from "lucide-react";
import type { DashboardAttendanceSummary, DashboardGradingSummary } from "@/types/dashboard";
import { CounterRow, EmptyState, SectionCard, TextAction, toneStyles, type DashboardStyles, type StatusTone } from "./primitives";

/** Props for {@link GradingSummaryCard}. */
export interface GradingSummaryCardProps {
  styles: DashboardStyles;
  summary: DashboardGradingSummary;
}

/**
 * Grading counters for the current term: active assessments, pending
 * grades, published results and results flagged for review.
 *
 * @param props - See {@link GradingSummaryCardProps}.
 * @param props.styles - The dashboard's theme styles.
 * @param props.summary - The grading summary from the server aggregate.
 * @returns The card element.
 */
export function GradingSummaryCard({ styles, summary }: GradingSummaryCardProps) {
  const rows: Array<{ label: string; value: number; icon: React.ElementType; tone: StatusTone }> = [
    { label: "Active Assessments", value: summary.activeAssessments, icon: CheckCircle2, tone: "primary" },
    { label: "Pending Grades", value: summary.pendingGrades, icon: ClipboardList, tone: "warning" },
    { label: "Published Results", value: summary.publishedResults, icon: CheckCircle2, tone: "success" },
    { label: "Needs Review", value: summary.needsReview, icon: AlertCircle, tone: "error" },
  ];

  return (
    <SectionCard title="Grading & Assessments" action={<TextAction href="/grading" label="View all" styles={styles} />} styles={styles}>
      {rows.map((item) => {
        const Icon = item.icon;
        return (
          <div key={item.label} className="flex items-center gap-3 border-b py-3 last:border-b-0" style={{ borderColor: styles.colors.borderLight }}>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={toneStyles(item.tone, styles)}>
              <Icon className="h-4 w-4" />
            </div>
            <span className="flex-1 text-sm font-semibold" style={{ color: styles.colors.textSecondary }}>
              {item.label}
            </span>
            <span className="text-sm font-bold" style={{ color: styles.colors.text }}>
              {item.value}
            </span>
          </div>
        );
      })}
    </SectionCard>
  );
}

/** Props for {@link AttendanceSummaryCard}. */
export interface AttendanceSummaryCardProps {
  styles: DashboardStyles;
  summary: DashboardAttendanceSummary;
}

/**
 * Today's attendance-completion ring plus a completed/pending/not-started
 * breakdown.
 *
 * @param props - See {@link AttendanceSummaryCardProps}.
 * @param props.styles - The dashboard's theme styles.
 * @param props.summary - The attendance summary from the server aggregate.
 * @returns The card element.
 */
export function AttendanceSummaryCard({ styles, summary }: AttendanceSummaryCardProps) {
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const rows: Array<{ label: string; value: number; tone: StatusTone }> = [
    { label: "Completed", value: summary.completed, tone: "success" },
    { label: "Pending", value: summary.pending, tone: "warning" },
    { label: "Not Started", value: summary.notStarted, tone: "error" },
  ];

  return (
    <SectionCard title="Attendance (Today)" action={<TextAction href="/attendance" label="View attendance" styles={styles} />} styles={styles}>
      {summary.totalTodayClasses > 0 ? (
        <div className="flex flex-col items-center gap-5 sm:flex-row sm:justify-center">
          <div className="relative flex h-36 w-36 items-center justify-center">
            <svg className="h-36 w-36 -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r={radius} stroke={styles.colors.borderLight} strokeWidth="12" fill="none" />
              <circle
                cx="60"
                cy="60"
                r={radius}
                stroke={styles.colors.success}
                strokeWidth="12"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - summary.completionPercentage / 100)}
              />
            </svg>
            <div className="absolute text-center">
              <p className="text-2xl font-bold" style={{ color: styles.colors.text }}>
                {summary.completionPercentage}%
              </p>
              <p className="text-xs" style={{ color: styles.colors.textTertiary }}>
                Completed
              </p>
            </div>
          </div>
          <div className="space-y-4">
            {rows.map((item) => (
              <div key={item.label} className="flex min-w-44 items-center gap-3">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: toneStyles(item.tone, styles).color }} />
                <span className="flex-1 text-sm font-semibold" style={{ color: styles.colors.textSecondary }}>
                  {item.label}
                </span>
                <span className="text-sm font-bold" style={{ color: styles.colors.text }}>
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <EmptyState
          icon={<CheckCircle2 className="h-7 w-7" />}
          title="No attendance records yet"
          description="Attendance completion will update after today's timetable is available."
          styles={styles}
        />
      )}
    </SectionCard>
  );
}

/** Props for {@link ResourcesSummaryCard}. */
export interface ResourcesSummaryCardProps {
  styles: DashboardStyles;
  summary: {
    coursesMissingResources: number;
    coursesMissingCurriculum: number;
    recentlyUpdatedResources: number;
  };
}

/**
 * Resource and curriculum coverage across the teacher's courses.
 *
 * @param props - See {@link ResourcesSummaryCardProps}.
 * @param props.styles - The dashboard's theme styles.
 * @param props.summary - The resources summary from the server aggregate.
 * @returns The card element.
 */
export function ResourcesSummaryCard({ styles, summary }: ResourcesSummaryCardProps) {
  return (
    <SectionCard title="Resources & Curriculum" action={<TextAction href="/resources" label="View all" styles={styles} />} styles={styles}>
      <CounterRow label="Courses missing resources" value={summary.coursesMissingResources} tone="error" styles={styles} />
      <CounterRow label="Courses missing curriculum" value={summary.coursesMissingCurriculum} tone="warning" styles={styles} />
      <CounterRow label="Recently updated resources" value={summary.recentlyUpdatedResources} tone="success" styles={styles} />
    </SectionCard>
  );
}
