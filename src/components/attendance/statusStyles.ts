import type { AttendanceStatus } from "@/types/attendance";

/** Tailwind classes for one status, with dark variants. */
export interface StatusStyle {
  /** The dot on an avatar or heading. */
  dot: string;
  /** The tinted panel around a recorded mark. */
  panel: string;
  /** The status pill. */
  pill: string;
}

const PRESENT: StatusStyle = {
  dot: "bg-green-500",
  panel: "bg-green-50 border-green-200 dark:bg-[#062B1A] dark:border-green-500/60",
  pill: "bg-green-100 text-green-800 border border-green-200 dark:bg-green-900/40 dark:text-green-200 dark:border-green-500/50",
};

const ABSENT: StatusStyle = {
  dot: "bg-red-500",
  panel: "bg-red-50 border-red-200 dark:bg-[#351012] dark:border-red-400/60",
  pill: "bg-red-100 text-red-800 border border-red-200 dark:bg-red-900/40 dark:text-red-200 dark:border-red-400/50",
};

const OTHER: StatusStyle = {
  dot: "bg-yellow-500",
  panel: "bg-yellow-50 border-yellow-200 dark:bg-[#2B2306] dark:border-yellow-500/50",
  pill: "bg-yellow-100 text-yellow-800 border border-yellow-200 dark:bg-yellow-900/40 dark:text-yellow-200 dark:border-yellow-500/50",
};

/**
 * Colours for a recorded status: green for Present, red for Absent, yellow for
 * Late and Excused (and for anything the server may add later).
 *
 * @param status - The recorded status.
 * @returns The class sets to render it with.
 */
export function statusStyle(status: AttendanceStatus | undefined): StatusStyle {
  if (status === "Present") return PRESENT;
  if (status === "Absent") return ABSENT;
  return OTHER;
}

/**
 * The time of day a mark was recorded, in the teacher's locale.
 *
 * @param recordedAt - ISO timestamp from the server.
 * @returns "hh:mm", or an empty string when the timestamp is missing or invalid.
 */
export function formatRecordedTime(recordedAt: string | undefined): string {
  if (!recordedAt) return "";
  const date = new Date(recordedAt);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
