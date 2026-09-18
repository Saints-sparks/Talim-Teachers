"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Circle } from "lucide-react";
import type { DashboardSetupProgress } from "@/types/dashboard";
import type { DashboardStyles } from "./primitives";

/** Props for {@link SetupProgressCard}. */
export interface SetupProgressCardProps {
  styles: DashboardStyles;
  progress: DashboardSetupProgress;
}

/**
 * The setup checklist card: a ring showing overall completion, each check as
 * a pill, and a link into the full checklist. Hidden by the caller once every
 * check is done.
 *
 * @param props - See {@link SetupProgressCardProps}.
 * @param props.styles - The dashboard's theme styles.
 * @param props.progress - The checklist and its completion percentage.
 * @returns The card element.
 */
export function SetupProgressCard({ styles, progress }: SetupProgressCardProps) {
  const circumference = 2 * Math.PI * 25;

  return (
    <section className="rounded-2xl border p-4" style={styles.card}>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-4">
          <div className="relative flex h-16 w-16 shrink-0 items-center justify-center">
            <svg className="h-16 w-16 -rotate-90" viewBox="0 0 64 64">
              <circle cx="32" cy="32" r="25" stroke={styles.colors.borderLight} strokeWidth="7" fill="none" />
              <circle
                cx="32"
                cy="32"
                r="25"
                stroke={styles.colors.primary}
                strokeWidth="7"
                strokeLinecap="round"
                fill="none"
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - progress.percent / 100)}
              />
            </svg>
            <span className="absolute text-xs font-bold" style={{ color: styles.colors.success }}>
              {progress.percent}%
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
          {progress.checks.map((item) => (
            <div
              key={item.label}
              className="inline-flex items-center gap-2 rounded-full px-2 py-1 text-xs font-semibold"
              style={{ color: item.done ? styles.colors.textSecondary : styles.colors.primary }}
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
          style={{ borderColor: styles.colors.border, color: styles.colors.primary, backgroundColor: styles.colors.surfaceAlt }}
        >
          Continue Setup <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}

export default SetupProgressCard;
