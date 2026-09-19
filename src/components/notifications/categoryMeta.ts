import type { ComponentType } from "react";
import { Bell, BookOpen, CalendarDays, FileText, GraduationCap, Megaphone, MessageSquare, ShieldCheck } from "lucide-react";
import type { NotificationCategory, TabKey } from "@/app/lib/notifications/inbox";

/** How one category looks in the inbox: its label, chip colours and icon. */
export interface CategoryMeta {
  label: string;
  badgeClass: string;
  iconClass: string;
  Icon: ComponentType<{ className?: string }>;
}

/** Label, colours and icon for every notification category, with a dark variant of each colour. */
export const categoryMeta: Record<NotificationCategory, CategoryMeta> = {
  announcement: {
    label: "Announcement",
    badgeClass: "bg-blue-50 text-blue-700 ring-blue-100 dark:bg-blue-500/15 dark:text-blue-300 dark:ring-blue-400/30",
    iconClass: "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
    Icon: Megaphone,
  },
  attendance: {
    label: "Attendance",
    badgeClass: "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-400/30",
    iconClass: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
    Icon: CalendarDays,
  },
  academics: {
    label: "Academics",
    badgeClass: "bg-violet-50 text-violet-700 ring-violet-100 dark:bg-violet-500/15 dark:text-violet-300 dark:ring-violet-400/30",
    iconClass: "bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
    Icon: BookOpen,
  },
  grading: {
    label: "Grading",
    badgeClass: "bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-400/30",
    iconClass: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
    Icon: GraduationCap,
  },
  resources: {
    label: "Resources",
    badgeClass: "bg-cyan-50 text-cyan-700 ring-cyan-100 dark:bg-cyan-500/15 dark:text-cyan-300 dark:ring-cyan-400/30",
    iconClass: "bg-cyan-50 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300",
    Icon: FileText,
  },
  messages: {
    label: "Messages",
    badgeClass: "bg-sky-50 text-sky-700 ring-sky-100 dark:bg-sky-500/15 dark:text-sky-300 dark:ring-sky-400/30",
    iconClass: "bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
    Icon: MessageSquare,
  },
  account: {
    label: "Account",
    badgeClass: "bg-slate-50 text-slate-700 ring-slate-100 dark:bg-slate-500/20 dark:text-slate-300 dark:ring-slate-400/30",
    iconClass: "bg-slate-50 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300",
    Icon: ShieldCheck,
  },
  other: {
    label: "Others",
    badgeClass: "bg-gray-50 text-gray-700 ring-gray-100 dark:bg-gray-500/20 dark:text-gray-300 dark:ring-gray-400/30",
    iconClass: "bg-gray-50 text-gray-700 dark:bg-gray-500/20 dark:text-gray-300",
    Icon: Bell,
  },
};

/**
 * The label users see for a category.
 *
 * @param category - The category.
 * @returns Its display label.
 */
export const categoryLabel = (category: NotificationCategory): string => categoryMeta[category].label;

/** The tabs across the top of the inbox, in order. */
export const notificationTabs: Array<{ key: TabKey; label: string }> = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "announcement", label: "Announcements" },
  { key: "attendance", label: "Attendance" },
  { key: "academics", label: "Academics" },
  { key: "other", label: "Others" },
];
