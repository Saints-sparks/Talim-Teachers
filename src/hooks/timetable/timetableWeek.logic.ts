/**
 * Pure logic for the redesigned timetable (`GET /timetable/me`): grouping
 * double periods, placing lessons on the period grid, the day list shared with
 * Today, subject tones, the legend and the CSV export. No React.
 */
import { displayRange, lessonTitle, periodOf, toMinutes } from "@/hooks/today/today.logic";
import type { Lesson, Period, TimetableWeek } from "@/types/today";

/** One or more consecutive periods of the same course and class on one day. */
export interface LessonGroup<L extends Lesson = Lesson> {
  key: string;
  lessons: L[];
  /** The first lesson (course, class, room and topic are the same across the group). */
  lesson: L;
  startTime: string;
  endTime: string;
  /** Periods covered, in order; empty when the lessons match no period. */
  periods: Period[];
  /** True for a double (or longer) period. */
  merged: boolean;
}

/**
 * Whether two lessons are the same class being taught the same course, in the
 * same room, with the same cancellation, so they read as one double period.
 * (A card shows one room, so lessons in different rooms stay apart.)
 *
 * @param a - The earlier lesson.
 * @param b - The later lesson.
 * @returns True when they may merge.
 */
function sameTeaching(a: Lesson, b: Lesson): boolean {
  return (
    a.date === b.date &&
    a.course.id === b.course.id &&
    a.class.id === b.class.id &&
    (a.room ?? null) === (b.room ?? null) &&
    (a.cancelled?.reason ?? null) === (b.cancelled?.reason ?? null)
  );
}

/**
 * Groups one day's lessons, merging a course+class taught in consecutive
 * periods into one double period. "Consecutive" means the next period in the
 * school's list (a break between them keeps them apart); without periods, a
 * lesson starting exactly when the previous ended.
 *
 * @param dayLessons - One day's lessons, any order.
 * @param periods - The school's periods, in order.
 * @returns The groups, by start time.
 */
export function groupDoublePeriods<L extends Lesson>(dayLessons: readonly L[], periods: readonly Period[]): LessonGroup<L>[] {
  const sorted = [...dayLessons].sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));
  const indexOf = (lesson: L) => {
    const period = periodOf(lesson, periods);
    return period ? periods.indexOf(period) : -1;
  };
  // A period holding two lessons (a clash) never joins a double.
  const perStart = new Map<number, number>();
  for (const lesson of sorted) perStart.set(toMinutes(lesson.startTime), (perStart.get(toMinutes(lesson.startTime)) ?? 0) + 1);
  const alone = (lesson: L) => perStart.get(toMinutes(lesson.startTime)) === 1;
  const groups: LessonGroup<L>[] = [];
  for (const lesson of sorted) {
    const last = groups[groups.length - 1];
    const prev = last?.lessons[last.lessons.length - 1];
    const idx = indexOf(lesson);
    const adjacent =
      prev !== undefined &&
      (idx >= 0 && indexOf(prev) >= 0 ? idx === indexOf(prev) + 1 : toMinutes(prev.endTime) === toMinutes(lesson.startTime));
    if (last && prev && adjacent && alone(prev) && alone(lesson) && sameTeaching(prev, lesson)) {
      last.lessons.push(lesson);
      last.endTime = lesson.endTime;
      if (idx >= 0) last.periods.push(periods[idx]);
      last.merged = true;
      continue;
    }
    groups.push({
      key: `${lesson.date}:${lesson.id}`,
      lessons: [lesson],
      lesson,
      startTime: lesson.startTime,
      endTime: lesson.endTime,
      periods: idx >= 0 ? [periods[idx]] : [],
      merged: false,
    });
  }
  return groups;
}

/**
 * The period label for a group: "Period 4", "Periods 4–5", or the times.
 *
 * @param group - The group.
 * @returns The label.
 */
export function groupPeriodLabel(group: Pick<LessonGroup, "periods" | "startTime" | "endTime">): string {
  const { periods } = group;
  if (periods.length === 0) return displayRange(group.startTime, group.endTime);
  if (periods.length === 1) return periods[0].label;
  const first = periods[0].label;
  const last = periods[periods.length - 1].label;
  const num = (label: string) => label.match(/(\d+)\s*$/)?.[1];
  const a = num(first);
  const b = num(last);
  if (a && b && first.replace(/\d+\s*$/, "") === last.replace(/\d+\s*$/, "")) {
    return `${first.replace(/\s*\d+\s*$/, "")}s ${a}–${b}`;
  }
  return `${first} – ${last}`;
}

/** A row of the day list: a lesson group or a break. */
export type DayRow<L extends Lesson = Lesson> =
  | { type: "lesson"; key: string; group: LessonGroup<L> }
  | { type: "break"; key: string; period: Period };

/**
 * One day as a list: lesson groups with the breaks that fall between the
 * first lesson and the last.
 *
 * @param dayLessons - The day's lessons.
 * @param periods - The school's periods.
 * @returns Rows by start time.
 */
export function buildDayRows<L extends Lesson>(dayLessons: readonly L[], periods: readonly Period[]): DayRow<L>[] {
  const groups = groupDoublePeriods(dayLessons, periods);
  if (groups.length === 0) return [];
  const first = toMinutes(groups[0].startTime);
  const last = Math.max(...groups.map((g) => toMinutes(g.endTime)));
  const rows: DayRow<L>[] = groups.map((group) => ({ type: "lesson", key: group.key, group }));
  for (const period of periods) {
    if (!period.isBreak) continue;
    if (toMinutes(period.startTime) >= first && toMinutes(period.endTime) <= last) {
      rows.push({ type: "break", key: `break:${period.key}`, period });
    }
  }
  const start = (row: DayRow<L>) => toMinutes(row.type === "lesson" ? row.group.startTime : row.period.startTime);
  return rows.sort((a, b) => start(a) - start(b) || (a.type === "break" ? -1 : 1));
}

/**
 * The periods to draw. The contract always sends them when a timetable
 * exists; if a response ever has lessons but no periods, they are derived from
 * the lessons' times ("Period 1..n", no breaks), as the backend would.
 *
 * @param periods - The response's periods.
 * @param lessons - The response's lessons.
 * @returns Periods in order.
 */
export function effectivePeriods(periods: readonly Period[], lessons: readonly Lesson[]): Period[] {
  if (periods.length > 0) return [...periods];
  const pairs = new Map<string, { startTime: string; endTime: string }>();
  for (const lesson of lessons) pairs.set(`${lesson.startTime}-${lesson.endTime}`, { startTime: lesson.startTime, endTime: lesson.endTime });
  return [...pairs.values()]
    .sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime))
    .map((p, i) => ({ key: `t${p.startTime.replace(":", "")}-${p.endTime.replace(":", "")}`, label: `Period ${i + 1}`, startTime: p.startTime, endTime: p.endTime, isBreak: false }));
}

/** A lesson group placed on the week grid. */
export interface GridBlock {
  group: LessonGroup;
  /** Index into the week's days. */
  dayIndex: number;
  /** Index into the periods (the grid's row). */
  row: number;
  /** Rows covered (2 for a double period). */
  span: number;
}

/** The week laid out on the period grid. */
export interface WeekGrid {
  periods: Period[];
  /** Blocks by `dayIndex:row` of their first row; a clash puts two groups in one cell. */
  cells: Map<string, GridBlock[]>;
  /** `dayIndex:row` of rows covered by a block that starts higher up. */
  covered: Set<string>;
  /** Lessons whose time matches no period; listed under the grid. */
  unplaced: Lesson[];
}

/**
 * Places a week's lessons on the grid of days × periods.
 *
 * @param week - The timetable week.
 * @returns The grid.
 */
export function buildWeekGrid(week: Pick<TimetableWeek, "days" | "periods" | "lessons">): WeekGrid {
  const periods = effectivePeriods(week.periods, week.lessons);
  const cells = new Map<string, GridBlock[]>();
  const covered = new Set<string>();
  const unplaced: Lesson[] = [];
  week.days.forEach((day, dayIndex) => {
    const groups = groupDoublePeriods(week.lessons.filter((l) => l.date === day.date), periods);
    for (const group of groups) {
      if (group.periods.length === 0) {
        unplaced.push(...group.lessons);
        continue;
      }
      const row = periods.indexOf(group.periods[0]);
      const span = group.periods.length;
      const key = `${dayIndex}:${row}`;
      cells.set(key, [...(cells.get(key) ?? []), { group, dayIndex, row, span }]);
      for (let i = 1; i < span; i++) covered.add(`${dayIndex}:${row + i}`);
    }
  });
  return { periods, cells, covered, unplaced };
}

/** Number of subject tones defined in globals.css (`.tl-tone-0` …). */
export const TONE_COUNT = 6;

/**
 * A stable colour for a course, so the same subject has the same tone on
 * Today and the Timetable without either knowing the other's list.
 *
 * @param courseId - The course id.
 * @returns A tone index, 0 to `TONE_COUNT - 1`.
 */
export function toneIndex(courseId: string): number {
  let hash = 7;
  for (let i = 0; i < courseId.length; i++) hash = (hash * 31 + courseId.charCodeAt(i)) >>> 0;
  return hash % TONE_COUNT;
}

/** One chip of the legend. */
export interface LegendItem {
  key: string;
  label: string;
  tone: number;
}

/**
 * The subject · class chips under the timetable, one per course and class.
 *
 * @param lessons - The week's lessons.
 * @returns Chips ordered by label.
 */
export function legendOf(lessons: readonly Lesson[]): LegendItem[] {
  const seen = new Map<string, LegendItem>();
  for (const lesson of lessons) {
    const key = `${lesson.course.id}:${lesson.class.id}`;
    if (!seen.has(key)) seen.set(key, { key, label: lessonTitle(lesson), tone: toneIndex(lesson.course.id) });
  }
  return [...seen.values()].sort((a, b) => a.label.localeCompare(b.label));
}

/**
 * The CSV of a week: one row per lesson, in day and time order.
 *
 * @param week - The timetable week.
 * @returns Header and rows for `toCsv`.
 */
export function weekCsvRows(week: Pick<TimetableWeek, "periods" | "lessons">): { headers: string[]; rows: string[][] } {
  const periods = effectivePeriods(week.periods, week.lessons);
  const rows = [...week.lessons]
    .sort((a, b) => a.date.localeCompare(b.date) || toMinutes(a.startTime) - toMinutes(b.startTime))
    .map((l) => [
      l.day,
      l.date,
      periodOf(l, periods)?.label ?? "",
      l.startTime,
      l.endTime,
      l.course.title,
      l.course.code,
      l.class.name,
      l.room ?? "",
      l.topic?.topic ?? "",
      l.cancelled ? `Cancelled: ${l.cancelled.reason}` : "",
    ]);
  return { headers: ["Day", "Date", "Period", "Start", "End", "Course", "Code", "Class", "Room", "Topic", "Status"], rows };
}

/**
 * Counts distinct subjects (course + class) in a week, for the header line.
 *
 * @param lessons - The week's lessons.
 * @returns The count.
 */
export function subjectCount(lessons: readonly Lesson[]): number {
  return new Set(lessons.map((l) => `${l.course.id}:${l.class.id}`)).size;
}
