/**
 * Pure helpers behind the redesigned Settings (`/settings?tab=`): the tabs and
 * their aliases, the copy built from real data (quiet hours, office hours,
 * sessions, the tour length), profile validation and the office links.
 * Nothing here touches React or the network, so all of it is unit-tested in
 * `src/__tests__/settings.logic.test.ts`.
 */
import { PROFILE_NAME_MAX, PROFILE_PHONE_PATTERN, SUPPORT_DESCRIPTION_MAX, SUPPORT_DESCRIPTION_MIN } from "@/types/inboxSettings";
import type { AuthSession, SchoolContact, SupportArea } from "@/types/inboxSettings";

// ─── Tabs ───────────────────────────────────────────────────────────────────

/** The Settings tabs, in rail order; also the values `?tab=` takes. */
export type SettingsTabId = "account" | "notifications" | "messages" | "teaching" | "appearance" | "security" | "help" | "about";

/** One tab of the rail and the panel it opens (the design's TABS and PANELS). */
export interface SettingsTab {
  id: SettingsTabId;
  /** The rail label. */
  label: string;
  /** The rail's second line. */
  description: string;
  /** The panel heading. */
  title: string;
  /** The line under the panel heading. */
  body: string;
}

export const SETTINGS_TABS: readonly SettingsTab[] = [
  { id: "account", label: "Account", description: "Profile and contact details", title: "Account", body: "How colleagues, students and parents see you." },
  {
    id: "notifications",
    label: "Notifications",
    description: "What reaches you and how",
    title: "Notifications",
    body: "Deadlines from the school are always delivered. Everything else is up to you.",
  },
  { id: "messages", label: "Messages", description: "Conversations and status", title: "Messages", body: "Control how you appear in conversations." },
  {
    id: "teaching",
    label: "Teaching preferences",
    description: "Workspace defaults",
    title: "Teaching preferences",
    body: "Defaults that follow you to every device you sign in on.",
  },
  { id: "appearance", label: "Appearance", description: "Theme and display", title: "Appearance", body: "Choose how Talim looks for you." },
  { id: "security", label: "Security", description: "Password and sign-in", title: "Security", body: "Keep your account and your students' records safe." },
  { id: "help", label: "Help", description: "Guides and support", title: "Help", body: "Guides written for teachers, and people to ask." },
  { id: "about", label: "About", description: "Version and legal", title: "About", body: "App information and legal." },
];

/** Older and design names for a tab, kept working for links and bookmarks. */
export const SETTINGS_TAB_ALIASES: Readonly<Record<string, SettingsTabId>> = {
  alerts: "notifications",
  prefs: "teaching",
  onboarding: "help",
  profile: "account",
};

/** The tab `/settings` opens on. */
export const DEFAULT_SETTINGS_TAB: SettingsTabId = "account";

/**
 * The tab a `?tab=` value names.
 *
 * @param value - The raw query value.
 * @returns The tab, following aliases; Account for anything unknown or missing.
 */
export function parseSettingsTab(value: string | null | undefined): SettingsTabId {
  const key = (value ?? "").trim().toLowerCase();
  if (!key) return DEFAULT_SETTINGS_TAB;
  if (SETTINGS_TABS.some((tab) => tab.id === key)) return key as SettingsTabId;
  return SETTINGS_TAB_ALIASES[key] ?? DEFAULT_SETTINGS_TAB;
}

/**
 * The link to one Settings tab.
 *
 * @param tab - The tab.
 * @returns e.g. `/settings?tab=security`.
 */
export function settingsHref(tab: SettingsTabId): string {
  return `/settings?tab=${tab}`;
}

/**
 * The tab definition for an id.
 *
 * @param id - The tab.
 * @returns Its labels and panel copy.
 */
export function settingsTab(id: SettingsTabId): SettingsTab {
  return SETTINGS_TABS.find((tab) => tab.id === id) ?? SETTINGS_TABS[0];
}

// ─── Times and dates ────────────────────────────────────────────────────────

/**
 * An `HH:mm` time as the copy writes it.
 *
 * @param hhmm - e.g. `19:00`, `06:30`.
 * @param style - `short` drops `:00` ("7pm", "6:30am"); `full` keeps it ("8:00am").
 * @returns The time, or null when the value is not `HH:mm`.
 */
export function formatClockTime(hhmm: string | null | undefined, style: "short" | "full" = "short"): string | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec((hhmm ?? "").trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  const suffix = hours < 12 ? "am" : "pm";
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  if (style === "short" && minutes === 0) return `${hour12}${suffix}`;
  return `${hour12}:${String(minutes).padStart(2, "0")}${suffix}`;
}

/**
 * The Quiet hours row's description, from the stored times.
 *
 * @param start - `quietHoursStart`, `HH:mm`.
 * @param end - `quietHoursEnd`, `HH:mm`.
 * @returns e.g. "Hold non-urgent alerts between 7pm and 6:30am".
 */
export function quietHoursDescription(start: string | null | undefined, end: string | null | undefined): string {
  const from = formatClockTime(start);
  const to = formatClockTime(end);
  if (!from || !to) return "Hold non-urgent alerts overnight";
  return `Hold non-urgent alerts between ${from} and ${to}`;
}

/**
 * The Office hours value on the Messages tab.
 *
 * @param hours - `officeHours` from `GET /teachers/me/school`.
 * @returns e.g. "8:00am – 4:00pm", or "Not set by your school".
 */
export function officeHoursValue(hours: SchoolContact["officeHours"] | undefined): string {
  const from = formatClockTime(hours?.start, "full");
  const to = formatClockTime(hours?.end, "full");
  return from && to ? `${from} – ${to}` : "Not set by your school";
}

/**
 * The contact sheet's subtitle.
 *
 * @param hours - `officeHours` from `GET /teachers/me/school`.
 * @returns "The school office, Monday to Friday, 8am – 4pm." or "The school office.".
 */
export function officeSubtitle(hours: SchoolContact["officeHours"] | undefined): string {
  const from = formatClockTime(hours?.start);
  const to = formatClockTime(hours?.end);
  return from && to ? `The school office, Monday to Friday, ${from} – ${to}.` : "The school office.";
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * A stored date as the Account tab shows it.
 *
 * @param iso - An ISO timestamp.
 * @returns e.g. "12 May 2026", or "—" when missing or unreadable.
 */
export function formatJoinedDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

// ─── Sessions ───────────────────────────────────────────────────────────────

/** A session counts as active now when it was used this recently. */
export const ACTIVE_NOW_MS = 5 * 60_000;

/**
 * A session's row label.
 *
 * @param session - One entry of `GET /auth/sessions`.
 * @returns e.g. "Chrome 129 on Windows 11", with "Unknown browser" / "Unknown device" for gaps.
 */
export function sessionLabel(session: Pick<AuthSession, "browser" | "os" | "device">): string {
  const browser = session.browser?.trim() || "Unknown browser";
  const system = session.os?.trim() || session.device?.trim() || "Unknown device";
  return `${browser} on ${system}`;
}

/**
 * When a session was last used, as the row says it.
 *
 * @param session - One entry of `GET /auth/sessions`.
 * @param now - The current time.
 * @returns "Active now" or e.g. "Last active 24 Sep, 7:02pm" (with the year when it isn't this year).
 */
export function sessionActivity(session: Pick<AuthSession, "current" | "lastUsedAt">, now: Date = new Date()): string {
  if (session.current) return "Active now";
  const used = new Date(session.lastUsedAt);
  if (Number.isNaN(used.getTime())) return "Last active some time ago";
  if (now.getTime() - used.getTime() < ACTIVE_NOW_MS) return "Active now";
  const hours = String(used.getHours()).padStart(2, "0");
  const minutes = String(used.getMinutes()).padStart(2, "0");
  const year = used.getFullYear() === now.getFullYear() ? "" : ` ${used.getFullYear()}`;
  return `Last active ${used.getDate()} ${MONTHS[used.getMonth()]}${year}, ${formatClockTime(`${hours}:${minutes}`, "full")}`;
}

/**
 * A session's second line.
 *
 * @param session - One entry of `GET /auth/sessions`.
 * @param now - The current time.
 * @returns e.g. "Desktop · 102.89.34.12 · Active now" (missing parts are left out).
 */
export function sessionDescription(session: AuthSession, now: Date = new Date()): string {
  return [session.device?.trim(), session.ip?.trim(), sessionActivity(session, now)].filter(Boolean).join(" · ");
}

/**
 * Sorts sessions for the list: this device first, then the most recently used.
 *
 * @param sessions - `GET /auth/sessions`.
 * @returns A new, sorted array.
 */
export function sortSessions(sessions: readonly AuthSession[]): AuthSession[] {
  return [...sessions].sort((a, b) => {
    if (a.current !== b.current) return a.current ? -1 : 1;
    return new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime();
  });
}

/**
 * The toast after "Sign out of other devices".
 *
 * @param revoked - `{ revoked }` from the server.
 * @returns e.g. "Signed out of 2 other devices.".
 */
export function revokedOthersMessage(revoked: number): string {
  if (revoked <= 0) return "No other devices were signed in.";
  return `Signed out of ${revoked} other device${revoked === 1 ? "" : "s"}.`;
}

// ─── Help ───────────────────────────────────────────────────────────────────

const NUMBER_WORDS = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
  "nineteen",
  "twenty",
];

/**
 * A small count spelled out, as the copy writes it.
 *
 * @param count - A whole number.
 * @returns "eight"; digits above twenty.
 */
export function numberWord(count: number): string {
  return Number.isInteger(count) && count >= 0 && count < NUMBER_WORDS.length ? NUMBER_WORDS[count] : String(count);
}

/**
 * The "Getting started" row's description, from the tour's real length.
 *
 * @param steps - How many steps the portal tour has.
 * @returns e.g. "An eight step walk through the teacher portal".
 */
export function gettingStartedDescription(steps: number): string {
  const word = numberWord(steps);
  const article = /^(eight|eleven|eighteen|8|11|18)/.test(word) ? "An" : "A";
  return `${article} ${word} step walk through the teacher portal`;
}

/**
 * A phone number as a `tel:` link.
 *
 * @param phone - As the school stored it ("+234 802 415 7730").
 * @returns e.g. `tel:+2348024157730`.
 */
export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

/**
 * An address as a Google Maps search link.
 *
 * @param address - The school's address.
 * @returns The maps URL.
 */
export function mapsHref(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

/** The report sheet's area chips (the design's order and labels). */
export const SUPPORT_AREAS: ReadonlyArray<{ id: SupportArea; label: string }> = [
  { id: "grading", label: "Grading" },
  { id: "attendance", label: "Attendance" },
  { id: "timetable", label: "Timetable" },
  { id: "messages", label: "Messages" },
  { id: "signing_in", label: "Signing in" },
  { id: "other", label: "Something else" },
];

/**
 * Whether a problem description can be sent.
 *
 * @param text - What the teacher typed.
 * @returns True for 10–2000 characters after trimming.
 */
export function isSupportDescriptionValid(text: string): boolean {
  const length = text.trim().length;
  return length >= SUPPORT_DESCRIPTION_MIN && length <= SUPPORT_DESCRIPTION_MAX;
}

/**
 * The line under the description box.
 *
 * @param text - What the teacher typed.
 * @returns e.g. "4 / 2000 · at least 10 characters", or "120 / 2000".
 */
export function supportCountLabel(text: string): string {
  const length = text.trim().length;
  const count = `${length} / ${SUPPORT_DESCRIPTION_MAX}`;
  if (length < SUPPORT_DESCRIPTION_MIN) return `${count} · at least ${SUPPORT_DESCRIPTION_MIN} characters`;
  if (length > SUPPORT_DESCRIPTION_MAX) return `${count} · too long`;
  return count;
}

// ─── Profile ────────────────────────────────────────────────────────────────

/** The profile fields a teacher edits (§33). */
export type ProfileField = "firstName" | "lastName" | "phoneNumber";

/**
 * Checks one profile field before it is saved.
 *
 * @param field - Which field.
 * @param value - Its value (trimmed here).
 * @returns The message to show, or null when the value can be saved.
 */
export function validateProfileField(field: ProfileField, value: string): string | null {
  const trimmed = value.trim();
  if (field === "phoneNumber") {
    return PROFILE_PHONE_PATTERN.test(trimmed) ? null : "Use 7 to 20 digits, spaces or dashes, with an optional +";
  }
  if (!trimmed) return field === "firstName" ? "Enter your first name" : "Enter your last name";
  if (trimmed.length > PROFILE_NAME_MAX) return `Use ${PROFILE_NAME_MAX} characters or fewer`;
  return null;
}

/**
 * A stored enum as words ("full_time" → "Full time").
 *
 * @param value - The stored value.
 * @returns The readable phrase, or an empty string.
 */
export function humanise(value: string | null | undefined): string {
  const text = (value ?? "").replace(/[_-]+/g, " ").trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1).toLowerCase() : "";
}

/** One read-only line of the Account tab's school record. */
export interface RecordItem {
  label: string;
  value: string;
}

/** A titled block of {@link RecordItem}s. */
export interface RecordSection {
  heading: string;
  items: RecordItem[];
}

/**
 * Reads a string field of an untyped record.
 *
 * @param record - The record.
 * @param key - The field.
 * @returns The trimmed string, or an empty string.
 */
function text(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

/**
 * The named entries of an untyped list (classes or courses).
 *
 * @param value - The list.
 * @param name - How to name one entry.
 * @returns The names, blanks and duplicates removed.
 */
function names(value: unknown, name: (entry: Record<string, unknown>) => string): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const label = name(entry as Record<string, unknown>);
    if (label && !out.includes(label)) out.push(label);
  }
  return out;
}

/**
 * What the old Profile page showed that the Account fields don't: the
 * classes and subjects assigned, qualifications and experience, the
 * employment type and availability, from the teacher record
 * (`GET /teachers/:id`). Only filled values are kept, and a section with none
 * is left out.
 *
 * @param record - The teacher record (`useAppContext().teacherData`), untyped.
 * @param employmentType - `employment.employmentType` from `GET /teacher/settings`, preferred over the record's.
 * @returns The sections to show, possibly none.
 */
export function profileRecordSections(record: Record<string, unknown> | null | undefined, employmentType?: string | null): RecordSection[] {
  const source = record ?? {};
  const classes = names(source.classTeacherClasses, (entry) => text(entry, "name"));
  const courses = names(source.assignedCourses, (entry) => {
    const title = text(entry, "title");
    const code = text(entry, "courseCode");
    return title && code ? `${title} (${code})` : title || code;
  });
  const years = Number(source.yearsOfExperience);
  const days = Array.isArray(source.availabilityDays)
    ? source.availabilityDays.filter((day): day is string => typeof day === "string" && day.trim() !== "").map((day) => humanise(day))
    : [];

  const sections: RecordSection[] = [
    {
      heading: "Classes and subjects",
      items: [
        { label: "Class teacher of", value: classes.join(", ") },
        { label: "Subjects", value: courses.join(", ") },
      ],
    },
    {
      heading: "Qualifications and experience",
      items: [
        { label: "Highest qualification", value: text(source, "highestAcademicQualification") },
        { label: "Experience", value: Number.isFinite(years) && years > 0 ? `${years} year${years === 1 ? "" : "s"}` : "" },
        { label: "Subject expertise", value: text(source, "specialization") },
      ],
    },
    {
      heading: "Employment and availability",
      items: [
        { label: "Employment type", value: humanise(employmentType || text(source, "employmentType")) },
        { label: "Available days", value: days.join(", ") },
        { label: "Available hours", value: text(source, "availableTime") },
      ],
    },
  ];
  return sections
    .map((section) => ({ ...section, items: section.items.filter((item) => item.value !== "") }))
    .filter((section) => section.items.length > 0);
}
