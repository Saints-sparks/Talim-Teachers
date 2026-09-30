"use client";

import { useCallback, useState } from "react";
import { toast } from "@/components/CustomToast";
import { getErrorMessage } from "@/lib/apiError";
import { mergePreferences, useTeacherSettings, useUpdateTeacherPreferences, type TeacherPreferences } from "./useTeacherSettings";

/** What {@link usePreferenceSaver} gives a Settings panel. */
export interface PreferenceSaver {
  /** The stored preferences with every default filled in. */
  preferences: TeacherPreferences;
  isLoading: boolean;
  error: unknown;
  refetch: () => unknown;
  /**
   * Saves some sections (optimistically) and toasts a failure.
   *
   * @param key - Which control is saving (e.g. `messages.readReceipts`), for {@link PreferenceSaver.savingKey}.
   * @param updates - The sections to send.
   * @param onSaved - Called once the server accepted the change.
   */
  save: (key: string, updates: Partial<TeacherPreferences>, onSaved?: () => void) => void;
  /** The control whose save is in flight, if any. */
  savingKey: string | null;
}

/**
 * The teacher's workspace preferences plus a saver that remembers which
 * control is saving (so only that one is disabled) and reports failures, for
 * the Messages, Teaching preferences, Appearance and Help tabs.
 *
 * @returns See {@link PreferenceSaver}.
 */
export function usePreferenceSaver(): PreferenceSaver {
  const settings = useTeacherSettings();
  const { mutate } = useUpdateTeacherPreferences();
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const save = useCallback(
    (key: string, updates: Partial<TeacherPreferences>, onSaved?: () => void) => {
      setSavingKey(key);
      mutate(updates, {
        onSuccess: () => onSaved?.(),
        onError: (error) => toast.error(getErrorMessage(error, "We couldn't save that setting. Please try again.")),
        onSettled: () => setSavingKey((current) => (current === key ? null : current)),
      });
    },
    [mutate],
  );

  return {
    preferences: mergePreferences(settings.data?.preferences),
    isLoading: settings.isLoading,
    error: settings.error,
    refetch: settings.refetch,
    save,
    savingKey,
  };
}
