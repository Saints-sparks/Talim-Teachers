"use client";

import React from "react";
import { usePreferenceSaver } from "@/hooks/settings/usePreferenceSaver";
import type { TeacherTeachingPrefs } from "@/hooks/settings/useTeacherSettings";
import { ChoiceRow, PanelError, PanelSkeleton, SettingsGroup, type ChoiceOption } from "./SettingsRows";

const LANDING_OPTIONS: ReadonlyArray<ChoiceOption<TeacherTeachingPrefs["landingPage"]>> = [
  { value: "dashboard", label: "Today" },
  { value: "timetable", label: "Timetable" },
  { value: "attendance", label: "Attendance" },
  { value: "messages", label: "Messages" },
];

const GRADING_OPTIONS: ReadonlyArray<ChoiceOption<TeacherTeachingPrefs["gradingView"]>> = [
  { value: "course", label: "Subject scores" },
  { value: "class", label: "Class report" },
];

const TIMETABLE_OPTIONS: ReadonlyArray<ChoiceOption<TeacherTeachingPrefs["timetableDisplay"]>> = [
  { value: "week", label: "Week" },
  { value: "today", label: "Today" },
];

/**
 * Settings → Teaching preferences: where the portal opens after sign-in
 * (honoured by sign-in through `resolveSignedInRoute`), which Grading view
 * opens, and the Timetable's default view. Saved to the account, so they
 * follow the teacher to every device; the landing page is also cached on
 * this device by the preferences hooks.
 *
 * @returns The panel content.
 */
export function TeachingPanel() {
  const { preferences, isLoading, error, refetch, save, savingKey } = usePreferenceSaver();

  if (isLoading) return <PanelSkeleton label="Loading your teaching preferences" rows={3} />;
  if (error) return <PanelError error={error} fallback="We could not load your teaching preferences." onRetry={() => refetch()} />;

  const teaching = preferences.teaching;
  /**
   * Saves one default (the DTO takes the whole section).
   *
   * @param field - The default.
   * @param value - Its new value.
   */
  const choose = <K extends keyof TeacherTeachingPrefs>(field: K, value: TeacherTeachingPrefs[K]) => {
    save(`teaching.${field}`, { teaching: { ...teaching, [field]: value } });
  };

  return (
    <SettingsGroup heading="Defaults">
      <ChoiceRow
        label="First screen after sign-in"
        description="Where the portal opens"
        value={teaching.landingPage}
        options={LANDING_OPTIONS}
        disabled={savingKey === "teaching.landingPage"}
        onChange={(value) => choose("landingPage", value)}
      />
      <ChoiceRow
        label="Grading opens on"
        description="Which grading view you land on"
        value={teaching.gradingView}
        options={GRADING_OPTIONS}
        disabled={savingKey === "teaching.gradingView"}
        onChange={(value) => choose("gradingView", value)}
      />
      <ChoiceRow
        label="Timetable view"
        description="Whole week or just today"
        value={teaching.timetableDisplay}
        options={TIMETABLE_OPTIONS}
        disabled={savingKey === "teaching.timetableDisplay"}
        onChange={(value) => choose("timetableDisplay", value)}
      />
    </SettingsGroup>
  );
}
