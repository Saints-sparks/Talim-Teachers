/**
 * Pure helpers behind the redesigned Settings (`/settings?tab=`): the tabs and
 * their aliases, the copy built from real data (quiet hours, office hours,
 * sessions, the tour length), profile validation and the office links.
 * Nothing here touches React or the network, so all of it is unit-tested in
 * `src/__tests__/settings.logic.test.ts`.
 */
import { ApiError, getErrorMessage } from "@/lib/apiError";
import { SIGN_IN_ROUTE } from "@/lib/routes";
import { PROFILE_NAME_MAX, PROFILE_PHONE_PATTERN } from "@/types/inboxSettings";
import type { AuthSession, SchoolContact } from "@/types/inboxSettings";

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
 * The classes the teacher is class teacher of, by name. Since A6 only
 * `Class.classTeacherId` makes a teacher a class's class teacher: the record's
 * `classTeacherOf` lists exactly those. An older API without it falls back to
 * `classTeacherClasses`, which also mixes in classes merely assigned on the
 * profile.
 *
 * @param record - The teacher record (`GET /teachers/:id`, `TeacherProfileResponseDto`), read
 *   as a loose record on purpose so an older API's shape still reads.
 * @returns The class names, blanks and duplicates removed.
 */
export function classTeacherOfNames(record: Record<string, unknown> | null | undefined): string[] {
  const source = record ?? {};
  const led = Array.isArray(source.classTeacherOf) ? source.classTeacherOf : source.classTeacherClasses;
  return names(led, (entry) => text(entry, "name"));
}

/**
 * Whether the teacher is a class teacher, for the Account "Role" line: any
 * class whose `Class.classTeacherId` is theirs (`classTeacherOf`, A6). The
 * profile's `isFormTeacher` flag no longer grants the role and goes stale, so
 * it is read only when the API sends no `classTeacherOf`.
 *
 * @param record - The teacher record (`GET /teachers/:id`) as a loose record (older APIs lack `classTeacherOf`), or null while loading.
 * @param isFormTeacher - `employment.isFormTeacher` from `GET /teacher/settings`.
 * @returns True when the teacher leads at least one class.
 */
export function isClassTeacher(record: Record<string, unknown> | null | undefined, isFormTeacher?: boolean | null): boolean {
  if (record && Array.isArray(record.classTeacherOf)) return record.classTeacherOf.length > 0;
  return Boolean(isFormTeacher);
}

/**
 * What the old Profile page showed that the Account fields don't: the
 * classes they are class teacher of ({@link classTeacherOfNames}) and the
 * subjects assigned, qualifications and experience, the employment type and
 * availability, from the teacher record
 * (`GET /teachers/:id`). Only filled values are kept, and a section with none
 * is left out.
 *
 * @param record - The teacher record (`useAppContext().teacherData`), read as a loose record so older shapes still read.
 * @param employmentType - `employment.employmentType` from `GET /teacher/settings`, preferred over the record's.
 * @returns The sections to show, possibly none.
 */
export function profileRecordSections(record: Record<string, unknown> | null | undefined, employmentType?: string | null): RecordSection[] {
  const source = record ?? {};
  const classes = classTeacherOfNames(source);
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

// ─── Delete account (v1.5 addendum) ─────────────────────────────────────────

/** The sign-in toast after a sign-in that cancelled a scheduled deletion (`deletionCancelled: true`). */
export const DELETION_CANCELLED_MESSAGE = "Welcome back. Your account deletion has been cancelled.";

/** The sign-in query parameter that carries the scheduled deletion date (ISO). */
export const DELETION_NOTICE_PARAM = "deletionScheduledFor";

/** The most a deletion reason may hold (the backend's limit). */
export const DELETION_REASON_MAX = 500;

/** Copy for each refusal of `POST /auth/account/deletion`, used when the server sends no message. */
export const DELETION_ERROR_COPY: Readonly<Record<string, string>> = {
  INVALID_PASSWORD: "That password is not right. Please try again.",
  ADMIN_ACCOUNT: "Talim platform admin accounts can't be deleted from here.",
  LAST_SCHOOL_ADMIN: "You are your school's only admin. Make another admin first, or contact Talim support.",
  DELETION_SCHEDULED: "Your account is already scheduled for deletion.",
};

/**
 * The notice sign-in shows after a deletion request.
 *
 * @param scheduledFor - `scheduledFor` from the 200 response (ISO).
 * @returns "Your account will be deleted on 8 Nov 2026. Sign in before then to cancel."
 */
export function deletionScheduledMessage(scheduledFor: string | null | undefined): string {
  const date = formatJoinedDate(scheduledFor);
  const when = date === "—" ? "in 30 days" : `on ${date}`;
  return `Your account will be deleted ${when}. Sign in before then to cancel.`;
}

/**
 * The sign-in URL to land on after a deletion request, carrying the date.
 *
 * @param scheduledFor - `scheduledFor` from the 200 response (ISO).
 * @returns e.g. `/?deletionScheduledFor=2026-11-08T10%3A00%3A00.000Z`.
 */
export function deletionScheduledRoute(scheduledFor: string): string {
  return `${SIGN_IN_ROUTE}?${new URLSearchParams({ [DELETION_NOTICE_PARAM]: scheduledFor }).toString()}`;
}

/**
 * The deletion notice a sign-in URL asks for.
 *
 * @param search - `window.location.search`.
 * @returns The notice, or null when the URL carries no readable date.
 */
export function deletionNoticeFromSearch(search: string): string | null {
  const value = new URLSearchParams(search).get(DELETION_NOTICE_PARAM);
  if (!value || Number.isNaN(new Date(value).getTime())) return null;
  return deletionScheduledMessage(value);
}

/**
 * Where a failed deletion request's message belongs: on the password field
 * for a wrong password, otherwise in the banner over the form. Keyed on the
 * route's own `code` (`ApiError.reasonCode`), never on message text.
 *
 * @param error - Whatever `POST /auth/account/deletion` threw.
 * @returns The field message or the banner message (the other is null).
 */
export function deletionErrorMessage(error: unknown): { field: string | null; banner: string | null } {
  const reason = error instanceof ApiError ? error.reasonCode : undefined;
  if (reason === "INVALID_PASSWORD") return { field: DELETION_ERROR_COPY.INVALID_PASSWORD, banner: null };
  if (reason && DELETION_ERROR_COPY[reason]) return { field: null, banner: (error as ApiError).message || DELETION_ERROR_COPY[reason] };
  return { field: null, banner: getErrorMessage(error, "We couldn't delete your account. Please try again.") };
}
