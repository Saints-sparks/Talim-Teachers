import {
  clockOffset,
  clockTime,
  computeLiveToday,
  displayRange,
  displayTime,
  greetingFor,
  lessonProgress,
  lessonState,
  longDate,
  minutesLeft,
  schoolClock,
  shortDate,
  weekLabel,
  weekSpan,
} from "@/hooks/today/today.logic";
import { FIXTURE_NOW, makeHolidayTodayFixture, makeTodayFixture } from "@/lib/fixtures/today.fixture";

/** An instant at a Lagos wall-clock time on the fixture day (Lagos is UTC+1, no DST). */
const lagos = (hhmm: string, date = "2026-09-25") => Date.parse(`${date}T${hhmm}:00+01:00`);
const lesson = { date: "2026-09-25", startTime: "10:20", endTime: "11:00" };

describe("schoolClock", () => {
  it("reads the school's wall clock from the timezone, not the device's", () => {
    expect(schoolClock(Date.parse(FIXTURE_NOW), "Africa/Lagos")).toEqual({ date: "2026-09-25", minutes: 10 * 60 + 25 });
    expect(schoolClock(Date.parse(FIXTURE_NOW), "UTC").minutes).toBe(9 * 60 + 25);
    // Just after midnight UTC is still the previous evening in New York.
    expect(schoolClock(Date.parse("2026-09-26T00:30:00Z"), "America/New_York").date).toBe("2026-09-25");
  });

  it("falls back to UTC for an unknown timezone", () => {
    expect(schoolClock(Date.parse(FIXTURE_NOW), "Not/AZone").minutes).toBe(9 * 60 + 25);
  });

  it("measures the server clock's offset once and ignores unreadable values", () => {
    expect(clockOffset("2026-09-25T09:25:00.000Z", Date.parse("2026-09-25T09:20:00.000Z"))).toBe(5 * 60_000);
    expect(clockOffset(undefined, 1000)).toBe(0);
    expect(clockOffset("nope", 1000)).toBe(0);
  });
});

describe("lesson state and minutes left", () => {
  const at = (hhmm: string) => schoolClock(lagos(hhmm), "Africa/Lagos");

  it("is later before the start, now during, done from the end", () => {
    expect(lessonState(lesson, at("10:19"))).toBe("later");
    expect(lessonState(lesson, at("10:20"))).toBe("now");
    expect(lessonState(lesson, at("10:59"))).toBe("now");
    expect(lessonState(lesson, at("11:00"))).toBe("done");
  });

  it("compares dates before times", () => {
    expect(lessonState({ ...lesson, date: "2026-09-24" }, at("08:00"))).toBe("done");
    expect(lessonState({ ...lesson, date: "2026-09-28" }, at("23:00"))).toBe("later");
  });

  it("counts minutes left up, so the last minute still says 1", () => {
    expect(minutesLeft(lesson, at("10:25"))).toBe(35);
    expect(minutesLeft(lesson, schoolClock(lagos("10:59") + 30_000, "Africa/Lagos"))).toBe(1);
    expect(minutesLeft(lesson, at("11:00"))).toBeNull();
  });

  it("reports progress through the lesson", () => {
    expect(lessonProgress(lesson, at("10:20"))).toBe(0);
    expect(lessonProgress(lesson, at("10:40"))).toBeCloseTo(0.5);
    expect(lessonProgress(lesson, at("11:30"))).toBe(1);
  });
});

describe("greeting", () => {
  it.each([
    [0, "morning"],
    [11 * 60 + 59, "morning"],
    [12 * 60, "afternoon"],
    [16 * 60 + 59, "afternoon"],
    [17 * 60, "evening"],
  ])("at minute %i says good %s", (minutes, word) => {
    expect(greetingFor(minutes)).toBe(word);
  });
});

describe("computeLiveToday", () => {
  const today = makeTodayFixture();

  it("at 10:25 has period 4 on now, period 5 next, one taught", () => {
    const live = computeLiveToday(today, lagos("10:25"));
    expect(live.greeting).toBe("morning");
    expect(live.now?.periodKey).toBe("p4");
    expect(live.now?.minutesLeft).toBe(35);
    expect(live.next?.periodKey).toBe("p5");
    expect(live.phase.kind).toBe("now");
    expect(live.taughtCount).toBe(1);
    expect(live.activeCount).toBe(4);
  });

  it("moves on as the clock ticks, without new data", () => {
    const live = computeLiveToday(today, lagos("11:05"));
    expect(live.now?.periodKey).toBe("p5");
    expect(live.now?.minutesLeft).toBe(35);
    expect(live.taughtCount).toBe(2);
  });

  it("is 'before' ahead of the first lesson, 'between' in a free period, 'after' at the end", () => {
    expect(computeLiveToday(today, lagos("07:30")).phase.kind).toBe("before");
    const between = computeLiveToday(today, lagos("12:00")).phase;
    expect(between.kind).toBe("between");
    expect(between.kind === "between" && between.next.periodKey).toBe("p7");
    const after = computeLiveToday(today, lagos("15:00"));
    expect(after.phase).toEqual({ kind: "after", taught: 4 });
    expect(after.greeting).toBe("afternoon");
  });

  it("never puts a cancelled lesson on now", () => {
    const live = computeLiveToday(makeHolidayTodayFixture(), lagos("10:25"));
    expect(live.now).toBeNull();
    expect(live.phase.kind).toBe("none");
    expect(live.cancelledCount).toBe(4);
    expect(live.activeCount).toBe(0);
  });

  it("flags the data stale once the school's date has moved on", () => {
    expect(computeLiveToday(today, lagos("23:59")).stale).toBe(false);
    expect(computeLiveToday(today, lagos("00:01", "2026-09-26")).stale).toBe(true);
  });
});

describe("labels", () => {
  it("formats times the way the design does", () => {
    expect(displayTime("08:00")).toBe("8:00");
    expect(displayTime("13:40")).toBe("13:40");
    expect(displayTime("8:00 AM")).toBe("8:00");
    expect(displayRange("10:20", "11:00")).toBe("10:20 – 11:00");
  });

  it("formats dates without shifting them by the device timezone", () => {
    expect(longDate("2026-09-25")).toBe("Friday, 25 September 2026");
    expect(shortDate("2026-09-25")).toBe("Fri, 25 Sep 2026");
  });

  it("writes the week heading, across months and years, and outside term", () => {
    expect(weekLabel({ number: 3, start: "2026-09-21", end: "2026-09-25", inTerm: true })).toBe("Week 3 · 21 – 25 September");
    expect(weekSpan("2026-09-28", "2026-10-02")).toBe("28 September – 2 October");
    expect(weekSpan("2026-12-28", "2027-01-01")).toBe("28 December 2026 – 1 January 2027");
    expect(weekLabel({ number: null, start: "2026-12-14", end: "2026-12-18", inTerm: false })).toBe("Outside term · 14 – 18 December");
  });

  it("shows a submitted time on the school's clock", () => {
    expect(clockTime("2026-09-25T07:44:00.000Z", "Africa/Lagos")).toBe("8:44am");
    expect(clockTime("2026-09-25T11:05:00.000Z", "Africa/Lagos")).toBe("12:05pm");
    expect(clockTime(null, "Africa/Lagos")).toBe("");
  });
});
