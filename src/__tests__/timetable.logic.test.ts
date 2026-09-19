import type { TimetableEntry } from "@/app/services/timetable/timetable.service";
import {
  TIME_SLOTS,
  TIME_WINDOWS,
  buildTimetableCsvRows,
  countEntries,
  entriesInSlot,
  formatEntryTimeRange,
  getEntryStartTime,
  normalizeTime,
  parseTimeRange,
  parseTimeToMinutes,
  slotsForWindow,
  sortByStart,
  unslottedEntries,
} from "@/hooks/timetable/timetable.logic";

const lesson = (start: string, end: string, course = "Maths", over: Partial<TimetableEntry> = {}): TimetableEntry => ({
  _id: `${start}-${course}`,
  time: `${start} - ${end}`,
  startTime: start,
  startTIme: start,
  endTime: end,
  course,
  subject: "Mathematics",
  class: "JSS 1A",
  ...over,
});

describe("parseTimeToMinutes", () => {
  it("reads 24-hour and 12-hour times", () => {
    expect(parseTimeToMinutes("08:30")).toBe(510);
    expect(parseTimeToMinutes("8:30")).toBe(510);
    expect(parseTimeToMinutes("8:30 AM")).toBe(510);
    expect(parseTimeToMinutes("1 PM")).toBe(780);
    expect(parseTimeToMinutes("12:15 AM")).toBe(15);
    expect(parseTimeToMinutes("12:00 PM")).toBe(720);
  });

  it("rejects text that is not a time", () => {
    expect(parseTimeToMinutes(undefined)).toBeNull();
    expect(parseTimeToMinutes("")).toBeNull();
    expect(parseTimeToMinutes("noon")).toBeNull();
    expect(parseTimeToMinutes("08:75")).toBeNull();
    expect(parseTimeToMinutes("25:00")).toBeNull();
  });
});

describe("time formatting", () => {
  it("normalises to HH:MM and builds ranges", () => {
    expect(normalizeTime("8:05 AM")).toBe("08:05");
    expect(normalizeTime("garbage")).toBe("");
    expect(parseTimeRange("08:00 - 09:00")).toEqual({ startMinutes: 480, endMinutes: 540 });
    expect(parseTimeRange("08:00")).toBeNull();
    expect(formatEntryTimeRange(lesson("8:00 AM", "9:00 AM"))).toBe("08:00 - 09:00");
  });

  it("reads the start time from the server's misspelt key too", () => {
    expect(getEntryStartTime({ startTIme: "09:00" })).toBe("09:00");
    expect(getEntryStartTime({})).toBe("");
  });

  it("falls back to the raw time field when the times cannot be parsed", () => {
    expect(formatEntryTimeRange({ time: "Period 1", startTime: "?", endTime: "?" })).toBe("Period 1");
  });
});

describe("entriesInSlot", () => {
  it("returns every lesson that starts inside the slot, not just the first", () => {
    const day = [lesson("08:45", "09:30", "English"), lesson("08:00", "08:45", "Maths"), lesson("09:00", "10:00", "Physics")];
    expect(entriesInSlot(day, "08:00 - 09:00").map((e) => e.course)).toEqual(["Maths", "English"]);
    expect(entriesInSlot(day, "09:00 - 10:00").map((e) => e.course)).toEqual(["Physics"]);
    expect(entriesInSlot(day, "10:00 - 11:00")).toEqual([]);
  });

  it("places a lesson using the misspelt start key when startTime is absent", () => {
    const entry: TimetableEntry = { startTIme: "10:00", endTime: "11:00", course: "Art" };
    expect(entriesInSlot([entry], "10:00 - 11:00")).toHaveLength(1);
  });

  it("returns nothing for an unreadable slot", () => {
    expect(entriesInSlot([lesson("08:00", "09:00")], "all day")).toEqual([]);
  });
});

describe("unslottedEntries", () => {
  it("finds lessons the grid has no row for", () => {
    const day = [lesson("07:00", "07:45", "Early"), lesson("10:00", "11:00", "Normal"), lesson("17:00", "18:00", "Late"), lesson("??", "??", "Broken")];
    expect(unslottedEntries(day).map((e) => e.course)).toEqual(["Early", "Late", "Broken"]);
  });

  it("finds nothing when every lesson sits in a slot", () => {
    expect(unslottedEntries([lesson("08:00", "09:00"), lesson("16:30", "17:00")])).toEqual([]);
  });
});

describe("sortByStart", () => {
  it("orders by start time, unreadable times last, without touching the input", () => {
    const input = [lesson("14:00", "15:00", "C"), lesson("??", "??", "X"), lesson("08:00", "09:00", "A")];
    expect(sortByStart(input).map((e) => e.course)).toEqual(["A", "C", "X"]);
    expect(input.map((e) => e.course)).toEqual(["C", "X", "A"]);
  });
});

describe("countEntries", () => {
  it("counts lessons across days and tolerates an empty week", () => {
    expect(countEntries({ Monday: [lesson("08:00", "09:00")], Tuesday: [lesson("09:00", "10:00"), lesson("10:00", "11:00")] })).toBe(3);
    expect(countEntries({})).toBe(0);
    expect(countEntries(undefined)).toBe(0);
  });
});

describe("time windows", () => {
  it("slices the slot list", () => {
    const [full, morning, afternoon] = TIME_WINDOWS;
    expect(slotsForWindow(full)).toHaveLength(TIME_SLOTS.length);
    expect(slotsForWindow(morning)[0]).toBe("08:00 - 09:00");
    expect(slotsForWindow(morning).at(-1)).toBe("12:00 - 13:00");
    // The afternoon starts where the morning stops; the old filter repeated the 12:00 slot in both.
    expect(slotsForWindow(afternoon)[0]).toBe("13:00 - 14:00");
    expect(slotsForWindow(afternoon).at(-1)).toBe("16:00 - 17:00");
  });
});

describe("buildTimetableCsvRows", () => {
  it("lists each lesson and marks empty slots as free periods", () => {
    const { headers, rows } = buildTimetableCsvRows(
      { Monday: [lesson("08:00", "09:00", "Maths"), lesson("08:30", "09:00", "Club")] },
      ["08:00 - 09:00", "09:00 - 10:00"],
    );
    expect(headers).toEqual(["Day", "Time Slot", "Course", "Subject", "Class"]);
    expect(rows.slice(0, 3)).toEqual([
      ["Monday", "08:00 - 09:00", "Maths", "Mathematics", "JSS 1A"],
      ["Monday", "08:00 - 09:00", "Club", "Mathematics", "JSS 1A"],
      ["Monday", "09:00 - 10:00", "Free Period", "", ""],
    ]);
    // Tuesday to Friday, two slots each, all free.
    expect(rows).toHaveLength(3 + 4 * 2);
  });
});
