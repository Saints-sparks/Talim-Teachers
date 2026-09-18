import type { ReactNode } from "react";

/** @deprecated Unused; kept for `src/components/metric-card.tsx`, which nothing currently imports. */
export interface MetricCardProps {
  icon: ReactNode;
  value: string | number;
  label: string;
  link: string;
}

/** @deprecated Unused; kept for `src/components/schedule-timeline.tsx`, which nothing currently imports. */
export interface ScheduleItem {
  subject: string;
  startTime: string;
  endTime: string;
}

/** @deprecated Unused; kept for `src/components/schedule-timeline.tsx`, which nothing currently imports. */
export interface ScheduleTimelineProps {
  schedule: ScheduleItem[];
  currentTime: string;
}

/** The teacher-level counters shown on the dashboard's KPI row. Mirrors `TeacherDashboardKpiDto`. */
export interface TeacherKPIs {
  teacherId: string;
  firstName: string;
  lastName: string;
  email: string;
  userAvatar?: string;
  assignedSubjects: number;
  addedResources: number;
  recordedAttendance: number;
  assignedClasses: number;
  totalStudents: number;
  specialization: string;
  yearsOfExperience: number;
}

/** One entry of a teacher's weekly timetable. Mirrors `TeacherDashboardScheduleItemDto`. */
export interface DashboardScheduleItem {
  id: string;
  day: string;
  startTime: string;
  endTime: string;
  time: string;
  courseId: string;
  course: string;
  subject: string;
  classId: string;
  class: string;
  status?: "Completed" | "In Progress" | "Upcoming";
}

/** How many classes fall on one weekday. Mirrors `TeacherDashboardDaySummaryDto`. */
export interface DashboardDaySummary {
  day: string;
  shortDay: string;
  classes: number;
}

/** Grading counters for the current term. Mirrors `TeacherDashboardGradingSummaryDto`. */
export interface DashboardGradingSummary {
  activeAssessments: number;
  pendingGrades: number;
  publishedResults: number;
  needsReview: number;
  recordedGrades: number;
}

/** Today's attendance-completion counters. Mirrors `TeacherDashboardAttendanceSummaryDto`. */
export interface DashboardAttendanceSummary {
  completionPercentage: number;
  completed: number;
  pending: number;
  notStarted: number;
  totalTodayClasses: number;
}

/** Resource and curriculum coverage. Mirrors `TeacherDashboardResourcesSummaryDto`. */
export interface DashboardResourcesSummary {
  coursesMissingResources: number;
  coursesMissingCurriculum: number;
  recentlyUpdatedResources: number;
  totalResources: number;
}

/** One recent event on the teacher's timeline. Mirrors `TeacherDashboardActivityDto`. */
export interface DashboardActivity {
  type: "resource" | "grading" | "attendance";
  label: string;
  timestamp: string;
  href?: string;
}

/** One setup-checklist item shown on the dashboard's progress card. */
export interface DashboardSetupCheck {
  label: string;
  done: boolean;
}

/** Setup-checklist completion. Mirrors `TeacherDashboardSetupProgressDto`. */
export interface DashboardSetupProgress {
  percent: number;
  checks: DashboardSetupCheck[];
}

/**
 * The full aggregate `GET /teachers/dashboard/me` returns — every number and
 * list the dashboard renders, computed server-side so the page never derives
 * "today's schedule" or "pending grading" from partial client-side state.
 * Mirrors `TeacherDashboardDto`.
 */
export interface TeacherDashboard {
  teacherId: string;
  teacherProfileId: string;
  schoolId: string;
  kpis: TeacherKPIs;
  todaySchedule: DashboardScheduleItem[];
  weeklyTimetableSummary: DashboardDaySummary[];
  timetable: Record<string, DashboardScheduleItem[]>;
  gradingSummary: DashboardGradingSummary;
  attendanceSummary: DashboardAttendanceSummary;
  resourcesSummary: DashboardResourcesSummary;
  recentActivity: DashboardActivity[];
  setupProgress: DashboardSetupProgress;
}

/** @deprecated Unused; nothing renders `DashboardProps` any more. */
export interface DashboardProps {
  metrics: {
    subjects: number;
    gradeScore: number;
    attendancePercentage: number;
  };
}
