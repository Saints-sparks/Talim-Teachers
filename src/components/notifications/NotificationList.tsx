"use client";

import { AlertTriangle, MailOpen } from "lucide-react";
import { ApiErrorState } from "@/components/states";
import type { TeacherNotification } from "@/app/lib/notifications/inbox";
import { NotificationRow } from "./NotificationRow";

/** Props for {@link NotificationList}. */
export interface NotificationListProps {
  /** The notifications after tab, search and sort. */
  notifications: TeacherNotification[];
  selectedId?: string;
  /** True until the first load finishes. */
  loading: boolean;
  /** The query error, keyed on `error.code` by {@link ApiErrorState}. */
  error: unknown;
  /** True when one of the two server lists failed but the other loaded. */
  partial: boolean;
  /** Size of the unfiltered inbox, to tell "nothing yet" from "nothing matches". */
  totalCount: number;
  onSelect: (notification: TeacherNotification) => void;
  onRetry: () => void;
}

/**
 * Placeholder rows shown while the first load runs, shaped like real rows so
 * the page does not jump when they arrive.
 *
 * @returns The skeleton element.
 */
function NotificationListSkeleton() {
  return (
    <div role="status" aria-label="Loading notifications" className="min-h-0 flex-1 animate-pulse overflow-hidden">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 border-b border-[#EEF2F7] px-4 py-4">
          <div className="flex items-center gap-3">
            <span className="h-2.5 w-2.5 rounded-full bg-slate-200 dark:bg-slate-700" />
            <span className="h-11 w-11 rounded-2xl bg-slate-200 dark:bg-slate-700" />
          </div>
          <div className="space-y-2">
            <div className="h-3.5 w-1/2 rounded bg-slate-200 dark:bg-slate-700" />
            <div className="h-3 w-5/6 rounded bg-slate-100 dark:bg-slate-800" />
            <div className="h-3 w-1/4 rounded bg-slate-100 dark:bg-slate-800" />
          </div>
          <div className="hidden h-8 w-14 rounded bg-slate-100 dark:bg-slate-800 sm:block" />
        </div>
      ))}
    </div>
  );
}

/**
 * The list panel: a skeleton while loading, an error keyed on the failure's
 * code, an empty state that says why it is empty, or the rows.
 *
 * @param props - See {@link NotificationListProps}.
 * @param props.notifications - The notifications to show.
 * @param props.selectedId - The open notification's id.
 * @param props.loading - True during the first load.
 * @param props.error - The query error, if any.
 * @param props.partial - True when only one of the two lists loaded.
 * @param props.totalCount - Size of the unfiltered inbox.
 * @param props.onSelect - Called when a row is picked.
 * @param props.onRetry - Refetches the inbox.
 * @returns The list element.
 */
export function NotificationList({
  notifications,
  selectedId,
  loading,
  error,
  partial,
  totalCount,
  onSelect,
  onRetry,
}: NotificationListProps) {
  if (loading) return <NotificationListSkeleton />;

  if (error && totalCount === 0) {
    return (
      <div className="flex min-h-[360px] flex-1 items-center justify-center">
        <ApiErrorState error={error} fallback="We couldn't load your notifications." onRetry={onRetry} />
      </div>
    );
  }

  if (!notifications.length) {
    const inboxEmpty = totalCount === 0;
    return (
      <div className="flex min-h-[360px] flex-1 items-center justify-center p-6">
        <div className="max-w-sm text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#EFF5FF] text-[#003366]">
            <MailOpen className="h-8 w-8" />
          </div>
          <p className="font-semibold text-[#101828]">{inboxEmpty ? "You're all caught up" : "No notifications found"}</p>
          <p className="mt-1 text-sm text-[#667085]">
            {inboxEmpty
              ? "New updates from your school and Talim will appear here."
              : "Try changing your search or filter."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {partial ? (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200"
        >
          <span className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Some notifications couldn&apos;t be loaded.
          </span>
          <button type="button" onClick={onRetry} className="font-semibold underline underline-offset-2">
            Try again
          </button>
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto">
        {notifications.map((notification) => (
          <NotificationRow
            key={notification.id}
            notification={notification}
            selected={notification.id === selectedId}
            onSelect={onSelect}
          />
        ))}
      </div>

      <div className="flex items-center justify-between border-t border-[#E8EDF5] px-4 py-3 text-xs text-[#667085]">
        <span>
          Showing {notifications.length} of {totalCount} notifications
        </span>
        <span className="hidden sm:inline">School and Talim updates in one inbox</span>
      </div>
    </div>
  );
}
