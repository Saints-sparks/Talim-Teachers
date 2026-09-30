"use client";

/**
 * The teacher settings overview and the workspace preferences stored with it.
 *
 * `GET /teacher/settings` returns the profile, employment and roster summary a
 * teacher sees on the Account tab, plus the preferences the Messages,
 * Teaching preferences, Help and Appearance tabs write back. It is one cached
 * query, invalidated explicitly by the mutations below.
 *
 * Round 4 (§31, §32 of `talimBE-V2/docs/redesign-teachers-round4-inbox-settings.md`):
 * - `messages` is exactly `{ showOnlineStatus, readReceipts, soundEnabled }`.
 * - The old `notifications` section is gone from the DTOs (alert switches
 *   live in `/notifications/preferences`); it is neither read nor sent.
 * The generated contract does not have that shape yet, so the payload type is
 * hand-written here from `MessagePreferences` until `npm run types:api` does.
 *
 * Whenever the settings load, and whenever the teaching section is saved,
 * the landing page is cached on this device (`cacheLandingPage`) so sign-in
 * can honour it even when this request is slow.
 */
import { useMutation, useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { api } from "@/lib/apiClient";
import { queryKeys, staleTimes } from "@/lib/queryKeys";
import { useAuth } from "@/app/context/AuthContext";
import { cacheLandingPage } from "@/app/lib/landing";
import type { TeacherPreferencesPayload, TeacherProfilePayload } from "@/types/apiPayloads";
import type { MessagePreferences } from "@/types/inboxSettings";

/** Chat preferences (§32): online status and read receipts are the chat module's, the sound stays here. */
export type TeacherMessagePrefs = MessagePreferences;

/** Workspace defaults (`TeacherTeachingPreferencesDto`), every field required. */
export type TeacherTeachingPrefs = Required<NonNullable<TeacherPreferencesPayload["teaching"]>>;

/**
 * In-app guide preferences (`TeacherGuidePreferencesDto`). `tourCompleted` is
 * left out: it is a one-shot command (true stamps `tourCompletedAt`, false
 * clears it), sent only by `todayService.completeTour`, never echoed back by a
 * settings save.
 */
export type TeacherGuidePrefs = Required<Omit<NonNullable<TeacherPreferencesPayload["guides"]>, "tourCompleted">>;

/** The theme choice (`light`, `dark` or `system`). */
export type TeacherThemePref = NonNullable<TeacherPreferencesPayload["theme"]>;

/** Everything the Round 4 preferences hold, with nothing optional. */
export interface TeacherPreferences {
  messages: TeacherMessagePrefs;
  teaching: TeacherTeachingPrefs;
  guides: TeacherGuidePrefs;
  theme: TeacherThemePref;
}

/**
 * The body of `PATCH /teacher/settings/preferences` in Round 4: the generated
 * DTO without `notifications`, and with the new `messages` section.
 */
export type TeacherPreferencesBody = Omit<TeacherPreferencesPayload, "notifications" | "messages"> & {
  messages?: TeacherMessagePrefs;
};

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

/** The whole `GET /teacher/settings` body. `preferences` may still carry fields older releases stored. */
export interface TeacherSettings {
  profile?: TeacherSettingsProfile;
  employment?: TeacherSettingsEmployment;
  summary?: TeacherSettingsSummary;
  preferences?: StoredPreferences;
}

/** The preferences a teacher starts with, matching the server's own defaults. */
export const DEFAULT_PREFERENCES: TeacherPreferences = {
  messages: {
    showOnlineStatus: true,
    readReceipts: true,
    soundEnabled: false,
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

/**
 * What a stored (or partially typed) preferences document may look like:
 * every section, and every field within it, optional. A section an older
 * release stored (`notifications`) may still be there; it is ignored.
 */
export type StoredPreferences = {
  [K in keyof TeacherPreferences]?: TeacherPreferences[K] extends object
    ? Partial<TeacherPreferences[K]>
    : TeacherPreferences[K];
} & { notifications?: unknown };

/**
 * Fills in every missing preference from the defaults, dropping keys the DTO
 * does not declare.
 *
 * @param stored - Whatever the server (or an older client) stored.
 * @returns A complete, DTO-shaped preferences object.
 */
export function mergePreferences(stored: StoredPreferences | undefined): TeacherPreferences {
  return {
    messages: { ...DEFAULT_PREFERENCES.messages, ...pickKnown(DEFAULT_PREFERENCES.messages, stored?.messages) },
    teaching: { ...DEFAULT_PREFERENCES.teaching, ...pickKnown(DEFAULT_PREFERENCES.teaching, stored?.teaching) },
    guides: { ...DEFAULT_PREFERENCES.guides, ...pickKnown(DEFAULT_PREFERENCES.guides, stored?.guides) },
    theme: stored?.theme ?? DEFAULT_PREFERENCES.theme,
  };
}

/**
 * Strips a preferences patch down to exactly what the Round 4 DTO declares,
 * so an extra field never turns a save into a 400. The old `notifications`
 * section is never sent.
 *
 * @param updates - The sections the user changed.
 * @returns The payload to PATCH.
 */
export function toPreferencesPayload(updates: Partial<TeacherPreferences>): TeacherPreferencesBody {
  const payload: TeacherPreferencesBody = {};
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
    queryFn: async () => {
      const settings = await api.get<TeacherSettings>("/teacher/settings");
      cacheLandingPage(userId, settings?.preferences?.teaching?.landingPage ?? DEFAULT_PREFERENCES.teaching.landingPage);
      return settings;
    },
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
 * wins. A saved landing page is also cached on this device for sign-in.
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
    onSuccess: (_data, updates) => {
      if (updates.teaching?.landingPage) cacheLandingPage(userId, updates.teaching.landingPage);
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
    mutationFn: (avatarUrl: string) => {
      const body: TeacherProfilePayload = { avatarUrl };
      return api.patch<TeacherSettings>("/teacher/settings/profile", body);
    },
    onSuccess: (_data, avatarUrl) => {
      updateUser({ userAvatar: avatarUrl });
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.teacher(userId) });
    },
  });
}
