"use client";

import React from "react";
import { BarChart3, CalendarDays, FolderOpen, Inbox } from "lucide-react";
import type { DashboardActivity } from "@/types/dashboard";
import { EmptyState, SectionCard, TextAction, toneStyles, type DashboardStyles, type StatusTone } from "./primitives";

const ACTIVITY_META: Record<DashboardActivity["type"], { icon: React.ElementType; tone: StatusTone }> = {
  resource: { icon: FolderOpen, tone: "success" },
  grading: { icon: BarChart3, tone: "primary" },
  attendance: { icon: CalendarDays, tone: "warning" },
};

/**
 * Formats a timestamp as a short relative time ("10 min ago", "Yesterday",
 * or the date once it is more than a week old).
 *
 * @param timestamp - An ISO timestamp.
 * @returns A short, human-readable time.
 */
function formatRelativeTime(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "";
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/** Props for {@link RecentActivityCard}. */
export interface RecentActivityCardProps {
  styles: DashboardStyles;
  activity: DashboardActivity[];
}

/**
 * The teacher's most recent uploads, published results and attendance marks,
 * newest first. Real events from the server — this card used to show four
 * fixed lines regardless of what the teacher had actually done.
 *
 * @param props - See {@link RecentActivityCardProps}.
 * @param props.styles - The dashboard's theme styles.
 * @param props.activity - Up to five recent events, from the server aggregate.
 * @returns The card element.
 */
export function RecentActivityCard({ styles, activity }: RecentActivityCardProps) {
  return (
    <SectionCard title="Recent Activity" action={<TextAction href="/notifications" label="View all" styles={styles} />} styles={styles}>
      {activity.length > 0 ? (
        activity.map((item, index) => {
          const meta = ACTIVITY_META[item.type];
          const Icon = meta.icon;
          return (
            <div
              key={`${item.type}-${item.timestamp}-${index}`}
              className="flex items-center gap-3 border-b py-3 last:border-b-0"
              style={{ borderColor: styles.colors.borderLight }}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-xl" style={toneStyles(meta.tone, styles)}>
                <Icon className="h-4 w-4" />
              </div>
              <span className="min-w-0 flex-1 truncate text-sm font-semibold" style={{ color: styles.colors.textSecondary }}>
                {item.label}
              </span>
              <span className="shrink-0 text-xs" style={{ color: styles.colors.textTertiary }}>
                {formatRelativeTime(item.timestamp)}
              </span>
            </div>
          );
        })
      ) : (
        <EmptyState
          icon={<Inbox className="h-7 w-7" />}
          title="No activity yet"
          description="Uploads, published results and attendance you record will show up here."
          styles={styles}
        />
      )}
    </SectionCard>
  );
}
