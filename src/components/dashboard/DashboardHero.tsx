"use client";

import React from "react";
import { CheckCircle2, ClipboardList, Upload } from "lucide-react";
import { HeroAction, withAlpha, type DashboardStyles } from "./primitives";

/**
 * A time-of-day greeting ("Good morning", "Good afternoon", "Good evening").
 *
 * @returns The greeting for right now.
 */
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/** Props for {@link DashboardHero}. */
export interface DashboardHeroProps {
  styles: DashboardStyles;
  teacherName: string;
  schoolName: string;
  termLabel: string;
}

/**
 * The dashboard's header: greeting, school and term, and the three quick
 * actions a teacher reaches for most.
 *
 * @param props - See {@link DashboardHeroProps}.
 * @param props.styles - The dashboard's theme styles.
 * @param props.teacherName - The signed-in teacher's first name.
 * @param props.schoolName - The teacher's school.
 * @param props.termLabel - The current term, from the shared term query.
 * @returns The hero element.
 */
export function DashboardHero({ styles, teacherName, schoolName, termLabel }: DashboardHeroProps) {
  return (
    <section className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl" style={{ color: styles.colors.text }}>
          {getGreeting()}, <span style={{ color: styles.colors.primary }}>{teacherName}</span>!
        </h1>
        <p className="mt-1 text-sm" style={{ color: styles.colors.textSecondary }}>
          Here&apos;s what&apos;s happening at{" "}
          <span className="font-semibold" style={{ color: styles.colors.text }}>
            {schoolName}
          </span>{" "}
          today.
        </p>
        {termLabel && (
          <div
            className="mt-3 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold"
            style={{
              backgroundColor: withAlpha(styles.colors.success, "12"),
              borderColor: withAlpha(styles.colors.success, "22"),
              color: styles.colors.success,
            }}
          >
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: styles.colors.success }} />
            {termLabel}
          </div>
        )}
      </div>

      <div className="flex gap-3 overflow-x-auto pb-1 lg:pb-0">
        <HeroAction href="/attendance" label="Mark Attendance" icon={<ClipboardList className="h-4 w-4" />} styles={styles} />
        <HeroAction href="/grading" label="Continue Grading" icon={<CheckCircle2 className="h-4 w-4" />} styles={styles} />
        <HeroAction href="/resources" label="Upload Resource" icon={<Upload className="h-4 w-4" />} primary styles={styles} />
      </div>
    </section>
  );
}
