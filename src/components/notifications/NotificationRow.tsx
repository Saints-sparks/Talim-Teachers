"use client";

import { ChevronRight } from "lucide-react";
import { cn } from "@/app/lib/utils";
import type { TeacherNotification } from "@/app/lib/notifications/inbox";
import { categoryMeta } from "./categoryMeta";
import { formatDate, formatTime } from "./format";

/** Props for {@link NotificationRow}. */
export interface NotificationRowProps {
  notification: TeacherNotification;
  selected: boolean;
  onSelect: (notification: TeacherNotification) => void;
}

/**
 * One notification in the list: unread dot, category icon, title, preview and time.
 *
 * @param props - See {@link NotificationRowProps}.
 * @param props.notification - The notification to show.
 * @param props.selected - Whether it is the open one.
 * @param props.onSelect - Called when the row is clicked.
 * @returns The row element.
 */
export function NotificationRow({ notification, selected, onSelect }: NotificationRowProps) {
  const meta = categoryMeta[notification.category];
  const Icon = meta.Icon;

  return (
    <button
      type="button"
      onClick={() => onSelect(notification)}
      aria-current={selected ? "true" : undefined}
      className={cn(
        "group grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 border-b border-[#EEF2F7] px-4 py-4 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/60",
        selected && "bg-blue-50/60 ring-1 ring-inset ring-[#83B7FF] dark:bg-blue-500/10 dark:ring-blue-400/50",
      )}
    >
      <div className="flex items-center gap-3">
        <span
          className={cn("h-2.5 w-2.5 rounded-full", notification.unread ? "bg-[#0B74DE]" : "bg-slate-300 dark:bg-slate-600")}
          role="img"
          aria-label={notification.unread ? "Unread" : "Read"}
        />
        <span className={cn("flex h-11 w-11 items-center justify-center rounded-2xl", meta.iconClass)}>
          <Icon className="h-5 w-5" />
        </span>
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="truncate text-sm font-semibold text-[#101828]">{notification.title}</p>
          <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1", meta.badgeClass)}>{meta.label}</span>
        </div>
        <p className="mt-1 line-clamp-2 text-sm leading-5 text-[#667085]">{notification.message}</p>
        <p className="mt-2 text-xs text-[#8A95A5]">{notification.sourceLabel}</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden text-right text-xs text-[#667085] sm:block">
          <p>{formatTime(notification.createdAt)}</p>
          <p>{formatDate(notification.createdAt)}</p>
        </div>
        <ChevronRight className="h-4 w-4 text-[#98A2B3] transition group-hover:translate-x-0.5 group-hover:text-[#003366]" />
      </div>
    </button>
  );
}
