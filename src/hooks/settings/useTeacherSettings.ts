"use client";

/**
 * The teacher settings overview and the workspace preferences stored with it.
 *
 * `GET /teacher/settings` returns the profile, employment and roster summary a
 * teacher sees on the Account section, plus the preferences the Messages,
 * Teaching, Guides and Appearance sections write back. It used to be fetched
 * twice per visit (once by the page, once per preference hook) and mirrored
 * into `localStorage` by hand; it is now one cached query, invalidated
 * explicitly by the mutations below.
 */
import { useMutation, useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { api } from "@/lib/apiClient";
import { queryKeys, staleTimes } from "@/lib/queryKeys";
import { useAuth } from "@/app/context/AuthContext";

/** Notification switches stored with the teacher's workspace preferences. */
export interface TeacherNotificationPrefs {
  announcements: boolean;
  attendance: boolean;
  grading: boolean;
  resources: boolean;
  messages: boolean;
  inApp: boolean;
  email: boolean;
  quietHoursEnabled: boolean;
  quietStart: string;
  quietEnd: string;
}

/** Chat preferences. `defaultFilter` mirrors `TeacherMessagePreferencesDto`. */
export interface TeacherMessagePrefs {
  groupNotifications: boolean;
  unreadBadge: boolean;
  soundEnabled: boolean;
  showOnlineStatus: boolean;
  defaultFilter: "all" | "private" | "groups";
}

/** Workspace defaults. Every value mirrors `TeacherTeachingPreferencesDto`. */
export interface TeacherTeachingPrefs {
  landingPage: "dashboard" | "timetable" | "attendance" | "messages";
  gradingView: "course" | "class";
  attendanceMode: "mark" | "view";
  timetableDisplay: "week" | "today";
  resourceDisplay: "grid" | "list";
}

/** In-app guide preferences. */
export interface TeacherGuidePrefs {
  showAppTips: boolean;
}

/** Everything `UpdateTeacherPreferencesDto` accepts, with nothing optional. */
export interface TeacherPreferences {
  notifications: TeacherNotificationPrefs;
  messages: TeacherMessagePrefs;
  teaching: TeacherTeachingPrefs;
  guides: TeacherGuidePrefs;
  theme: "light" | "dark" | "system";
}

/** The profile block of `GET /teacher/settings`. */
export interface TeacherSettingsProfile {
  fullName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  avatar?: string;
  role?: string;
  isActive?: boolean;
  joinedAt?: string;
  schoolName?: string;
  schoolIdentifier?: string;
}

/** The employment block of `GET /teacher/settings`. */
export interface TeacherSettingsEmployment {
  employeeId?: string;
  staffNumber?: string;
  employmentType?: string;
  employmentRole?: string;
  isFormTeacher?: boolean;
}

/** The roster summary of `GET /teacher/settings`. */
export interface TeacherSettingsSummary {
  classesAssigned?: number;
  subjectsTeaching?: number;
  studentsTeaching?: number | null;
  accountStatus?: string;
}

/** The whole `GET /teacher/settings` body. */
export interface TeacherSettings {
  profile?: TeacherSettingsProfile;
  employment?: TeacherSettingsEmployment;
  summary?: TeacherSettingsSummary;
  preferences?: TeacherPreferences;
}

/** The preferences a teacher starts with, matching the server's own defaults. */
export const DEFAULT_PREFERENCES: TeacherPreferences = {
  notifications: {
    announcements: true,
    attendance: true,
    grading: true,
    resources: true,
    messages: true,
    inApp: true,
    email: false,
    quietHoursEnabled: false,
    quietStart: "22:00",
    quietEnd: "07:00",
  },
  messages: {
    groupNotifications: true,
    unreadBadge: true,
    soundEnabled: false,
    showOnlineStatus: true,
    defaultFilter: "all",
  },
  teaching: {
    landingPage: "dashboard",
    gradingView: "course",
    attendanceMode: "mark",
    timetableDisplay: "week",
    resourceDisplay: "grid",
  },
  guides: { showAppTips: true },
  theme: "system",
};

/**
 * Keeps only the keys a preferences section declares.
 *
 * The API runs `forbidNonWhitelisted`, so one stray key (`_id` on a stored
 * subdocument, a field from an older release still in `localStorage`) turns
 * the whole PATCH into a 400. Whitelisting against the defaults is what makes
 * the payload match the DTO exactly.
 *
 * @typeParam T - The section's shape.
 * @param defaults - The section's default values, used as the key whitelist.
 * @param value - The values to clean.
 * @returns Only the recognised keys, with their values.
 */
export function pickKnown<T extends object>(defaults: T, value: unknown): Partial<T> {
  if (!value || typeof value !== "object") return {};
  const source = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(defaults)) {
    if (source[key] !== undefined) out[key] = source[key];
  }
  return out as Partial<T>;
}

/** What a stored (or partially typed) preferences document may look like: every section, and every field within it, optional. */
export type StoredPreferences = {
  [K in keyof TeacherPreferences]?: TeacherPreferences[K] extends object
    ? Partial<TeacherPreferences[K]>
    : TeacherPreferences[K];
};

/**
 * Fills in every missing preference from the defaults, dropping keys the DTO
 * does not declare.
 *
 * @param stored - Whatever the server (or an older client) stored.
 * @returns A complete, DTO-shaped preferences object.
 */
export function mergePreferences(stored: StoredPreferences | undefined): TeacherPreferences {
  return {
    notifications: { ...DEFAULT_PREFERENCES.notifications, ...pickKnown(DEFAULT_PREFERENCES.notifications, stored?.notifications) },
    messages: { ...DEFAULT_PREFERENCES.messages, ...pickKnown(DEFAULT_PREFERENCES.messages, stored?.messages) },
    teaching: { ...DEFAULT_PREFERENCES.teaching, ...pickKnown(DEFAULT_PREFERENCES.teaching, stored?.teaching) },
    guides: { ...DEFAULT_PREFERENCES.guides, ...pickKnown(DEFAULT_PREFERENCES.guides, stored?.guides) },
    theme: stored?.theme ?? DEFAULT_PREFERENCES.theme,
  };
}

/**
 * Strips a preferences patch down to exactly what `UpdateTeacherPreferencesDto`
 * declares, so an extra field never turns a save into a 400.
 *
 * @param updates - The sections the user changed.
 * @returns The payload to PATCH.
 */
export function toPreferencesPayload(updates: Partial<TeacherPreferences>): Partial<TeacherPreferences> {
  const payload: Partial<TeacherPreferences> = {};
  if (updates.notifications) payload.notifications = { ...DEFAULT_PREFERENCES.notifications, ...pickKnown(DEFAULT_PREFERENCES.notifications, updates.notifications) };
  if (updates.messages) payload.messages = { ...DEFAULT_PREFERENCES.messages, ...pickKnown(DEFAULT_PREFERENCES.messages, updates.messages) };
  if (updates.teaching) payload.teaching = { ...DEFAULT_PREFERENCES.teaching, ...pickKnown(DEFAULT_PREFERENCES.teaching, updates.teaching) };
  if (updates.guides) payload.guides = { ...DEFAULT_PREFERENCES.guides, ...pickKnown(DEFAULT_PREFERENCES.guides, updates.guides) };
  if (updates.theme) payload.theme = updates.theme;
  return payload;
}

/**
 * The settings overview for the signed-in teacher.
 *
 * @returns The query result; idle until there is a signed-in user.
 */
export function useTeacherSettings(): UseQueryResult<TeacherSettings, unknown> {
  const { user } = useAuth();
  const userId = user?.userId ?? "";

  return useQuery({
    queryKey: queryKeys.settings.teacher(userId),
    queryFn: () => api.get<TeacherSettings>("/teacher/settings"),
    enabled: Boolean(userId),
    staleTime: staleTimes.reference,
  });
}

/**
 * The teacher's stored preferences, with every default filled in.
 *
 * @returns The preferences plus whether they have been loaded from the server.
 */
export function useTeacherPreferences(): { preferences: TeacherPreferences; isLoading: boolean } {
  const { data, isLoading } = useTeacherSettings();
  return { preferences: mergePreferences(data?.preferences), isLoading };
}

/**
 * Saves one or more preference sections.
 *
 * The cached settings are updated optimistically so the control the teacher
 * just moved does not flick back, then invalidated so the server's own view
 * wins.
 *
 * @returns The mutation; `mutate` takes the sections that changed.
 */
export function useUpdateTeacherPreferences() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.userId ?? "";
  const key = queryKeys.settings.teacher(userId);

  return useMutation({
    mutationFn: (updates: Partial<TeacherPreferences>) =>
      api.patch<TeacherSettings>("/teacher/settings/preferences", toPreferencesPayload(updates)),
    onMutate: async (updates) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<TeacherSettings>(key);
      queryClient.setQueryData<TeacherSettings>(key, (current) => ({
        ...current,
        preferences: mergePreferences({ ...mergePreferences(current?.preferences), ...updates }),
      }));
      return { previous };
    },
    onError: (_error, _updates, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: key });
    },
  });
}

/**
 * Stores a new avatar URL on the teacher's profile.
 *
 * @returns The mutation; `mutate` takes the uploaded image's URL.
 */
export function useUpdateTeacherAvatar() {
  const queryClient = useQueryClient();
  const { user, updateUser } = useAuth();
  const userId = user?.userId ?? "";

  return useMutation({
    mutationFn: (avatarUrl: string) => api.patch<TeacherSettings>("/teacher/settings/profile", { avatarUrl }),
    onSuccess: (_data, avatarUrl) => {
      updateUser({ userAvatar: avatarUrl });
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.teacher(userId) });
    },
  });
}
