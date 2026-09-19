"use client";

import Link from "next/link";
import { Bell, CheckCheck, RefreshCw, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/app/lib/utils";

/** Props for {@link NotificationsHeader}. */
export interface NotificationsHeaderProps {
  unreadCount: number;
  /** True while the inbox is being (re)fetched. */
  refreshing: boolean;
  onRefresh: () => void;
  onMarkAllAsRead: () => void;
}

const outlineButton =
  "h-10 rounded-xl border-[#DCE5F2] bg-white text-[#344054] shadow-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800";

/**
 * The page header: title, a link to the notification settings, refresh and
 * "mark all as read".
 *
 * @param props - See {@link NotificationsHeaderProps}.
 * @param props.unreadCount - Enables "Mark all as read" when above zero.
 * @param props.refreshing - Spins the refresh icon and disables the button.
 * @param props.onRefresh - Refetches the inbox.
 * @param props.onMarkAllAsRead - Marks every unread notification read.
 * @returns The header element.
 */
export function NotificationsHeader({ unreadCount, refreshing, onRefresh, onMarkAllAsRead }: NotificationsHeaderProps) {
  return (
    <header className="flex flex-col gap-4 rounded-2xl border border-[#E5EAF2] bg-white px-4 py-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#003366] text-white shadow-sm shadow-[#003366]/20 dark:bg-blue-600">
          <Bell className="h-5 w-5" />
        </div>
        <div>
          <h1 className="tracking-0 text-xl font-semibold text-[#101828]">Notifications</h1>
          <p className="text-sm text-[#667085]">
            Stay updated on school announcements, Talim alerts, and teacher workflow reminders.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button asChild variant="outline" className={outlineButton}>
          <Link href="/settings?tab=notifications">
            <Settings className="h-4 w-4" />
            Notification Settings
          </Link>
        </Button>
        <Button variant="outline" onClick={onRefresh} disabled={refreshing} className={outlineButton}>
          <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
          Refresh
        </Button>
        <Button
          onClick={onMarkAllAsRead}
          disabled={!unreadCount}
          className="h-10 rounded-xl bg-[#003366] text-white shadow-sm shadow-[#003366]/20 hover:bg-[#00264D] dark:bg-blue-600 dark:hover:bg-blue-500"
        >
          <CheckCheck className="h-4 w-4" />
          Mark all as read
        </Button>
      </div>
    </header>
  );
}
