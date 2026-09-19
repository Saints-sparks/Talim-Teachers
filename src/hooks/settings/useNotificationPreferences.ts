"use client";

/**
 * Per-category notification delivery switches (`/notifications/preferences`).
 *
 * These are separate from the workspace preferences in
 * `useTeacherSettings`: they are the server-side switches the notification
 * service itself reads before sending anything, shared with the mobile app.
 */
import { useMutation, useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { api } from "@/lib/apiClient";
import { queryKeys, staleTimes } from "@/lib/queryKeys";
import { useAuth } from "@/app/context/AuthContext";
import type { NotificationPreferencesPayload } from "@/types/apiPayloads";

/**
 * The switches this portal exposes. `UpdateNotificationPreferenceDto` declares
 * more (fees, timetable, security, system, timezone); a teacher does not set
 * those here, so they are read but never sent.
 */
export type NotificationPreferences = Required<
  Pick<
    NotificationPreferencesPayload,
    | "announcementsEnabled"
    | "attendanceEnabled"
    | "resultsEnabled"
    | "resourcesEnabled"
    | "messagesEnabled"
    | "emailEnabled"
    | "pushEnabled"
    | "quietHoursEnabled"
    | "quietHoursStart"
    | "quietHoursEnd"
  >
>;

/** What a teacher sees switched on before the server has answered. */
export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  announcementsEnabled: true,
  attendanceEnabled: true,
  resultsEnabled: true,
  resourcesEnabled: true,
  messagesEnabled: true,
  emailEnabled: false,
  pushEnabled: true,
  quietHoursEnabled: false,
  quietHoursStart: "22:00",
  quietHoursEnd: "07:00",
};

/** One switch and the value to give it. */
export type NotificationPreferencePatch = {
  [K in keyof NotificationPreferences]: { field: K; value: NotificationPreferences[K] };
}[keyof NotificationPreferences];

/**
 * The signed-in teacher's notification preferences.
 *
 * @returns The query result; idle until there is a signed-in user.
 */
export function useNotificationPreferencesQuery(): UseQueryResult<Partial<NotificationPreferences>, unknown> {
  const { user } = useAuth();
  const userId = user?.userId ?? "";

  return useQuery({
    queryKey: queryKeys.settings.notificationPreferences(userId),
    queryFn: () => api.get<Partial<NotificationPreferences>>("/notifications/preferences"),
    enabled: Boolean(userId),
    staleTime: staleTimes.reference,
  });
}

/**
 * The preferences with defaults filled in, plus a saver for one switch.
 *
 * A switch is applied to the cache immediately and rolled back if the PATCH
 * fails, so a failed save never leaves the control showing the wrong state.
 *
 * @returns The current preferences, the load/save flags and `setPreference`.
 */
export function useNotificationPreferences() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.userId ?? "";
  const key = queryKeys.settings.notificationPreferences(userId);
  const query = useNotificationPreferencesQuery();

  const mutation = useMutation({
    mutationFn: ({ field, value }: NotificationPreferencePatch) => {
      const body: NotificationPreferencesPayload = { [field]: value };
      return api.patch<Partial<NotificationPreferences>>("/notifications/preferences", body);
    },
    onMutate: async ({ field, value }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Partial<NotificationPreferences>>(key);
      queryClient.setQueryData<Partial<NotificationPreferences>>(key, (current) => ({ ...current, [field]: value }));
      return { previous };
    },
    onError: (_error, _patch, context) => {
      queryClient.setQueryData(key, context?.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: key });
    },
  });

  return {
    preferences: { ...DEFAULT_NOTIFICATION_PREFERENCES, ...(query.data ?? {}) },
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    /** Saves one switch. */
    setPreference: mutation.mutate,
    /** The switch currently being saved, if any. */
    savingField: mutation.isPending ? mutation.variables?.field : undefined,
  };
}
