"use client";

import React from "react";
import Link from "next/link";
import { AlertCircle, Check, ChevronRight } from "lucide-react";
import { toast } from "@/components/CustomToast";
import { ApiErrorState } from "@/components/states";
import { PushNotificationToggle } from "@/components/notifications/PushNotificationToggle";
import useNotifications from "@/app/hooks/useNotifications";
import {
  useNotificationPreferences,
  type NotificationPreferences,
} from "@/hooks/settings/useNotificationPreferences";
import { Card, CardHeader, SectionHeader, SettingsSkeleton, ToggleRow } from "./primitives";

const CATEGORY_SWITCHES: Array<{ field: keyof NotificationPreferences; label: string; desc: string }> = [
  { field: "announcementsEnabled", label: "School announcements", desc: "Alerts from your school admin" },
  { field: "attendanceEnabled", label: "Attendance alerts", desc: "Attendance reminders and updates" },
  { field: "resultsEnabled", label: "Grading & result alerts", desc: "New assessments and grade updates" },
  { field: "resourcesEnabled", label: "Resource & curriculum", desc: "New materials and curriculum updates" },
  { field: "messagesEnabled", label: "Message notifications", desc: "New messages from students or groups" },
];

const DELIVERY_SWITCHES: Array<{ field: keyof NotificationPreferences; label: string; desc: string }> = [
  { field: "pushEnabled", label: "Mobile push notifications", desc: "Alerts on the Talim mobile app" },
  { field: "emailEnabled", label: "Email notifications", desc: "Receive updates via email" },
];

/**
 * Which notifications this teacher receives, and how they are delivered.
 *
 * @returns The Notifications section element.
 */
export function NotificationsSection() {
  const { counts, markAllAsRead, loading: notificationsLoading } = useNotifications();
  const { preferences, isLoading, error, refetch, setPreference, savingField } = useNotificationPreferences();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <SectionHeader title="Notifications" desc="Control your alerts and notification preferences." />
        <SettingsSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <SectionHeader title="Notifications" desc="Control your alerts and notification preferences." />
        <ApiErrorState
          error={error}
          fallback="We couldn't load your notification preferences."
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeader title="Notifications" desc="Control your alerts and notification preferences." />

      <Card>
        <CardHeader
          title="Notification Categories"
          action={<span className="text-xs text-gray-400 dark:text-slate-500">{counts.unread} unread</span>}
        />
        <div className="px-5">
          {CATEGORY_SWITCHES.map(({ field, label, desc }) => (
            <ToggleRow
              key={field}
              label={label}
              desc={desc}
              checked={Boolean(preferences[field])}
              disabled={savingField === field}
              onChange={(value) => setPreference({ field, value } as Parameters<typeof setPreference>[0])}
            />
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader title="Delivery" />
        <div className="px-5">
          {DELIVERY_SWITCHES.map(({ field, label, desc }) => (
            <ToggleRow
              key={field}
              label={label}
              desc={desc}
              checked={Boolean(preferences[field])}
              disabled={savingField === field}
              onChange={(value) => setPreference({ field, value } as Parameters<typeof setPreference>[0])}
            />
          ))}
          <PushNotificationToggle />
        </div>
      </Card>

      <Card>
        <CardHeader title="Quiet Hours" />
        <div className="px-5">
          <ToggleRow
            label="Enable quiet hours"
            desc="Suppress non-urgent notifications during set times"
            checked={preferences.quietHoursEnabled}
            disabled={savingField === "quietHoursEnabled"}
            onChange={(value) => setPreference({ field: "quietHoursEnabled", value })}
          />
          {preferences.quietHoursEnabled && (
            <div className="grid grid-cols-1 gap-3 py-3 sm:grid-cols-2">
              {(["quietHoursStart", "quietHoursEnd"] as const).map((field) => (
                <div key={field}>
                  <label htmlFor={field} className="mb-1 block text-xs text-gray-500 dark:text-slate-400">
                    {field === "quietHoursStart" ? "Start time" : "End time"}
                  </label>
                  <input
                    id={field}
                    type="time"
                    value={preferences[field]}
                    onChange={(event) => setPreference({ field, value: event.target.value })}
                    className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#003366] dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:focus:ring-blue-500"
                  />
                </div>
              ))}
            </div>
          )}
          <p className="flex items-start gap-2 py-3 text-xs text-gray-500 dark:text-slate-400">
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            Quiet hours use your school&apos;s timezone.
          </p>
        </div>
      </Card>

      <Card>
        <div className="flex flex-wrap gap-3 p-5">
          <button
            type="button"
            onClick={() => {
              markAllAsRead().then(() => toast.success("All notifications marked as read."));
            }}
            disabled={notificationsLoading || counts.unread === 0}
            className="flex items-center gap-2 rounded-lg bg-[#003366] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#002244] disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-700"
          >
            <Check size={14} />
            Mark all as read
          </button>
          <Link
            href="/notifications"
            className="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            Open Notifications <ChevronRight size={14} />
          </Link>
        </div>
      </Card>
    </div>
  );
}

export default NotificationsSection;
