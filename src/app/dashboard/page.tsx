"use client";

import React, { CSSProperties, ReactNode, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  BookOpen,
  Calendar,
  CheckCircle2,
  Circle,
  ClipboardList,
  Clock,
  FileText,
  FolderOpen,
  MessageSquare,
  RefreshCw,
  School,
  Upload,
  Users,
} from "lucide-react";
import Layout from "@/components/Layout";
import { useAppContext } from "../context/AppContext";
import { useTeacherOnboarding } from "../context/OnboardingContext";
import { useTeacherKPIs } from "../hooks/useTeacherKPIs";
import { useTheme } from "@/providers/theme-provider";

type TimetableEntry = {
  day?: string;
  startTime?: string;
  endTime?: string;
  time?: string;
  classId?: unknown;
};

type TeacherCourse = {
  _id?: string;
  title?: string;
  courseCode?: string;
  classId?: unknown;
  timetable?: TimetableEntry[];
};

type TodayClass = {
  startTime: string;
  endTime: string;
  title: string;
  subtitle: string;
  status: "Completed" | "In Progress" | "Upcoming";
};

type StatusTone = "primary" | "success" | "warning" | "error" | "muted";

const withAlpha = (color: string, alpha: string) =>
  color.startsWith("#") ? `${color}${alpha}` : color;

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
};

const getTodayName = () =>
  new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(new Date());

const parseTimeToMinutes = (time?: string) => {
  if (!time) return 0;
  const match = time.trim().match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?/i);
  if (!match) return 0;
  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const period = match[3]?.toUpperCase();

  if (period === "PM" && hours !== 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;

  return hours * 60 + minutes;
};

const formatDisplayTime = (time?: string) => {
  if (!time) return "--";
  const minutes = parseTimeToMinutes(time);
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const period = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 || 12;
  return `${hour12.toString().padStart(2, "0")}:${mins
    .toString()
    .padStart(2, "0")} ${period}`;
};

const getStatusForTime = (startTime?: string, endTime?: string): TodayClass["status"] => {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const start = parseTimeToMinutes(startTime);
  const end = parseTimeToMinutes(endTime);

  if (end && currentMinutes > end) return "Completed";
  if (start && end && currentMinutes >= start && currentMinutes <= end) {
    return "In Progress";
  }
  return "Upcoming";
};

const getClassLabel = (classId: unknown, classes: any[]) => {
  if (classId && typeof classId === "object") {
    const value = classId as { name?: string; _id?: string; id?: string };
    if (value.name) return value.name;
    const found = classes.find((item) => item._id === value._id || item._id === value.id);
    if (found?.name) return found.name;
  }

  if (typeof classId === "string") {
    const found = classes.find((item) => item._id === classId || item.id === classId);
    if (found?.name) return found.name;
  }

  return "Assigned Class";
};

const getTodaySchedule = (courses: TeacherCourse[], classes: any[]): TodayClass[] => {
  const today = getTodayName();

  return courses
    .flatMap((course) =>
      (course.timetable || [])
        .filter((entry) => entry.day === today)
        .map((entry) => ({
          startTime: entry.startTime || entry.time?.split("-")[0]?.trim() || "",
          endTime: entry.endTime || entry.time?.split("-")[1]?.trim() || "",
          title: `${getClassLabel(entry.classId || course.classId, classes)} - ${
            course.title || "Subject"
          }`,
          subtitle: course.courseCode || "Course",
          status: getStatusForTime(entry.startTime, entry.endTime),
        }))
    )
    .sort((a, b) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime));
};

const EmptyState = ({
  icon,
  title,
  description,
  action,
  styles,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  styles: ReturnType<typeof useDashboardStyles>;
}) => (
  <div className="flex min-h-[170px] flex-col items-center justify-center text-center">
    <div
      className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl"
      style={{ backgroundColor: withAlpha(styles.colors.primary, "12"), color: styles.colors.primary }}
    >
      {icon}
    </div>
    <p className="text-sm font-semibold" style={{ color: styles.colors.text }}>
      {title}
    </p>
    <p className="mt-1 max-w-xs text-xs" style={{ color: styles.colors.textTertiary }}>
      {description}
    </p>
    {action ? <div className="mt-4">{action}</div> : null}
  </div>
);

function useDashboardStyles() {
  const { colors, isDark } = useTheme();

  const card: CSSProperties = {
    backgroundColor: colors.surface,
    borderColor: colors.borderLight,
    boxShadow: isDark ? "0 16px 40px rgba(0, 0, 0, 0.18)" : "0 16px 40px rgba(15, 23, 42, 0.04)",
  };

  return {
    colors,
    isDark,
    page: {
      backgroundColor: colors.bg,
      color: colors.text,
    } as CSSProperties,
    card,
    softCard: {
      ...card,
      backgroundColor: colors.surface,
    } as CSSProperties,
    primaryText: isDark ? colors.text : colors.surface,
  };
}

function toneStyles(tone: StatusTone, styles: ReturnType<typeof useDashboardStyles>) {
  const color =
    tone === "success"
      ? styles.colors.success
      : tone === "warning"
        ? styles.colors.warning
        : tone === "error"
          ? styles.colors.error
          : tone === "muted"
            ? styles.colors.textTertiary
            : styles.colors.primary;

  return {
    color,
    backgroundColor: withAlpha(color, tone === "muted" ? "14" : "16"),
  };
}

function SkeletonBlock({
  className,
  styles,
}: {
  className: string;
  styles: ReturnType<typeof useDashboardStyles>;
}) {
  return (
    <div
      className={`animate-pulse rounded-2xl ${className}`}
      style={{ backgroundColor: styles.colors.surfaceAlt }}
    />
  );
}

function DashboardSkeleton({ styles }: { styles: ReturnType<typeof useDashboardStyles> }) {
  return (
    <Layout>
      <main className="min-h-full px-4 py-6 sm:px-6 lg:px-8" style={styles.page}>
        <div className="mx-auto max-w-[1280px] space-y-5">
          <SkeletonBlock className="h-24" styles={styles} />
          <SkeletonBlock className="h-24" styles={styles} />
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <SkeletonBlock key={index} className="h-36" styles={styles} />
            ))}
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <SkeletonBlock className="h-72" styles={styles} />
            <SkeletonBlock className="h-72" styles={styles} />
          </div>
        </div>
      </main>
    </Layout>
  );
}

function HeroAction({
  icon,
  label,
  href,
  primary = false,
  styles,
}: {
  icon: ReactNode;
  label: string;
  href: string;
  primary?: boolean;
  styles: ReturnType<typeof useDashboardStyles>;
}) {
  return (
    <Link
      href={href}
      className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold transition-transform hover:-translate-y-0.5"
      style={{
        backgroundColor: primary ? styles.colors.primary : styles.colors.surface,
        borderColor: primary ? styles.colors.primary : styles.colors.border,
        color: primary ? styles.primaryText : styles.colors.primary,
      }}
    >
      {icon}
      {label}
    </Link>
  );
}

function SetupProgressCard({
  styles,
  checks,
  percent,
}: {
  styles: ReturnType<typeof useDashboardStyles>;
  checks: Array<{ label: string; done: boolean }>;
  percent: number;
}) {
  return (
    <section className="rounded-2xl border p-4" style={styles.card}>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-4">
          <div className="relative flex h-16 w-16 shrink-0 items-center justify-center">
            <svg className="h-16 w-16 -rotate-90" viewBox="0 0 64 64">
              <circle
                cx="32"
                cy="32"
                r="25"
                stroke={styles.colors.borderLight}
                strokeWidth="7"
                fill="none"
              />
              <circle
                cx="32"
                cy="32"
                r="25"
                stroke={styles.colors.primary}
                strokeWidth="7"
                strokeLinecap="round"
                fill="none"
                strokeDasharray={`${2 * Math.PI * 25}`}
                strokeDashoffset={`${2 * Math.PI * 25 * (1 - percent / 100)}`}
              />
            </svg>
            <span className="absolute text-xs font-bold" style={{ color: styles.colors.success }}>
              {percent}%
            </span>
          </div>
          <div>
            <h2 className="text-base font-bold" style={{ color: styles.colors.text }}>
              Complete Your Teacher Setup
            </h2>
            <p className="mt-1 max-w-sm text-sm" style={{ color: styles.colors.textSecondary }}>
              You&apos;re almost ready. Complete the remaining steps to unlock all features.
            </p>
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3 xl:justify-center">
          {checks.map((item) => (
            <div
              key={item.label}
              className="inline-flex items-center gap-2 rounded-full px-2 py-1 text-xs font-semibold"
              style={{
                color: item.done ? styles.colors.textSecondary : styles.colors.primary,
              }}
            >
              {item.done ? (
                <CheckCircle2 className="h-4 w-4" style={{ color: styles.colors.success }} />
              ) : (
                <Circle className="h-4 w-4" style={{ color: styles.colors.primary }} />
              )}
              {item.label}
            </div>
          ))}
        </div>

        <Link
          href="/onboarding/setup"
          className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold"
          style={{
            borderColor: styles.colors.border,
            color: styles.colors.primary,
            backgroundColor: styles.colors.surfaceAlt,
          }}
        >
          Continue Setup <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}

function KpiCard({
  icon,
  label,
  value,
  subtext,
  href,
  tone = "primary",
  delta,
  styles,
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
  subtext: string;
  href: string;
  tone?: StatusTone;
  delta?: string;
  styles: ReturnType<typeof useDashboardStyles>;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border p-4 transition-transform hover:-translate-y-0.5"
      style={styles.card}
    >
      <div className="mb-5 flex items-start justify-between gap-2">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl"
          style={toneStyles(tone, styles)}
        >
          {icon}
        </div>
        {delta ? (
          <span
            className="rounded-full px-2 py-1 text-xs font-bold"
            style={toneStyles(delta.startsWith("-") ? "error" : "success", styles)}
          >
            {delta}
          </span>
        ) : null}
      </div>
      <p className="text-sm font-semibold" style={{ color: styles.colors.text }}>
        {label}
      </p>
      <p className="mt-1 text-3xl font-bold leading-tight" style={{ color: styles.colors.text }}>
        {value}
      </p>
      <p className="mt-1 text-xs" style={{ color: styles.colors.textTertiary }}>
        {subtext}
      </p>
      <span
        className="mt-5 inline-flex items-center gap-1 text-xs font-semibold group-hover:underline"
        style={{ color: styles.colors.primary }}
      >
        View all <ArrowRight className="h-3.5 w-3.5" />
      </span>
    </Link>
  );
}

function SectionCard({
  title,
  action,
  children,
  styles,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  styles: ReturnType<typeof useDashboardStyles>;
}) {
  return (
    <section className="rounded-2xl border p-4" style={styles.card}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold" style={{ color: styles.colors.text }}>
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function TextAction({
  href,
  label,
  styles,
}: {
  href: string;
  label: string;
  styles: ReturnType<typeof useDashboardStyles>;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-xs font-bold hover:underline"
      style={{ color: styles.colors.primary }}
    >
      {label} <ArrowRight className="h-3.5 w-3.5" />
    </Link>
  );
}

function StatusBadge({
  status,
  styles,
}: {
  status: TodayClass["status"];
  styles: ReturnType<typeof useDashboardStyles>;
}) {
  const tone: StatusTone =
    status === "Completed" ? "success" : status === "In Progress" ? "primary" : "warning";

  return (
    <span className="rounded-full px-2 py-1 text-xs font-bold" style={toneStyles(tone, styles)}>
      {status}
    </span>
  );
}

function CircularProgress({
  value,
  styles,
}: {
  value: number;
  styles: ReturnType<typeof useDashboardStyles>;
}) {
  const radius = 48;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="relative flex h-36 w-36 items-center justify-center">
      <svg className="h-36 w-36 -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={radius} stroke={styles.colors.borderLight} strokeWidth="12" fill="none" />
        <circle
          cx="60"
          cy="60"
          r={radius}
          stroke={styles.colors.warning}
          strokeWidth="12"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * 0.25}
        />
        <circle
          cx="60"
          cy="60"
          r={radius}
          stroke={styles.colors.success}
          strokeWidth="12"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - value / 100)}
        />
      </svg>
      <div className="absolute text-center">
        <p className="text-2xl font-bold" style={{ color: styles.colors.text }}>
          {value}%
        </p>
        <p className="text-xs" style={{ color: styles.colors.textTertiary }}>
          Completed
        </p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const styles = useDashboardStyles();
  const { user, teacherData, classes, courses } = useAppContext();
  const { kpis, loading, error, refreshKPIs } = useTeacherKPIs();
  const onboarding = useTeacherOnboarding();

  const normalizedCourses = useMemo(
    () => ((teacherData?.assignedCourses || courses || []) as TeacherCourse[]),
    [teacherData?.assignedCourses, courses]
  );

  const todaySchedule = useMemo(
    () => getTodaySchedule(normalizedCourses, classes),
    [classes, normalizedCourses]
  );

  const completedClasses = todaySchedule.filter((item) => item.status === "Completed").length;
  const inProgressClasses = todaySchedule.filter((item) => item.status === "In Progress").length;
  const upcomingClasses = todaySchedule.filter((item) => item.status === "Upcoming").length;
  const attendanceCompletion = todaySchedule.length
    ? Math.round((completedClasses / todaySchedule.length) * 100)
    : 0;
  const hasTimetable = normalizedCourses.some((course) => (course.timetable || []).length > 0);
  const assignedSubjects = kpis?.assignedSubjects || normalizedCourses.length || 0;
  const assignedClasses = kpis?.assignedClasses || classes.length || 0;
  const addedResources = kpis?.addedResources || 0;
  const totalStudents = kpis?.totalStudents || 0;
  const pendingGrading = 0;

  const setupChecks = [
    {
      label: "Profile Setup",
      done: onboarding.isStepComplete("teacher-profile") || Boolean(teacherData || kpis),
    },
    { label: "Subjects", done: assignedSubjects > 0 },
    { label: "Classes", done: assignedClasses > 0 },
    { label: "Timetable", done: hasTimetable },
    {
      label: "Resources",
      done: addedResources > 0 || onboarding.isStepComplete("upload-resource"),
    },
  ];
  const setupPercent = Math.round(
    (setupChecks.filter((item) => item.done).length / setupChecks.length) * 100
  );

  const schoolName =
    user?.schoolName ||
    (typeof user?.schoolId === "object" ? user.schoolId?.name : "") ||
    "Easy Sparks Education Center";
  const teacherName = kpis?.firstName || user?.firstName || "Teacher";

  const resourceSummary = {
    missingResources: Math.max(assignedSubjects - addedResources, 0),
    missingCurriculum: Math.max(assignedSubjects - normalizedCourses.filter((course: any) => course.curriculum).length, 0),
    updatedResources: addedResources,
  };

  if (loading) return <DashboardSkeleton styles={styles} />;

  return (
    <Layout>
      <main className="min-h-full px-4 py-6 sm:px-6 lg:px-8" style={styles.page}>
        <div className="mx-auto max-w-[1280px] space-y-5">
          {error ? (
            <div
              className="flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between"
              style={{
                ...styles.card,
                borderColor: withAlpha(styles.colors.error, "55"),
              }}
            >
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5" style={{ color: styles.colors.error }} />
                <div>
                  <p className="text-sm font-bold" style={{ color: styles.colors.text }}>
                    Unable to load dashboard metrics.
                  </p>
                  <p className="text-sm" style={{ color: styles.colors.textSecondary }}>
                    {error}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={refreshKPIs}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold"
                style={{
                  backgroundColor: styles.colors.primary,
                  color: styles.primaryText,
                }}
              >
                <RefreshCw className="h-4 w-4" /> Try Again
              </button>
            </div>
          ) : null}

          <section className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl" style={{ color: styles.colors.text }}>
                {getGreeting()}, <span style={{ color: styles.colors.primary }}>Mr. {teacherName}</span>!
              </h1>
              <p className="mt-1 text-sm" style={{ color: styles.colors.textSecondary }}>
                Here&apos;s what&apos;s happening at{" "}
                <span className="font-semibold" style={{ color: styles.colors.text }}>
                  {schoolName}
                </span>{" "}
                today.
              </p>
              <div
                className="mt-3 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold"
                style={{
                  backgroundColor: withAlpha(styles.colors.success, "12"),
                  borderColor: withAlpha(styles.colors.success, "22"),
                  color: styles.colors.success,
                }}
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: styles.colors.success }} />
                First Term • 2026/2026
              </div>
            </div>

            <div className="flex gap-3 overflow-x-auto pb-1 lg:pb-0">
              <HeroAction
                href="/attendance"
                label="Mark Attendance"
                icon={<ClipboardList className="h-4 w-4" />}
                styles={styles}
              />
              <HeroAction
                href="/grading"
                label="Continue Grading"
                icon={<CheckCircle2 className="h-4 w-4" />}
                styles={styles}
              />
              <HeroAction
                href="/resources"
                label="Upload Resource"
                icon={<Upload className="h-4 w-4" />}
                primary
                styles={styles}
              />
            </div>
          </section>

          <SetupProgressCard styles={styles} checks={setupChecks} percent={setupPercent} />

          <section className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
            <KpiCard
              icon={<Calendar className="h-5 w-5" />}
              label="Today's Classes"
              value={todaySchedule.length}
              subtext={`${completedClasses} completed • ${upcomingClasses + inProgressClasses} left`}
              href="/timetable"
              delta="+0.0%"
              styles={styles}
            />
            <KpiCard
              icon={<BookOpen className="h-5 w-5" />}
              label="Assigned Subjects"
              value={assignedSubjects}
              subtext="Current Term"
              href="/subjects"
              tone="primary"
              delta="+0.0%"
              styles={styles}
            />
            <KpiCard
              icon={<School className="h-5 w-5" />}
              label="Assigned Classes"
              value={assignedClasses}
              subtext="Across year groups"
              href="/students"
              tone="primary"
              delta="+0.0%"
              styles={styles}
            />
            <KpiCard
              icon={<Users className="h-5 w-5" />}
              label="Total Students"
              value={totalStudents}
              subtext="Across all classes"
              href="/students"
              delta="+2.1%"
              styles={styles}
            />
            <KpiCard
              icon={<CheckCircle2 className="h-5 w-5" />}
              label="Attendance Completion"
              value={`${attendanceCompletion}%`}
              subtext="Today"
              href="/attendance"
              tone="success"
              delta="+5.3%"
              styles={styles}
            />
            <KpiCard
              icon={<ClipboardList className="h-5 w-5" />}
              label="Pending Grading"
              value={pendingGrading}
              subtext="Requires attention"
              href="/grading"
              tone="warning"
              delta="-1.2%"
              styles={styles}
            />
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <SectionCard
              title="Today's Schedule"
              action={<TextAction href="/timetable" label="Next Class" styles={styles} />}
              styles={styles}
            >
              {todaySchedule.length > 0 ? (
                <div className="space-y-3">
                  {todaySchedule.slice(0, 4).map((item, index) => (
                    <div key={`${item.title}-${index}`} className="flex items-center gap-3">
                      <div className="w-16 shrink-0 text-xs font-bold" style={{ color: styles.colors.textSecondary }}>
                        <p>{formatDisplayTime(item.startTime)}</p>
                        <p className="font-medium" style={{ color: styles.colors.textTertiary }}>
                          {formatDisplayTime(item.endTime)}
                        </p>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold" style={{ color: styles.colors.text }}>
                          {item.title}
                        </p>
                        <p className="truncate text-xs" style={{ color: styles.colors.textTertiary }}>
                          {item.subtitle}
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

            <SectionCard
              title="Weekly Timetable"
              action={<TextAction href="/timetable" label="View Full" styles={styles} />}
              styles={styles}
            >
              {hasTimetable ? (
                <div className="grid grid-cols-5 gap-2">
                  {["Mon", "Tue", "Wed", "Thu", "Fri"].map((day) => (
                    <div
                      key={day}
                      className="rounded-xl border p-3 text-center"
                      style={{ borderColor: styles.colors.borderLight, backgroundColor: styles.colors.surfaceAlt }}
                    >
                      <p className="text-xs font-bold" style={{ color: styles.colors.textSecondary }}>
                        {day}
                      </p>
                      <p className="mt-2 text-xl font-bold" style={{ color: styles.colors.text }}>
                        {
                          normalizedCourses.flatMap((course) => course.timetable || []).filter((entry) =>
                            entry.day?.startsWith(day === "Thu" ? "Thurs" : day)
                          ).length
                        }
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
                      onClick={refreshKPIs}
                      className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold"
                      style={{
                        borderColor: styles.colors.border,
                        color: styles.colors.primary,
                        backgroundColor: styles.colors.surface,
                      }}
                    >
                      <RefreshCw className="h-4 w-4" /> Refresh
                    </button>
                  }
                  styles={styles}
                />
              )}
            </SectionCard>

            <SectionCard
              title="Grading & Assessments"
              action={<TextAction href="/grading" label="View all" styles={styles} />}
              styles={styles}
            >
              {[
                { label: "Active Assessments", value: 0, icon: CheckCircle2, tone: "primary" as StatusTone },
                { label: "Pending Grades", value: pendingGrading, icon: ClipboardList, tone: "warning" as StatusTone },
                { label: "Published Results", value: 0, icon: CheckCircle2, tone: "success" as StatusTone },
                { label: "Needs Review", value: 0, icon: AlertCircle, tone: "error" as StatusTone },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.label}
                    className="flex items-center gap-3 border-b py-3 last:border-b-0"
                    style={{ borderColor: styles.colors.borderLight }}
                  >
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

            <SectionCard
              title="Attendance (Today)"
              action={<TextAction href="/attendance" label="View attendance" styles={styles} />}
              styles={styles}
            >
              {todaySchedule.length > 0 ? (
                <div className="flex flex-col items-center gap-5 sm:flex-row sm:justify-center">
                  <CircularProgress value={attendanceCompletion} styles={styles} />
                  <div className="space-y-4">
                    {[
                      { label: "Completed", value: completedClasses, tone: "success" as StatusTone },
                      { label: "Pending", value: upcomingClasses + inProgressClasses, tone: "warning" as StatusTone },
                      { label: "Not Started", value: 0, tone: "error" as StatusTone },
                    ].map((item) => (
                      <div key={item.label} className="flex min-w-44 items-center gap-3">
                        <span
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: toneStyles(item.tone, styles).color }}
                        />
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
                  description="Attendance completion will update after today’s timetable is available."
                  styles={styles}
                />
              )}
            </SectionCard>

            <SectionCard
              title="Resources & Curriculum"
              action={<TextAction href="/resources" label="View all" styles={styles} />}
              styles={styles}
            >
              {[
                { label: "Courses missing resources", value: resourceSummary.missingResources, tone: "error" as StatusTone },
                { label: "Courses missing curriculum", value: resourceSummary.missingCurriculum, tone: "warning" as StatusTone },
                { label: "Recently updated resources", value: resourceSummary.updatedResources, tone: "success" as StatusTone },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-3 border-b py-3 last:border-b-0"
                  style={{ borderColor: styles.colors.borderLight }}
                >
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: toneStyles(item.tone, styles).color }}
                  />
                  <span className="flex-1 text-sm font-semibold" style={{ color: styles.colors.textSecondary }}>
                    {item.label}
                  </span>
                  <span className="text-sm font-bold" style={{ color: toneStyles(item.tone, styles).color }}>
                    {item.value}
                  </span>
                </div>
              ))}
            </SectionCard>

            <SectionCard
              title="Recent Activity"
              action={<TextAction href="/notifications" label="View all" styles={styles} />}
              styles={styles}
            >
              {[
                { icon: MessageSquare, label: "New message from Admin", time: "10 min ago", tone: "primary" as StatusTone },
                { icon: Calendar, label: "Assessment update for your classes", time: "35 min ago", tone: "warning" as StatusTone },
                { icon: FolderOpen, label: "Resource workspace updated", time: "2 hours ago", tone: "success" as StatusTone },
                { icon: BarChart3, label: "Grade summary ready for review", time: "Yesterday", tone: "primary" as StatusTone },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={`${item.label}-${item.time}`}
                    className="flex items-center gap-3 border-b py-3 last:border-b-0"
                    style={{ borderColor: styles.colors.borderLight }}
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl" style={toneStyles(item.tone, styles)}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold" style={{ color: styles.colors.textSecondary }}>
                      {item.label}
                    </span>
                    <span className="shrink-0 text-xs" style={{ color: styles.colors.textTertiary }}>
                      {item.time}
                    </span>
                  </div>
                );
              })}
            </SectionCard>
          </section>

          <section className="rounded-2xl border p-5" style={styles.card}>
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-sm font-bold" style={{ color: styles.colors.text }}>
                Quick Links
              </h2>
              <span className="hidden text-xs sm:inline" style={{ color: styles.colors.textTertiary }}>
                Daily teaching tasks
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-7">
              {[
                { label: "Students", sub: "Manage Students", icon: Users, href: "/students" },
                { label: "Subjects", sub: "Manage Subjects", icon: BookOpen, href: "/subjects" },
                { label: "Resources", sub: "Manage Resources", icon: FolderOpen, href: "/resources" },
                { label: "Attendance", sub: "Take Attendance", icon: CheckCircle2, href: "/attendance" },
                { label: "Grading", sub: "Grade Assessments", icon: BarChart3, href: "/grading" },
                { label: "Curriculum", sub: "Manage Curriculum", icon: FileText, href: "/curriculum" },
                { label: "Messages", sub: "Open Inbox", icon: MessageSquare, href: "/messages" },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.href}
                    type="button"
                    onClick={() => router.push(item.href)}
                    className="group flex flex-col items-center gap-2 rounded-2xl p-3 text-center transition-transform hover:-translate-y-0.5"
                  >
                    <span
                      className="flex h-12 w-12 items-center justify-center rounded-2xl"
                      style={{
                        backgroundColor: withAlpha(styles.colors.primary, "12"),
                        color: styles.colors.primary,
                      }}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="text-xs font-bold" style={{ color: styles.colors.text }}>
                      {item.label}
                    </span>
                    <span className="hidden text-xs sm:block" style={{ color: styles.colors.textTertiary }}>
                      {item.sub}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      </main>
    </Layout>
  );
}
