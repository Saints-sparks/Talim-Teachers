"use client";

import React from "react";
import Layout from "@/components/Layout";
import { ApiErrorState } from "@/components/states";
import { useAuth } from "@/app/context/AuthContext";
import { useTeacherOnboarding } from "@/app/context/OnboardingContext";
import { useCurrentTerm } from "@/hooks/academic/useCurrentTerm";
import { useTeacherDashboard } from "@/hooks/dashboard/useTeacherDashboard";
import { DashboardHero } from "@/components/dashboard/DashboardHero";
import { SetupProgressCard } from "@/components/dashboard/SetupProgressCard";
import { KpiRow } from "@/components/dashboard/KpiRow";
import { TodayScheduleCard, WeeklyTimetableCard } from "@/components/dashboard/ScheduleCards";
import { GradingSummaryCard, AttendanceSummaryCard, ResourcesSummaryCard } from "@/components/dashboard/GradingAndAttendanceCards";
import { RecentActivityCard } from "@/components/dashboard/RecentActivityCard";
import { QuickLinks } from "@/components/dashboard/QuickLinks";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import { useDashboardStyles } from "@/components/dashboard/primitives";

/**
 * Builds the current-term label shown in the hero ("First Term · 2025/2026"),
 * or an empty string while the term has not loaded — never a guessed date.
 *
 * @param termName - The current term's name, if loaded.
 * @param yearName - The academic year's name, if loaded.
 * @returns The label to render, or an empty string.
 */
function formatTermLabel(termName?: string, yearName?: string): string {
  if (!termName) return "";
  return yearName ? `${termName} · ${yearName}` : termName;
}

/**
 * The teacher dashboard. Every section reads from one server aggregate
 * (`useTeacherDashboard`) plus the shared current-term query — see
 * `src/components/dashboard/**` for the extracted sections and
 * `src/hooks/dashboard/useTeacherDashboard.ts` for the data.
 *
 * @returns The Dashboard page element.
 */
export default function DashboardPage() {
  const styles = useDashboardStyles();
  const { user } = useAuth();
  const onboarding = useTeacherOnboarding();
  const { data: dashboard, isLoading, error, refetch } = useTeacherDashboard();
  const { data: currentTerm } = useCurrentTerm();

  if (isLoading) return <DashboardSkeleton styles={styles} />;

  if (error || !dashboard) {
    return (
      <Layout>
        <main className="min-h-full px-4 py-6 sm:px-6 lg:px-8" style={styles.page}>
          <div className="mx-auto max-w-[1280px]">
            <ApiErrorState error={error} fallback="We couldn't load your dashboard." onRetry={() => refetch()} />
          </div>
        </main>
      </Layout>
    );
  }

  const schoolName = user?.schoolName || (typeof user?.schoolId === "object" ? user.schoolId?.name : "") || "your school";
  const teacherName = dashboard.kpis.firstName || user?.firstName || "Teacher";
  const termLabel = formatTermLabel(
    currentTerm?.name,
    typeof currentTerm?.academicYearId === "object" ? currentTerm.academicYearId?.name : undefined,
  );
  const showSetupCard = !onboarding.setupDismissed && dashboard.setupProgress.percent < 100;

  return (
    <Layout>
      <main className="min-h-full px-4 py-6 sm:px-6 lg:px-8" style={styles.page}>
        <div className="mx-auto max-w-[1280px] space-y-5">
          <DashboardHero styles={styles} teacherName={teacherName} schoolName={schoolName} termLabel={termLabel} />

          {showSetupCard && <SetupProgressCard styles={styles} progress={dashboard.setupProgress} />}

          <KpiRow styles={styles} dashboard={dashboard} />

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <TodayScheduleCard styles={styles} schedule={dashboard.todaySchedule} />
            <WeeklyTimetableCard styles={styles} weeklySummary={dashboard.weeklyTimetableSummary} onRefresh={() => refetch()} />
            <GradingSummaryCard styles={styles} summary={dashboard.gradingSummary} />
            <AttendanceSummaryCard styles={styles} summary={dashboard.attendanceSummary} />
            <ResourcesSummaryCard styles={styles} summary={dashboard.resourcesSummary} />
            <RecentActivityCard styles={styles} activity={dashboard.recentActivity} />
          </section>

          <QuickLinks styles={styles} />
        </div>
      </main>
    </Layout>
  );
}
