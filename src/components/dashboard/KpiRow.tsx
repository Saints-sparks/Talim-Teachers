"use client";

import React from "react";
import { BookOpen, Calendar, CheckCircle2, ClipboardList, School, Users } from "lucide-react";
import type { TeacherDashboard } from "@/types/dashboard";
import { KpiCard, type DashboardStyles } from "./primitives";

/** Props for {@link KpiRow}. */
export interface KpiRowProps {
  styles: DashboardStyles;
  dashboard: TeacherDashboard;
}

/**
 * The six-tile KPI row: today's classes, subjects, classes, students,
 * attendance completion and pending grading. Every number comes from the
 * server aggregate — nothing here is derived or guessed client-side.
 *
 * @param props - See {@link KpiRowProps}.
 * @param props.styles - The dashboard's theme styles.
 * @param props.dashboard - The full dashboard aggregate.
 * @returns The KPI row element.
 */
export function KpiRow({ styles, dashboard }: KpiRowProps) {
  const { kpis, attendanceSummary, gradingSummary } = dashboard;

  return (
    <section className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
      <KpiCard
        icon={<Calendar className="h-5 w-5" />}
        label="Today's Classes"
        value={dashboard.todaySchedule.length}
        subtext={`${attendanceSummary.completed} completed • ${attendanceSummary.pending} left`}
        href="/timetable"
        styles={styles}
      />
      <KpiCard
        icon={<BookOpen className="h-5 w-5" />}
        label="Assigned Subjects"
        value={kpis.assignedSubjects}
        subtext="Current Term"
        href="/subjects"
        styles={styles}
      />
      <KpiCard
        icon={<School className="h-5 w-5" />}
        label="Assigned Classes"
        value={kpis.assignedClasses}
        subtext="Across year groups"
        href="/students"
        styles={styles}
      />
      <KpiCard
        icon={<Users className="h-5 w-5" />}
        label="Total Students"
        value={kpis.totalStudents}
        subtext="Across all classes"
        href="/students"
        styles={styles}
      />
      <KpiCard
        icon={<CheckCircle2 className="h-5 w-5" />}
        label="Attendance Completion"
        value={`${attendanceSummary.completionPercentage}%`}
        subtext="Today"
        href="/attendance"
        tone="success"
        styles={styles}
      />
      <KpiCard
        icon={<ClipboardList className="h-5 w-5" />}
        label="Pending Grading"
        value={gradingSummary.pendingGrades}
        subtext="Requires attention"
        href="/grading"
        tone="warning"
        styles={styles}
      />
    </section>
  );
}

export default KpiRow;
