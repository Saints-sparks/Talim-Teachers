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
