"use client";

import React from "react";
import { useSchoolContact } from "@/hooks/settings/useAccount";
import { usePreferenceSaver } from "@/hooks/settings/usePreferenceSaver";
import { officeHoursValue } from "@/hooks/settings/settings.logic";
import type { TeacherMessagePrefs } from "@/hooks/settings/useTeacherSettings";
import { PanelError, PanelSkeleton, SettingsGroup, ToggleRow, ValueRow } from "./SettingsRows";

/** The three message switches (§32), with their copy. */
const MESSAGE_SWITCHES: ReadonlyArray<{ group: "Status" | "Alerts"; field: keyof TeacherMessagePrefs; label: string; description: string }> = [
  { group: "Status", field: "showOnlineStatus", label: "Show online status", description: "Parents and colleagues see when you are active" },
  { group: "Status", field: "readReceipts", label: "Read receipts", description: "Let others know when you have read their message" },
  { group: "Alerts", field: "soundEnabled", label: "Sound for new messages", description: "Plays while the portal is open" },
];

/**
 * Settings → Messages (§32): online status and read receipts (the chat
 * module's own switches), the new-message sound, and the school's office
 * hours parents are told about.
 *
 * @returns The panel content.
 */
export function MessagesPanel() {
  const { preferences, isLoading, error, refetch, save, savingKey } = usePreferenceSaver();
  const contact = useSchoolContact();

  if (isLoading) return <PanelSkeleton label="Loading your message settings" />;
  if (error) return <PanelError error={error} fallback="We could not load your message settings." onRetry={() => refetch()} />;

  const messages = preferences.messages;
  /**
   * The switches of one group.
   *
   * @param group - "Status" or "Alerts".
   * @returns The rows.
   */
  const rows = (group: "Status" | "Alerts") =>
    MESSAGE_SWITCHES.filter((item) => item.group === group).map(({ field, label, description }) => (
      <ToggleRow
        key={field}
        label={label}
        description={description}
        checked={messages[field]}
        disabled={savingKey === `messages.${field}`}
        // The DTO takes the whole section; only this field changes.
        onChange={(value) => save(`messages.${field}`, { messages: { ...messages, [field]: value } })}
      />
    ));

  const officeValue = contact.isLoading ? "Loading…" : contact.error ? "Unavailable" : officeHoursValue(contact.data?.officeHours);
  return (
    <>
      <SettingsGroup heading="Status">{rows("Status")}</SettingsGroup>
      <SettingsGroup heading="Alerts">
        {rows("Alerts")}
        <ValueRow label="Office hours" description="Parents are told you reply during school hours" value={officeValue} />
      </SettingsGroup>
    </>
  );
}
