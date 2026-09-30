/**
 * @jest-environment jsdom
 */
import React from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthContext } from "@/app/context/AuthContext";
import { landingCacheKey } from "@/app/lib/landing";
import { api } from "@/lib/apiClient";
import { makeMockAuthValue, mockTeacher } from "@/test-utils/render";
import {
  DEFAULT_PREFERENCES,
  mergePreferences,
  pickKnown,
  toPreferencesPayload,
  useTeacherPreferences,
  useTeacherSettings,
  useUpdateTeacherPreferences,
} from "@/hooks/settings/useTeacherSettings";

jest.mock("@/lib/apiClient", () => ({ api: { get: jest.fn(), patch: jest.fn() } }));

const get = api.get as jest.Mock;
const patch = api.patch as jest.Mock;

/**
 * Wraps a hook in a fresh query client and a signed-in teacher.
 *
 * @param props - The children.
 * @param props.children - The hook host.
 * @returns The providers.
 */
function Providers({ children }: { children: React.ReactNode }) {
  const [client] = React.useState(() => new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } }));
  return React.createElement(
    QueryClientProvider,
    { client },
    React.createElement(AuthContext.Provider, { value: makeMockAuthValue(mockTeacher) }, children),
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
});

describe("pickKnown", () => {
  it("keeps only keys the defaults declare", () => {
    const result = pickKnown(DEFAULT_PREFERENCES.messages, {
      readReceipts: false,
      groupNotifications: false,
      _id: "abc123",
    });
    expect(result).toEqual({ readReceipts: false });
  });

  it("returns an empty object for non-object input", () => {
    expect(pickKnown(DEFAULT_PREFERENCES.messages, undefined)).toEqual({});
    expect(pickKnown(DEFAULT_PREFERENCES.messages, null)).toEqual({});
    expect(pickKnown(DEFAULT_PREFERENCES.messages, "nope")).toEqual({});
  });
});

describe("mergePreferences (Round 4 shape)", () => {
  it("fills in every default when nothing is stored", () => {
    expect(mergePreferences(undefined)).toEqual(DEFAULT_PREFERENCES);
  });

  it("has exactly the three message switches (§32) and no notifications section (§31)", () => {
    expect(Object.keys(DEFAULT_PREFERENCES.messages).sort()).toEqual(["readReceipts", "showOnlineStatus", "soundEnabled"]);
    expect(DEFAULT_PREFERENCES).not.toHaveProperty("notifications");
  });

  it("overlays stored values onto the defaults, section by section", () => {
    const merged = mergePreferences({ theme: "dark", teaching: { landingPage: "attendance" } });
    expect(merged.theme).toBe("dark");
    expect(merged.teaching.landingPage).toBe("attendance");
    expect(merged.messages).toEqual(DEFAULT_PREFERENCES.messages);
    expect(merged.teaching.gradingView).toBe(DEFAULT_PREFERENCES.teaching.gradingView);
  });

  it("drops what an older release stored: the notifications section and the old message fields", () => {
    const merged = mergePreferences({
      notifications: { email: true, quietStart: "22:00" },
      // @ts-expect-error -- simulating a stored subdocument from before Round 4
      messages: { _id: "abc123", groupNotifications: false, defaultFilter: "groups", soundEnabled: true },
    });
    expect(merged).not.toHaveProperty("notifications");
    expect(merged.messages).toEqual({ ...DEFAULT_PREFERENCES.messages, soundEnabled: true });
  });

  it("keeps the paths other screens read", () => {
    const merged = mergePreferences(undefined);
    expect(merged.messages.soundEnabled).toBe(false);
    expect(merged.guides.showAppTips).toBe(true);
    expect(merged.teaching).toMatchObject({ gradingView: "course", timetableDisplay: "week", landingPage: "dashboard" });
    expect(merged.theme).toBe("system");
  });
});

describe("toPreferencesPayload", () => {
  it("sends only the sections that changed", () => {
    expect(toPreferencesPayload({ theme: "light" })).toEqual({ theme: "light" });
  });

  it("sends exactly { showOnlineStatus, readReceipts, soundEnabled } for messages", () => {
    const payload = toPreferencesPayload({
      // @ts-expect-error -- simulating a caller passing through stale fields
      messages: { ...DEFAULT_PREFERENCES.messages, readReceipts: false, defaultFilter: "groups", unreadBadge: true },
    });
    expect(payload.messages).toEqual({ showOnlineStatus: true, readReceipts: false, soundEnabled: false });
  });

  it("never sends a notifications section, even when a caller passes one", () => {
    // @ts-expect-error -- the section no longer exists in the DTO
    const payload = toPreferencesPayload({ notifications: { email: true }, theme: "dark" });
    expect(payload).toEqual({ theme: "dark" });
  });

  it("produces an empty payload when nothing changed", () => {
    expect(toPreferencesPayload({})).toEqual({});
  });
});

describe("the preference hooks", () => {
  it("load GET /teacher/settings once and cache the landing page on this device", async () => {
    get.mockResolvedValue({ preferences: { teaching: { landingPage: "timetable" }, messages: { readReceipts: false } } });
    const { result } = renderHook(() => ({ settings: useTeacherSettings(), prefs: useTeacherPreferences() }), { wrapper: Providers });

    await waitFor(() => expect(result.current.prefs.isLoading).toBe(false));
    expect(get).toHaveBeenCalledTimes(1);
    expect(get).toHaveBeenCalledWith("/teacher/settings");
    expect(result.current.prefs.preferences.messages.readReceipts).toBe(false);
    expect(localStorage.getItem(landingCacheKey(mockTeacher.userId))).toBe("timetable");
  });

  it("PATCH only the changed section, and cache a saved landing page", async () => {
    get.mockResolvedValue({ preferences: {} });
    patch.mockResolvedValue({});
    const { result } = renderHook(() => useUpdateTeacherPreferences(), { wrapper: Providers });

    result.current.mutate({ teaching: { ...DEFAULT_PREFERENCES.teaching, landingPage: "messages" } });

    await waitFor(() => expect(patch).toHaveBeenCalledTimes(1));
    expect(patch).toHaveBeenCalledWith("/teacher/settings/preferences", { teaching: { ...DEFAULT_PREFERENCES.teaching, landingPage: "messages" } });
    await waitFor(() => expect(localStorage.getItem(landingCacheKey(mockTeacher.userId))).toBe("messages"));
  });
});
