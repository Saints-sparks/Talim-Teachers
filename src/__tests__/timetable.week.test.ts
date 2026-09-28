import {
  buildDayRows,
  buildWeekGrid,
  effectivePeriods,
  groupDoublePeriods,
  groupPeriodLabel,
  legendOf,
  subjectCount,
  toneIndex,
  weekCsvRows,
} from "@/hooks/timetable/timetableWeek.logic";
import { lessonMeta } from "@/components/lesson/DayList";
import { FIXTURE_PERIODS, makeDisruptedWeekFixture, makeTimetableWeekFixture } from "@/lib/fixtures/today.fixture";
import type { Lesson } from "@/types/today";

const week = makeTimetableWeekFixture();
const on = (day: string) => week.lessons.filter((l) => l.day === day);

describe("double periods", () => {
  it("merges the same course and class in consecutive periods", () => {
    const groups = groupDoublePeriods(on("Thursday"), FIXTURE_PERIODS);
    const double = groups.find((g) => g.merged)!;
    expect(double.lessons.map((l) => l.periodKey)).toEqual(["p4", "p5"]);
    expect(double.startTime).toBe("10:20");
    expect(double.endTime).toBe("11:40");
    expect(groupPeriodLabel(double)).toBe("Periods 4–5");
    expect(groups).toHaveLength(3);
  });

  it("keeps lessons apart across a break, for a different class, or when one is cancelled", () => {
    const p3 = on("Wednesday").find((l) => l.periodKey === "p3")!; // k1, 09:20-10:00
    const p4: Lesson = { ...p3, id: "x-p4", periodKey: "p4", startTime: "10:20", endTime: "11:00" }; // after the break
    expect(groupDoublePeriods([p3, p4], FIXTURE_PERIODS).every((g) => !g.merged)).toBe(true);

    const [a, b] = on("Thursday").filter((l) => l.course.id === "k1");
    expect(groupDoublePeriods([a, { ...b, class: { id: "c2", name: "JSS2 B" } }], FIXTURE_PERIODS).some((g) => g.merged)).toBe(false);
    expect(groupDoublePeriods([a, { ...b, cancelled: { reason: "Staff training" } }], FIXTURE_PERIODS).some((g) => g.merged)).toBe(false);
    // One card shows one room: a lab lesson followed by a classroom lesson is two lessons.
    expect(groupDoublePeriods([{ ...a, room: "Lab 2" }, { ...b, room: "Room 12" }], FIXTURE_PERIODS).some((g) => g.merged)).toBe(false);
  });

  it("never merges into a period that holds a clash", () => {
    const [a, b] = on("Thursday").filter((l) => l.course.id === "k1");
    const clash: Lesson = { ...b, id: "clash", course: { id: "k2", code: "MTH211", title: "Mathematics" } };
    const groups = groupDoublePeriods([a, b, clash], FIXTURE_PERIODS);
    expect(groups.some((g) => g.merged)).toBe(false);
    expect(groups).toHaveLength(3);
  });

  it("merges by time when there are no periods", () => {
    const [a, b] = on("Thursday").filter((l) => l.course.id === "k1");
    expect(groupDoublePeriods([{ ...a, periodKey: null }, { ...b, periodKey: null }], []).map((g) => g.merged)).toEqual([true]);
  });
});

describe("week grid", () => {
  it("places each lesson in its day and period row, spanning a double", () => {
    const grid = buildWeekGrid(week);
    const thursday = week.days.findIndex((d) => d.day === "Thursday");
    const p4 = FIXTURE_PERIODS.findIndex((p) => p.key === "p4");
    const block = grid.cells.get(`${thursday}:${p4}`)![0];
    expect(block.span).toBe(2);
    expect(grid.covered.has(`${thursday}:${p4 + 1}`)).toBe(true);
    const placed = [...grid.cells.values()].flat().reduce((n, b) => n + b.group.lessons.length, 0);
    expect(placed).toBe(week.lessons.length);
    expect(grid.unplaced).toEqual([]);
  });

  it("lists lessons that fit no period separately", () => {
    const odd: Lesson = { ...week.lessons[0], id: "odd", periodKey: null, startTime: "15:00", endTime: "15:40" };
    expect(buildWeekGrid({ ...week, lessons: [...week.lessons, odd] }).unplaced.map((l) => l.id)).toEqual(["odd"]);
  });

  it("keeps cancelled lessons on the grid with their reason", () => {
    const disrupted = makeDisruptedWeekFixture();
    const wednesday = disrupted.lessons.filter((l) => l.day === "Wednesday");
    expect(wednesday.every((l) => l.cancelled?.reason === "Founders' Day")).toBe(true);
    const friday = disrupted.lessons.filter((l) => l.day === "Friday");
    expect(friday.filter((l) => l.cancelled).map((l) => l.periodKey)).toEqual(["p5", "p7"]);
    expect(lessonMeta(wednesday[0], false)).toBe("Cancelled: Founders' Day · Block C, Room 2");
    const grid = buildWeekGrid(disrupted);
    const placed = [...grid.cells.values()].flat().filter((b) => b.group.lesson.cancelled);
    expect(placed.length).toBe(5);
  });

  it("derives periods from the lessons when the response has none", () => {
    const derived = effectivePeriods([], on("Friday"));
    expect(derived.map((p) => p.label)).toEqual(["Period 1", "Period 2", "Period 3", "Period 4"]);
    expect(derived[0]).toMatchObject({ key: "t0800-0840", startTime: "08:00", isBreak: false });
  });
});

describe("day rows", () => {
  it("shows the breaks between the first and last lesson only", () => {
    const rows = buildDayRows(on("Monday"), FIXTURE_PERIODS); // p1, p4, p7
    expect(rows.map((r) => (r.type === "break" ? r.period.key : r.group.lesson.periodKey))).toEqual(["p1", "brk", "p4", "lun", "p7"]);
    const morning = buildDayRows(on("Wednesday").filter((l) => l.periodKey !== "p6"), FIXTURE_PERIODS); // p1, p3
    expect(morning.some((r) => r.type === "break")).toBe(false);
  });
});

describe("legend, tones and export", () => {
  it("has one chip per subject and class", () => {
    expect(legendOf(week.lessons).map((l) => l.label)).toEqual([
      "Further Mathematics · JSS2 B",
      "Mathematics · JSS1 A",
      "Mathematics · JSS2 B",
    ]);
    expect(subjectCount(week.lessons)).toBe(3);
  });

  it("gives a course the same tone everywhere, and the fixture's three courses different tones", () => {
    expect(toneIndex("k1")).toBe(toneIndex("k1"));
    expect(new Set(["k1", "k2", "k3"].map(toneIndex)).size).toBe(3);
  });

  it("exports one CSV row per lesson in day and time order, with the room and status", () => {
    const { headers, rows } = weekCsvRows(makeDisruptedWeekFixture());
    expect(headers).toEqual(["Day", "Date", "Period", "Start", "End", "Course", "Code", "Class", "Room", "Topic", "Status"]);
    expect(rows).toHaveLength(week.lessons.length);
    expect(rows[0]).toEqual([
      "Monday", "2026-09-21", "Period 1", "08:00", "08:40", "Mathematics", "MTH111", "JSS1 A", "Block B, Room 4",
      "Fractions: types and equivalence", "",
    ]);
    expect(rows.find((r) => r[0] === "Wednesday")?.[10]).toBe("Cancelled: Founders' Day");
  });
});
