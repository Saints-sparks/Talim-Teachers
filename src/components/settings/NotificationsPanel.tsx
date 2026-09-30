"use client";

import React, { useEffect, useId, useState } from "react";
import { toast } from "@/components/CustomToast";
import { PushNotificationToggle } from "@/components/notifications/PushNotificationToggle";
import { focusRing } from "@/components/tl/styles";
import { useAuth } from "@/app/context/AuthContext";
import { getErrorMessage } from "@/lib/apiError";
import {
  useNotificationPreferences,
  type NotificationPreferencePatch,
  type NotificationPreferences,
} from "@/hooks/settings/useNotificationPreferences";
import { quietHoursDescription } from "@/hooks/settings/settings.logic";
import { PanelError, PanelSkeleton, SettingsGroup, ToggleRow } from "./SettingsRows";

/** A boolean switch of `/notifications/preferences`. */
type SwitchField = {
  [K in keyof NotificationPreferences]: NotificationPreferences[K] extends boolean ? K : never;
}[keyof NotificationPreferences];

/** The "Categories" switches (§31), in the design's order. */
const CATEGORY_SWITCHES: ReadonlyArray<{ field: SwitchField; label: string; description: string }> = [
  { field: "announcementsEnabled", label: "School announcements", description: "Notices from the school administrator" },
  { field: "attendanceEnabled", label: "Attendance", description: "Attendance alerts about the classes you teach" },
  { field: "registerReminderEnabled", label: "Register reminders", description: "A nudge 30 minutes before registers close if one is still open" },
  { field: "gradingEnabled", label: "Grading deadlines", description: "Seven days and one day before an assessment closes" },
  { field: "resultsEnabled", label: "Results", description: "When scores and results are published" },
  { field: "resourcesEnabled", label: "Resources", description: "New resources and assignments in your subjects" },
  { field: "resourceOpenedEnabled", label: "Resource activity", description: "When students open something you shared, in one summary at 4pm" },
  { field: "messagesEnabled", label: "Messages", description: "New messages from parents, colleagues and groups, by push and email" },
];

/**
 * One labelled `type="time"` input of quiet hours, saved when the teacher
 * leaves it or presses Enter (and only when the value is a real change), so
 * typing a time digit by digit doesn't send a PATCH per keystroke.
 *
 * @param props - The field and its value.
 * @param props.label - "Start" or "End".
 * @param props.value - The stored `HH:mm`.
 * @param props.disabled - True while it saves.
 * @param props.onCommit - Saves the new `HH:mm`.
 * @returns The labelled input.
 */
function QuietTime({ label, value, disabled, onCommit }: { label: string; value: string; disabled: boolean; onCommit: (next: string) => void }) {
  const id = useId();
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);

  /** Saves the draft when it is a complete `HH:mm` that differs from the stored time. */
  const commit = () => {
    if (draft && /^\d{2}:\d{2}$/.test(draft) && draft !== value) onCommit(draft);
  };

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[13px] font-bold text-tl-muted">
        {label}
      </label>
      <input
        id={id}
        type="time"
        value={draft}
        disabled={disabled}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") commit();
        }}
        className={`min-h-[44px] w-[150px] rounded-xl border border-tl-control bg-tl-surface px-3 text-sm font-bold text-tl-ink disabled:opacity-60 ${focusRing}`}
      />
    </div>
  );
}

/**
 * Settings → Notifications: what reaches the teacher (one switch per
 * category, §31) and how (mobile push, this browser, email, quiet hours).
 * Every switch is its own `PATCH /notifications/preferences`.
 *
 * @returns The panel content.
 */
export function NotificationsPanel() {
  const { user } = useAuth();
  const { preferences, isLoading, error, refetch, setPreference, savingField } = useNotificationPreferences();

  if (isLoading) return <PanelSkeleton label="Loading your notification settings" rows={6} />;
  if (error) return <PanelError error={error} fallback="We could not load your notification settings." onRetry={() => refetch()} />;

  /**
   * Saves one field and reports a failure (the hook rolls the control back).
   *
   * @param patch - The field and its new value.
   */
  const save = (patch: NotificationPreferencePatch) => {
    setPreference(patch, {
      onError: (saveError) => toast.error(getErrorMessage(saveError, "We couldn't save that setting. Please try again.")),
    });
  };

  const email = user?.email;
  return (
    <>
      <SettingsGroup heading="Categories">
        {CATEGORY_SWITCHES.map(({ field, label, description }) => (
          <ToggleRow
            key={field}
            label={label}
            description={description}
            checked={Boolean(preferences[field])}
            disabled={savingField === field}
            onChange={(value) => save({ field, value } as NotificationPreferencePatch)}
          />
        ))}
      </SettingsGroup>
      <SettingsGroup heading="Delivery">
        <ToggleRow
          label="Mobile push"
          description="On the Talim app"
          checked={preferences.pushEnabled}
          disabled={savingField === "pushEnabled"}
          onChange={(value) => save({ field: "pushEnabled", value })}
        />
        <PushNotificationToggle />
        <ToggleRow
          label="Email"
          description={email ? `To ${email}` : "To your school email"}
          checked={preferences.emailEnabled}
          disabled={savingField === "emailEnabled"}
          onChange={(value) => save({ field: "emailEnabled", value })}
        />
        <ToggleRow
          label="Quiet hours"
          description={quietHoursDescription(preferences.quietHoursStart, preferences.quietHoursEnd)}
          checked={preferences.quietHoursEnabled}
          disabled={savingField === "quietHoursEnabled"}
          onChange={(value) => save({ field: "quietHoursEnabled", value })}
        >
          {preferences.quietHoursEnabled ? (
            <div className="flex flex-wrap gap-4 pb-4">
              <QuietTime
                label="Start"
                value={preferences.quietHoursStart}
                disabled={savingField === "quietHoursStart"}
                onCommit={(value) => save({ field: "quietHoursStart", value })}
              />
              <QuietTime
                label="End"
                value={preferences.quietHoursEnd}
                disabled={savingField === "quietHoursEnd"}
                onCommit={(value) => save({ field: "quietHoursEnd", value })}
              />
            </div>
          ) : null}
        </ToggleRow>
      </SettingsGroup>
    </>
  );
}
