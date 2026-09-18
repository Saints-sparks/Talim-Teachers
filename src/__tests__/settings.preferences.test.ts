import {
  DEFAULT_PREFERENCES,
  mergePreferences,
  pickKnown,
  toPreferencesPayload,
} from "@/hooks/settings/useTeacherSettings";

describe("pickKnown", () => {
  it("keeps only keys the defaults declare", () => {
    const result = pickKnown(DEFAULT_PREFERENCES.messages, {
      groupNotifications: false,
      _id: "abc123",
      unknownField: "nope",
    });
    expect(result).toEqual({ groupNotifications: false });
  });

  it("returns an empty object for non-object input", () => {
    expect(pickKnown(DEFAULT_PREFERENCES.messages, undefined)).toEqual({});
    expect(pickKnown(DEFAULT_PREFERENCES.messages, null)).toEqual({});
    expect(pickKnown(DEFAULT_PREFERENCES.messages, "nope")).toEqual({});
  });
});

describe("mergePreferences", () => {
  it("fills in every default when nothing is stored", () => {
    expect(mergePreferences(undefined)).toEqual(DEFAULT_PREFERENCES);
  });

  it("overlays stored values onto the defaults, section by section", () => {
    const merged = mergePreferences({
      theme: "dark",
      teaching: { landingPage: "attendance" },
    });
    expect(merged.theme).toBe("dark");
    expect(merged.teaching.landingPage).toBe("attendance");
    // Untouched sections keep every default.
    expect(merged.notifications).toEqual(DEFAULT_PREFERENCES.notifications);
    expect(merged.teaching.gradingView).toBe(DEFAULT_PREFERENCES.teaching.gradingView);
  });

  it("drops a stray field a stored document might carry (e.g. Mongo's _id)", () => {
    const merged = mergePreferences({
      // @ts-expect-error -- simulating a stored subdocument with an extra key
      notifications: { _id: "abc123", email: true },
    });
    expect(merged.notifications).not.toHaveProperty("_id");
    expect(merged.notifications.email).toBe(true);
  });
});

describe("toPreferencesPayload", () => {
  it("sends only the sections that changed", () => {
    const payload = toPreferencesPayload({ theme: "light" });
    expect(payload).toEqual({ theme: "light" });
    expect(payload.notifications).toBeUndefined();
  });

  it("whitelists a changed section so an extra key never reaches the API", () => {
    const payload = toPreferencesPayload({
      // @ts-expect-error -- simulating a caller passing through a stray field
      messages: { ...DEFAULT_PREFERENCES.messages, defaultFilter: "groups", extra: "nope" },
    });
    expect(payload.messages).toEqual({ ...DEFAULT_PREFERENCES.messages, defaultFilter: "groups" });
    expect(payload.messages).not.toHaveProperty("extra");
  });

  it("produces an empty payload when nothing changed", () => {
    expect(toPreferencesPayload({})).toEqual({});
  });
});
