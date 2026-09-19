"use client";

import { Bell, Check, ChevronLeft, Download, FileText, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/app/lib/utils";
import type { TeacherNotification } from "@/app/lib/notifications/inbox";
import { categoryMeta } from "./categoryMeta";
import { formatDate, formatTime } from "./format";

/** Props for {@link NotificationDetail}. */
export interface NotificationDetailProps {
  /** The open notification, or `null` when nothing is selected. */
  notification: TeacherNotification | null;
  /** Closes the panel on small screens. */
  onBack: () => void;
  onMarkAsRead: () => void;
}

/**
 * The right-hand panel: the full message, sender, related links, attachments
 * and the mark-as-read action for the open notification.
 *
 * @param props - See {@link NotificationDetailProps}.
 * @param props.notification - The open notification, or `null`.
 * @param props.onBack - Closes the panel on small screens.
 * @param props.onMarkAsRead - Marks the open notification read.
 * @returns The detail element.
 */
export function NotificationDetail({ notification, onBack, onMarkAsRead }: NotificationDetailProps) {
  if (!notification) {
    return (
      <div className="flex min-h-[360px] flex-1 items-center justify-center p-6 text-center">
        <div>
          <Bell className="mx-auto mb-3 h-10 w-10 text-[#98A2B3]" />
          <p className="font-medium text-[#101828]">Select a notification</p>
          <p className="mt-1 text-sm text-[#667085]">Choose an update from the list to read the full details.</p>
        </div>
      </div>
    );
  }

  const meta = categoryMeta[notification.category];
  const Icon = meta.Icon;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between border-b border-[#E8EDF5] px-4 py-4">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm font-medium text-[#344054] transition hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </button>
        <div className="hidden items-center gap-2 text-sm font-medium text-[#667085] lg:flex">
          <span className={cn("flex h-8 w-8 items-center justify-center rounded-xl", meta.iconClass)}>
            <Icon className="h-4 w-4" />
          </span>
          Detail
        </div>
        <Button variant="ghost" size="icon" onClick={onBack} className="h-9 w-9 rounded-xl text-[#667085] lg:hidden" aria-label="Close">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold leading-7 text-[#101828]">{notification.title}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[#667085]">
              <span className={cn("rounded-full px-2 py-0.5 font-semibold ring-1", meta.badgeClass)}>{meta.label}</span>
              <span className="rounded-full bg-[#EFF5FF] px-2 py-0.5 font-semibold text-[#003366] ring-1 ring-[#DCEBFF] dark:ring-blue-400/30">
                {notification.sourceLabel}
              </span>
              <span>
                {formatTime(notification.createdAt)} - {formatDate(notification.createdAt)}
              </span>
              {notification.unread ? (
                <span className="flex items-center gap-1 font-semibold text-[#0B74DE] dark:text-blue-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#0B74DE] dark:bg-blue-400" />
                  Unread
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[#667085]">
                  <Check className="h-3.5 w-3.5" />
                  Read
                </span>
              )}
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-[#EAF3FF] via-white to-[#FFF6DF] p-5 dark:from-blue-500/10 dark:via-slate-900 dark:to-amber-500/10">
            <div className="flex min-h-[120px] items-center justify-center">
              <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-white text-[#003366] shadow-sm">
                <Icon className="h-9 w-9" />
                <span className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full bg-[#D4A017] text-white shadow-sm">
                  <Bell className="h-4 w-4" />
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-3 text-sm leading-6 text-[#344054]">
            {notification.message.split("\n").map((line, index) => (
              <p key={`${notification.id}-line-${index}`}>{line}</p>
            ))}
          </div>

          <div className="rounded-2xl border border-[#E8EDF5] bg-[#FBFCFE] p-4">
            <p className="text-xs font-semibold uppercase text-[#8A95A5]">From</p>
            <p className="mt-1 font-medium text-[#101828]">{notification.senderName}</p>
            {notification.senderEmail ? <p className="text-sm text-[#667085]">{notification.senderEmail}</p> : null}
          </div>

          {notification.related.length ? (
            <div>
              <p className="mb-2 text-sm font-semibold text-[#101828]">Related</p>
              <div className="flex flex-wrap gap-2">
                {notification.related.map((item, index) => (
                  <a
                    key={`${item.label}-${index}`}
                    href={item.href || "#"}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-xl bg-[#EFF5FF] px-3 py-2 text-sm font-medium text-[#003366] ring-1 ring-[#DCEBFF] dark:ring-blue-400/30",
                      !item.href && "pointer-events-none",
                    )}
                  >
                    <Users className="h-4 w-4" />
                    {item.label}
                  </a>
                ))}
              </div>
            </div>
          ) : null}

          {notification.attachments.length ? (
            <div>
              <p className="mb-2 text-sm font-semibold text-[#101828]">Attachments ({notification.attachments.length})</p>
              <div className="space-y-2">
                {notification.attachments.map((attachment, index) => (
                  <a
                    key={`${attachment}-${index}`}
                    href={attachment}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between rounded-2xl border border-[#E8EDF5] bg-white p-3 text-sm transition hover:border-[#BFD7FF] hover:bg-slate-50 dark:hover:bg-slate-800/60"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-300">
                        <FileText className="h-5 w-5" />
                      </span>
                      <span className="truncate font-medium text-[#344054]">
                        {attachment.split("/").pop() || `Attachment ${index + 1}`}
                      </span>
                    </span>
                    <Download className="h-4 w-4 text-[#667085]" />
                  </a>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex gap-2 border-t border-[#E8EDF5] p-4">
        <Button
          variant="outline"
          onClick={onMarkAsRead}
          disabled={!notification.unread}
          className="h-11 flex-1 rounded-xl border-[#DCE5F2] bg-white text-[#344054] shadow-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <Check className="h-4 w-4" />
          Mark as read
        </Button>
      </div>
    </div>
  );
}
