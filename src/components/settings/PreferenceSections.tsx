"use client";

import React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { toast } from "@/components/CustomToast";
import { getErrorMessage } from "@/lib/apiError";
import {
  useTeacherPreferences,
  useUpdateTeacherPreferences,
  type TeacherMessagePrefs,
  type TeacherTeachingPrefs,
} from "@/hooks/settings/useTeacherSettings";
import { Card, CardHeader, SectionHeader, SelectRow, SettingsSkeleton, ToggleRow } from "./primitives";

/**
 * Reads the preferences and returns a saver that reports its own failures, so
 * no section has to repeat the toast.
 *
 * @returns The current preferences, the loading flag, and `save`.
 */
function usePreferenceEditor() {
  const { preferences, isLoading } = useTeacherPreferences();
  const mutation = useUpdateTeacherPreferences();

  const save = (updates: Parameters<typeof mutation.mutate>[0]) => {
    mutation.mutate(updates, {
      onError: (error) => toast.error(getErrorMessage(error, "We couldn't save that preference. Please try again.")),
    });
  };

  return { preferences, isLoading, save, isSaving: mutation.isPending };
}

/**
 * Chat preferences: what the messages screen alerts on and opens with.
 *
 * @returns The Messages section element.
 */
export function MessagesSection() {
  const { preferences, isLoading, save, isSaving } = usePreferenceEditor();
  const messages = preferences.messages;
  const patch = (updates: Partial<TeacherMessagePrefs>) => save({ messages: { ...messages, ...updates } });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <SectionHeader title="Messages" desc="Manage your messaging preferences." />
        <SettingsSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeader title="Messages" desc="Manage your messaging preferences." />

      <Card>
        <CardHeader title="Chat Preferences" />
        <div className="px-5">
          <ToggleRow label="Group chat notifications" desc="Alerts for new group messages" checked={messages.groupNotifications} disabled={isSaving} onChange={(value) => patch({ groupNotifications: value })} />
          <ToggleRow label="Show unread badge" desc="Badge count on sidebar icon" checked={messages.unreadBadge} disabled={isSaving} onChange={(value) => patch({ unreadBadge: value })} />
          <ToggleRow label="Play sound for new messages" desc="Audio alert for incoming messages" checked={messages.soundEnabled} disabled={isSaving} onChange={(value) => patch({ soundEnabled: value })} />
          <ToggleRow label="Show online status" desc="Let others see when you're online" checked={messages.showOnlineStatus} disabled={isSaving} onChange={(value) => patch({ showOnlineStatus: value })} />
        </div>
      </Card>

      <Card>
        <CardHeader title="Default Chat Filter" />
        <div className="px-5 py-1">
          <SelectRow
            label="Default view"
            desc="Which chat list to show first"
            value={messages.defaultFilter}
            disabled={isSaving}
            options={[
              { value: "all", label: "All Chats" },
              { value: "private", label: "Private" },
              { value: "groups", label: "Groups" },
            ]}
            onChange={(value) => patch({ defaultFilter: value })}
          />
        </div>
      </Card>

      <Card>
        <div className="p-5">
          <Link
            href="/messages"
            className="inline-flex items-center gap-2 rounded-lg bg-[#003366] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#002244] dark:bg-blue-600 dark:hover:bg-blue-700"
          >
            Open Messages <ChevronRight size={14} />
          </Link>
        </div>
      </Card>
    </div>
  );
}

/**
 * Workspace defaults: which page the teacher lands on and how each area opens.
 *
 * @returns The Teaching Preferences section element.
 */
export function TeachingSection() {
  const { preferences, isLoading, save, isSaving } = usePreferenceEditor();
  const teaching = preferences.teaching;
  const patch = (updates: Partial<TeacherTeachingPrefs>) => save({ teaching: { ...teaching, ...updates } });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <SectionHeader title="Teaching Preferences" desc="Personalise your teaching workspace and display options." />
        <SettingsSkeleton rows={4} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeader title="Teaching Preferences" desc="Personalise your teaching workspace and display options." />

      <Card>
        <CardHeader title="Navigation" />
        <div className="px-5 py-1">
          <SelectRow
            label="Default landing page"
            desc="First page shown after login"
            value={teaching.landingPage}
            disabled={isSaving}
            options={[
              { value: "dashboard", label: "Dashboard" },
              { value: "timetable", label: "Timetable" },
              { value: "attendance", label: "Attendance" },
              { value: "messages", label: "Messages" },
            ]}
            onChange={(value) => patch({ landingPage: value })}
          />
        </div>
      </Card>

      <Card>
        <CardHeader title="Grading" />
        <div className="px-5 py-1">
          <SelectRow
            label="Default grading view"
            desc="How you prefer to enter grades"
            value={teaching.gradingView}
            disabled={isSaving}
            options={[
              { value: "course", label: "Course Teacher" },
              { value: "class", label: "Class Teacher" },
            ]}
            onChange={(value) => patch({ gradingView: value })}
          />
        </div>
      </Card>

      <Card>
        <CardHeader title="Attendance" />
        <div className="px-5 py-1">
          <SelectRow
            label="Default attendance mode"
            desc="Mark or view attendance on open"
            value={teaching.attendanceMode}
            disabled={isSaving}
            options={[
              { value: "mark", label: "Mark Attendance" },
              { value: "view", label: "View Attendance" },
            ]}
            onChange={(value) => patch({ attendanceMode: value })}
          />
        </div>
      </Card>

      <Card>
        <CardHeader title="Display" />
        <div className="px-5 py-1">
          <SelectRow
            label="Timetable display"
            desc="Week view or today's classes"
            value={teaching.timetableDisplay}
            disabled={isSaving}
            options={[
              { value: "week", label: "Week View" },
              { value: "today", label: "Today View" },
            ]}
            onChange={(value) => patch({ timetableDisplay: value })}
          />
          <SelectRow
            label="Resource display"
            desc="How resources are listed"
            value={teaching.resourceDisplay}
            disabled={isSaving}
            options={[
              { value: "grid", label: "Grid" },
              { value: "list", label: "List" },
            ]}
            onChange={(value) => patch({ resourceDisplay: value })}
          />
        </div>
      </Card>

      <Card>
        <div className="px-5 py-3">
          <p className="text-xs text-gray-400 dark:text-slate-500">
            Preferences are saved to your account and follow you to every device you sign in on.
          </p>
        </div>
      </Card>
    </div>
  );
}

export { usePreferenceEditor };
