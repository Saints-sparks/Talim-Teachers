/**
 * Pure timetable logic: parsing the server's times, placing lessons into the
 * grid's slots, ordering, counting and the CSV rows. No React, no network.
 */
import type { TimetableByDay, TimetableEntry } from "@/app/services/timetable/timetable.service";

/** The weekdays the backend schedules (`TimetableSchema.day` enum). */
export const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] as const;

/** The grid's rows, in the same 24-hour format the school admin timetable uses. */
export const TIME_SLOTS = [
  "08:00 - 09:00",
  "09:00 - 10:00",
  "10:00 - 11:00",
  "11:00 - 12:00",
  "12:00 - 13:00",
  "13:00 - 14:00",
  "14:00 - 15:00",
  "15:00 - 16:00",
  "16:00 - 17:00",
] as const;

/** A selectable window of the day: which slots to show. */
export interface TimeWindow {
  key: string;
  label: string;
  /** Index of the first slot in {@link TIME_SLOTS}. */
  start: number;
  /** Index of the last slot in {@link TIME_SLOTS}, inclusive. */
  end: number;
}

/** The windows offered by the time filter. */
export const TIME_WINDOWS: readonly TimeWindow[] = [
  { key: "full", label: "Full Day (8:00 - 17:00)", start: 0, end: TIME_SLOTS.length - 1 },
  { key: "morning", label: "Morning (8:00 - 13:00)", start: 0, end: 4 },
  { key: "afternoon", label: "Afternoon (13:00 - 17:00)", start: 5, end: TIME_SLOTS.length - 1 },
];

/**
 * A lesson's start time, tolerating the server's `startTIme` misspelling.
 *
 * @param entry - The lesson.
 * @returns The start time text, or an empty string.
 */
export function getEntryStartTime(entry: TimetableEntry): string {
  return entry.startTime || entry.startTIme || "";
}

/**
 * Minutes since midnight for `"08:30"`, `"8:30 AM"`, `"1 PM"` and the like.
 *
 * @param time - The time text.
 * @returns Minutes, or `null` when it is missing or not a time.
 */
export function parseTimeToMinutes(time?: string): number | null {
  if (!time) return null;
  const match = time.trim().match(/^(\d{1,2})(?::(\d{1,2}))?\s*(AM|PM)?$/i);
  if (!match) return null;

  let hour = Number(match[1]);
  const minute = Number(match[2] ?? "0");
  const modifier = match[3]?.toUpperCase();

  if (Number.isNaN(hour) || Number.isNaN(minute) || minute > 59) return null;
  if (modifier === "PM" && hour < 12) hour += 12;
  if (modifier === "AM" && hour === 12) hour = 0;
  if (hour > 24 || (hour === 24 && minute !== 0)) return null;

  return hour * 60 + minute;
}

/**
 * Formats minutes since midnight as zero-padded `HH:MM`.
 *
 * @param minutes - Minutes since midnight.
 * @returns The 24-hour time text.
 */
export function formatMinutesAsTime(minutes: number): string {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/**
 * Rewrites any accepted time text as 24-hour `HH:MM`.
 *
 * @param time - The time text.
 * @returns The normalised time, or an empty string when it cannot be read.
 */
export function normalizeTime(time?: string): string {
  const minutes = parseTimeToMinutes(time);
  return minutes === null ? "" : formatMinutesAsTime(minutes);
}

/**
 * Parses `"08:00 - 09:00"` into minutes.
 *
 * @param range - The range text.
 * @returns Start and end minutes, or `null` when it is not a range.
 */
export function parseTimeRange(range?: string): { startMinutes: number; endMinutes: number } | null {
  if (!range) return null;
  const [start, end] = range.split(" - ");
  if (!start || !end) return null;
  const startMinutes = parseTimeToMinutes(start);
  const endMinutes = parseTimeToMinutes(end);
  if (startMinutes === null || endMinutes === null) return null;
  return { startMinutes, endMinutes };
}

/**
 * A lesson's time as `"HH:MM - HH:MM"`, falling back to the raw fields.
 *
 * @param entry - The lesson.
 * @returns The range to display.
 */
export function formatEntryTimeRange(entry: TimetableEntry): string {
  const start = normalizeTime(getEntryStartTime(entry));
  const end = normalizeTime(entry.endTime);
  if (start && end) return `${start} - ${end}`;
  return entry.time || `${getEntryStartTime(entry)} - ${entry.endTime ?? ""}`;
}

/**
 * Every lesson that starts inside a slot. A slot can hold more than one (a
 * 45-minute lesson followed by another starting at :45), and all of them are
 * returned — the grid used to show only the first and hide the rest.
 *
 * @param entries - One day's lessons.
 * @param slot - A slot such as `"08:00 - 09:00"`.
 * @returns The lessons starting in the slot, earliest first.
 */
export function entriesInSlot(entries: readonly TimetableEntry[], slot: string): TimetableEntry[] {
  const range = parseTimeRange(slot);
  if (!range) return [];
  return sortByStart(
    entries.filter((entry) => {
      const start = parseTimeToMinutes(getEntryStartTime(entry));
      return start !== null && start >= range.startMinutes && start < range.endMinutes;
    }),
  );
}

/**
 * Lessons the grid cannot place: those starting before the first slot, at or
 * after the end of the last, or with a start time that cannot be read.
 *
 * @param entries - One day's lessons.
 * @returns The unplaced lessons, earliest first.
 */
export function unslottedEntries(entries: readonly TimetableEntry[]): TimetableEntry[] {
  const first = parseTimeRange(TIME_SLOTS[0]);
  const last = parseTimeRange(TIME_SLOTS[TIME_SLOTS.length - 1]);
  if (!first || !last) return [];
  return sortByStart(
    entries.filter((entry) => {
      const start = parseTimeToMinutes(getEntryStartTime(entry));
      return start === null || start < first.startMinutes || start >= last.endMinutes;
    }),
  );
}

/**
 * Orders lessons by start time; lessons without a readable time go last.
 *
 * @param entries - Lessons to order.
 * @returns A new array; the input is not reordered.
 */
export function sortByStart(entries: readonly TimetableEntry[]): TimetableEntry[] {
  const key = (entry: TimetableEntry) => parseTimeToMinutes(getEntryStartTime(entry)) ?? Number.MAX_SAFE_INTEGER;
  return [...entries].sort((a, b) => key(a) - key(b));
}

/**
 * How many lessons the week holds.
 *
 * @param data - The week grouped by day.
 * @returns The total number of lessons.
 */
export function countEntries(data: TimetableByDay | undefined): number {
  if (!data) return 0;
  return Object.values(data).reduce((total, entries) => total + (Array.isArray(entries) ? entries.length : 0), 0);
}

/**
 * The slots a window shows.
 *
 * @param window - The selected window.
 * @returns Its slots, in order.
 */
export function slotsForWindow(window: TimeWindow): string[] {
  return TIME_SLOTS.slice(window.start, window.end + 1);
}

/**
 * The CSV body of the export: one row per lesson in each slot, and a "Free
 * Period" row for slots with none.
 *
 * @param data - The week grouped by day.
 * @param slots - The slots to include.
 * @returns Header and rows for `toCsv`.
 */
export function buildTimetableCsvRows(
  data: TimetableByDay,
  slots: readonly string[],
): { headers: string[]; rows: string[][] } {
  const rows: string[][] = [];
  for (const day of DAYS) {
    for (const slot of slots) {
      const entries = entriesInSlot(data[day] ?? [], slot);
      if (entries.length === 0) {
        rows.push([day, slot, "Free Period", "", ""]);
        continue;
      }
      for (const entry of entries) rows.push([day, slot, entry.course ?? "", entry.subject ?? "", entry.class ?? ""]);
    }
  }
  return { headers: ["Day", "Time Slot", "Course", "Subject", "Class"], rows };
}
