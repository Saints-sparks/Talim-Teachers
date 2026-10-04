import {
  SETTINGS_TABS,
  formatClockTime,
  formatJoinedDate,
  gettingStartedDescription,
  humanise,
  isSupportDescriptionValid,
  mapsHref,
  numberWord,
  officeHoursValue,
  officeSubtitle,
  parseSettingsTab,
  profileRecordSections,
  classTeacherOfNames,
  isClassTeacher,
  quietHoursDescription,
  revokedOthersMessage,
  sessionActivity,
  sessionDescription,
  sessionLabel,
  settingsHref,
  sortSessions,
  supportCountLabel,
  telHref,
  validateProfileField,
} from "@/hooks/settings/settings.logic";
import type { AuthSession } from "@/types/inboxSettings";

describe("the Settings tabs", () => {
  it("are the design's eight, in order, with their rail copy", () => {
    expect(SETTINGS_TABS.map((tab) => [tab.id, tab.label, tab.description])).toEqual([
      ["account", "Account", "Profile and contact details"],
      ["notifications", "Notifications", "What reaches you and how"],
      ["messages", "Messages", "Conversations and status"],
      ["teaching", "Teaching preferences", "Workspace defaults"],
      ["appearance", "Appearance", "Theme and display"],
      ["security", "Security", "Password and sign-in"],
      ["help", "Help", "Guides and support"],
      ["about", "About", "Version and legal"],
    ]);
  });

  it("parse ?tab=, following the aliases and defaulting to Account", () => {
    expect(parseSettingsTab("security")).toBe("security");
    expect(parseSettingsTab("Teaching")).toBe("teaching");
    expect(parseSettingsTab("alerts")).toBe("notifications");
    expect(parseSettingsTab("prefs")).toBe("teaching");
    expect(parseSettingsTab("onboarding")).toBe("help");
    expect(parseSettingsTab("profile")).toBe("account");
    expect(parseSettingsTab("nonsense")).toBe("account");
    expect(parseSettingsTab(null)).toBe("account");
    expect(parseSettingsTab("")).toBe("account");
  });

  it("link to a tab", () => {
    expect(settingsHref("help")).toBe("/settings?tab=help");
  });
});

describe("times and dates", () => {
  it("write clock times the way the copy does", () => {
    expect(formatClockTime("19:00")).toBe("7pm");
    expect(formatClockTime("06:30")).toBe("6:30am");
    expect(formatClockTime("00:00")).toBe("12am");
    expect(formatClockTime("12:15")).toBe("12:15pm");
    expect(formatClockTime("08:00", "full")).toBe("8:00am");
    expect(formatClockTime("16:00", "full")).toBe("4:00pm");
    expect(formatClockTime("25:00")).toBeNull();
    expect(formatClockTime("soon")).toBeNull();
    expect(formatClockTime(undefined)).toBeNull();
  });

  it("describe quiet hours from the real stored times", () => {
    expect(quietHoursDescription("19:00", "06:30")).toBe("Hold non-urgent alerts between 7pm and 6:30am");
    expect(quietHoursDescription("22:00", "07:00")).toBe("Hold non-urgent alerts between 10pm and 7am");
    expect(quietHoursDescription("", "07:00")).toBe("Hold non-urgent alerts overnight");
  });

  it("show the office hours, or say the school has not set them", () => {
    expect(officeHoursValue({ start: "08:00", end: "16:00" })).toBe("8:00am – 4:00pm");
    expect(officeHoursValue(null)).toBe("Not set by your school");
    expect(officeSubtitle({ start: "08:00", end: "16:00" })).toBe("The school office, Monday to Friday, 8am – 4pm.");
    expect(officeSubtitle(null)).toBe("The school office.");
  });

  it("write the join date as 12 May 2026", () => {
    expect(formatJoinedDate(new Date(2026, 4, 12, 9).toISOString())).toBe("12 May 2026");
    expect(formatJoinedDate(undefined)).toBe("—");
    expect(formatJoinedDate("not a date")).toBe("—");
  });
});

describe("sessions", () => {
  const now = new Date(2026, 8, 25, 10, 0);
  const session = (overrides: Partial<AuthSession>): AuthSession => ({
    id: "s",
    device: "Desktop",
    browser: "Chrome 129",
    os: "Windows 11",
    ip: "102.89.34.12",
    lastUsedAt: new Date(2026, 8, 24, 19, 2).toISOString(),
    createdAt: new Date(2026, 8, 1).toISOString(),
    current: false,
    ...overrides,
  });

  it("are labelled by browser and system, with fallbacks for gaps", () => {
    expect(sessionLabel(session({}))).toBe("Chrome 129 on Windows 11");
    expect(sessionLabel(session({ browser: null, os: null, device: null }))).toBe("Unknown browser on Unknown device");
    expect(sessionLabel(session({ os: null, device: "iPhone" }))).toBe("Chrome 129 on iPhone");
  });

  it("say when they were last used", () => {
    expect(sessionActivity(session({ current: true }), now)).toBe("Active now");
    expect(sessionActivity(session({ lastUsedAt: new Date(2026, 8, 25, 9, 58).toISOString() }), now)).toBe("Active now");
    expect(sessionActivity(session({}), now)).toBe("Last active 24 Sep, 7:02pm");
    expect(sessionActivity(session({ lastUsedAt: new Date(2025, 11, 3, 8, 5).toISOString() }), now)).toBe("Last active 3 Dec 2025, 8:05am");
  });

  it("describe device, address and activity, leaving out what is missing", () => {
    expect(sessionDescription(session({ current: true }), now)).toBe("Desktop · 102.89.34.12 · Active now");
    expect(sessionDescription(session({ device: null, ip: null }), now)).toBe("Last active 24 Sep, 7:02pm");
  });

  it("list this device first, then the most recently used", () => {
    const sorted = sortSessions([
      session({ id: "old", lastUsedAt: new Date(2026, 8, 1).toISOString() }),
      session({ id: "recent", lastUsedAt: new Date(2026, 8, 20).toISOString() }),
      session({ id: "this", current: true, lastUsedAt: new Date(2026, 7, 1).toISOString() }),
    ]);
    expect(sorted.map((item) => item.id)).toEqual(["this", "recent", "old"]);
  });

  it("count the devices signed out", () => {
    expect(revokedOthersMessage(1)).toBe("Signed out of 1 other device.");
    expect(revokedOthersMessage(3)).toBe("Signed out of 3 other devices.");
    expect(revokedOthersMessage(0)).toBe("No other devices were signed in.");
  });
});

describe("help", () => {
  it("spells out the tour length with the right article", () => {
    expect(numberWord(7)).toBe("seven");
    expect(numberWord(42)).toBe("42");
    expect(gettingStartedDescription(7)).toBe("A seven step walk through the teacher portal");
    expect(gettingStartedDescription(8)).toBe("An eight step walk through the teacher portal");
    expect(gettingStartedDescription(11)).toBe("An eleven step walk through the teacher portal");
  });

  it("builds the office links", () => {
    expect(telHref("+234 802 415 7730")).toBe("tel:+2348024157730");
    expect(telHref("0802-415-7730")).toBe("tel:08024157730");
    expect(mapsHref("14 Oduduwa Crescent, GRA Ikeja, Lagos")).toBe(
      "https://www.google.com/maps/search/?api=1&query=14%20Oduduwa%20Crescent%2C%20GRA%20Ikeja%2C%20Lagos",
    );
  });

  it("accepts a problem description of 10 to 2000 characters", () => {
    expect(isSupportDescriptionValid("too short")).toBe(false);
    expect(isSupportDescriptionValid("   Scores vanish   ")).toBe(true);
    expect(isSupportDescriptionValid("x".repeat(2001))).toBe(false);
    expect(supportCountLabel("abc")).toBe("3 / 2000 · at least 10 characters");
    expect(supportCountLabel("x".repeat(12))).toBe("12 / 2000");
  });
});

describe("profile", () => {
  it("validates names and the phone as §33 does", () => {
    expect(validateProfileField("firstName", "  ")).toBe("Enter your first name");
    expect(validateProfileField("lastName", "")).toBe("Enter your last name");
    expect(validateProfileField("firstName", "x".repeat(61))).toBe("Use 60 characters or fewer");
    expect(validateProfileField("firstName", " Tolu ")).toBeNull();
    expect(validateProfileField("phoneNumber", "12ab")).toBe("Use 7 to 20 digits, spaces or dashes, with an optional +");
    expect(validateProfileField("phoneNumber", "123")).not.toBeNull();
    expect(validateProfileField("phoneNumber", "+234 802-415 7730")).toBeNull();
  });

  it("humanises stored enums", () => {
    expect(humanise("full_time")).toBe("Full time");
    expect(humanise("MONDAY")).toBe("Monday");
    expect(humanise(undefined)).toBe("");
  });

  it("keeps only the filled parts of the teacher record, and no empty section", () => {
    const sections = profileRecordSections(
      {
        classTeacherClasses: [{ name: "Grade 5A" }, { name: "Grade 5A" }, "ignored-id"],
        assignedCourses: [{ title: "Mathematics", courseCode: "MTH-5A" }, { title: "Basic Science" }],
        highestAcademicQualification: "B.Ed Mathematics",
        yearsOfExperience: 6,
        specialization: "",
        availabilityDays: ["monday", "wednesday"],
        availableTime: "",
      },
      "full_time",
    );
    expect(sections).toEqual([
      {
        heading: "Classes and subjects",
        items: [
          { label: "Class teacher of", value: "Grade 5A" },
          { label: "Subjects", value: "Mathematics (MTH-5A), Basic Science" },
        ],
      },
      { heading: "Qualifications and experience", items: [{ label: "Highest qualification", value: "B.Ed Mathematics" }, { label: "Experience", value: "6 years" }] },
      { heading: "Employment and availability", items: [{ label: "Employment type", value: "Full time" }, { label: "Available days", value: "Monday, Wednesday" }] },
    ]);
    expect(profileRecordSections(null)).toEqual([]);
    expect(profileRecordSections({ yearsOfExperience: 0, assignedCourses: [] })).toEqual([]);
  });

  it("names only the classes the teacher leads (classTeacherOf, A6), not those merely assigned", () => {
    const record = {
      classTeacherClasses: [{ name: "Grade 6B" }, { name: "Grade 5A" }],
      classTeacherOf: [{ id: "c1", name: "Grade 5A" }],
    };
    expect(classTeacherOfNames(record)).toEqual(["Grade 5A"]);
    expect(profileRecordSections(record)[0].items[0]).toEqual({ label: "Class teacher of", value: "Grade 5A" });
    // An older API without classTeacherOf: the mixed list is all there is.
    expect(classTeacherOfNames({ classTeacherClasses: [{ name: "Grade 6B" }] })).toEqual(["Grade 6B"]);
    expect(classTeacherOfNames(null)).toEqual([]);
  });

  it("takes the class-teacher role from classTeacherOf, and the profile flag only from an older API", () => {
    expect(isClassTeacher({ classTeacherOf: [{ id: "c1", name: "Grade 5A" }] }, false)).toBe(true);
    expect(isClassTeacher({ classTeacherOf: [] }, true)).toBe(false);
    expect(isClassTeacher({ classTeacherClasses: [{ name: "Grade 5A" }] }, true)).toBe(true);
    expect(isClassTeacher({}, false)).toBe(false);
    expect(isClassTeacher(null, true)).toBe(true);
  });
});
