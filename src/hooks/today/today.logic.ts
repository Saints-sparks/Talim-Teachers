/**
 * Pure time logic for Today and the Timetable: the school's wall clock (from
 * the server's `now` and `timezone`, never the device's timezone), lesson
 * state, minutes left, the greeting, and date/time labels. No React.
 */
import { parseTimeToMinutes } from "@/hooks/timetable/timetable.logic";
import type { AttentionItem, Greeting, Lesson, LessonState, Period, RegisterStatus, TeacherToday, TodayLesson } from "@/types/today";

/** The school's wall clock at one instant. */
export interface SchoolClock {
  /** `YYYY-MM-DD` in the school timezone. */
  date: string;
  /** Minutes since the school's midnight (fractional). */
  minutes: number;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/**
 * Reads the school's date and time at an instant, using Intl with the
 * school's IANA timezone so a teacher's laptop set to another zone still sees
 * Lagos time.
 *
 * @param nowMs - The instant, in epoch milliseconds.
 * @param timezone - The school's IANA timezone (falls back to UTC if unknown).
 * @returns The school-local date and minutes since midnight.
 */
export function schoolClock(nowMs: number, timezone: string): SchoolClock {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone,
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date(nowMs));
  } catch {
    return schoolClock(nowMs, "UTC");
  }
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "0";
  const hour = Number(get("hour")) % 24;
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    minutes: hour * 60 + Number(get("minute")) + Number(get("second")) / 60,
  };
}

/**
 * How far the server's clock is ahead of this device's, so a 30-second tick
 * can move "now" forward without trusting the device clock's setting.
 *
 * @param serverNow - The response's `now` (ISO).
 * @param receivedAtMs - When the response arrived, by the device clock.
 * @returns Milliseconds to add to `Date.now()`; 0 when `serverNow` is unreadable.
 */
export function clockOffset(serverNow: string | undefined, receivedAtMs: number): number {
  const server = serverNow ? Date.parse(serverNow) : NaN;
  return Number.isFinite(server) && receivedAtMs > 0 ? server - receivedAtMs : 0;
}

/**
 * Minutes since midnight for a contract time (`"08:00"`; legacy `"8:00 AM"` too).
 *
 * @param time - The time text.
 * @returns Minutes, or NaN when unreadable.
 */
export function toMinutes(time: string | null | undefined): number {
  return parseTimeToMinutes(time ?? undefined) ?? NaN;
}

/**
 * Where a lesson stands at a moment on the school clock.
 *
 * @param lesson - The lesson (date and 24-hour times).
 * @param clock - The school clock.
 * @returns `done`, `now` or `later`.
 */
export function lessonState(lesson: Pick<Lesson, "date" | "startTime" | "endTime">, clock: SchoolClock): LessonState {
  if (lesson.date < clock.date) return "done";
  if (lesson.date > clock.date) return "later";
  const start = toMinutes(lesson.startTime);
  const end = toMinutes(lesson.endTime);
  if (clock.minutes < start) return "later";
  if (clock.minutes >= end) return "done";
  return "now";
}

/**
 * Whole minutes left in a lesson that is on now (rounded up, so "1 min left"
 * until it actually ends).
 *
 * @param lesson - The lesson.
 * @param clock - The school clock.
 * @returns Minutes left, or null when the lesson is not on now.
 */
export function minutesLeft(lesson: Pick<Lesson, "date" | "startTime" | "endTime">, clock: SchoolClock): number | null {
  if (lessonState(lesson, clock) !== "now") return null;
  return Math.max(1, Math.ceil(toMinutes(lesson.endTime) - clock.minutes));
}

/**
 * How far through a lesson we are.
 *
 * @param lesson - The lesson.
 * @param clock - The school clock.
 * @returns 0-1; 0 before it starts, 1 after it ends.
 */
export function lessonProgress(lesson: Pick<Lesson, "date" | "startTime" | "endTime">, clock: SchoolClock): number {
  const state = lessonState(lesson, clock);
  if (state !== "now") return state === "done" ? 1 : 0;
  const start = toMinutes(lesson.startTime);
  const end = toMinutes(lesson.endTime);
  return end > start ? Math.min(1, Math.max(0, (clock.minutes - start) / (end - start))) : 0;
}

/**
 * The greeting for a time of day: morning before noon, afternoon before five.
 *
 * @param minutes - Minutes since the school's midnight.
 * @returns The greeting word.
 */
export function greetingFor(minutes: number): Greeting {
  if (minutes < 12 * 60) return "morning";
  if (minutes < 17 * 60) return "afternoon";
  return "evening";
}

/** Where the teacher's day is, for the navy card. */
export type DayPhase =
  | { kind: "now"; lesson: TodayLesson; next: TodayLesson | null }
  | { kind: "before"; next: TodayLesson }
  | { kind: "between"; next: TodayLesson }
  | { kind: "after"; taught: number }
  | { kind: "none" };

/** Today recomputed against the live clock. */
export interface LiveToday {
  clock: SchoolClock;
  greeting: Greeting;
  /** Lessons with state and minutes left recomputed; cancelled lessons are never `now`. */
  lessons: TodayLesson[];
  now: TodayLesson | null;
  next: TodayLesson | null;
  phase: DayPhase;
  /** Lessons finished (not cancelled). */
  taughtCount: number;
  /** Lessons not cancelled. */
  activeCount: number;
  cancelledCount: number;
  /** True once the school's date has moved past the aggregate's date (time to refetch). */
  stale: boolean;
}

/**
 * Recomputes the time-dependent parts of Today on the client's tick.
 *
 * @param today - The aggregate from the server.
 * @param nowMs - The current instant (device clock plus the server offset).
 * @returns The live view.
 */
export function computeLiveToday(today: TeacherToday, nowMs: number): LiveToday {
  const clock = schoolClock(nowMs, today.timezone);
  const lessons = [...today.lessons]
    .sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime))
    .map((lesson) => {
      const state = lesson.cancelled ? (lessonState(lesson, clock) === "done" ? "done" : "later") : lessonState(lesson, clock);
      return { ...lesson, state, minutesLeft: state === "now" ? minutesLeft(lesson, clock) : null };
    });
  const active = lessons.filter((l) => !l.cancelled);
  const now = active.find((l) => l.state === "now") ?? null;
  const next = active.find((l) => l.state === "later") ?? null;
  const taughtCount = active.filter((l) => l.state === "done").length;

  let phase: DayPhase = { kind: "none" };
  if (active.length > 0) {
    if (now) phase = { kind: "now", lesson: now, next };
    else if (next && taughtCount === 0) phase = { kind: "before", next };
    else if (next) phase = { kind: "between", next };
    else phase = { kind: "after", taught: taughtCount };
  }

  return {
    clock,
    greeting: greetingFor(clock.minutes),
    lessons,
    now,
    next,
    phase,
    taughtCount,
    activeCount: active.length,
    cancelledCount: lessons.length - active.length,
    stale: clock.date > today.date,
  };
}

/**
 * Shows a contract time the way the design does: `"08:00"` → `"8:00"`.
 *
 * @param time - `HH:mm`.
 * @returns The display text; the input when it cannot be read.
 */
export function displayTime(time: string | null | undefined): string {
  const minutes = toMinutes(time);
  if (!Number.isFinite(minutes)) return time ?? "";
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${h}:${String(m).padStart(2, "0")}`;
}

/**
 * A time range as the design writes it: `"10:20 – 11:00"`.
 *
 * @param start - `HH:mm`.
 * @param end - `HH:mm`.
 * @returns The range.
 */
export function displayRange(start: string, end: string): string {
  return `${displayTime(start)} – ${displayTime(end)}`;
}

/**
 * Parses a `YYYY-MM-DD` day as UTC midnight, so formatting never shifts it by
 * the device's timezone.
 *
 * @param date - The day.
 * @returns The Date at UTC midnight.
 */
function utcDay(date: string): Date {
  return new Date(`${date}T00:00:00Z`);
}

/**
 * `"2026-09-25"` → `"Friday, 25 September 2026"`.
 *
 * @param date - `YYYY-MM-DD`.
 * @returns The long date.
 */
export function longDate(date: string): string {
  const d = utcDay(date);
  if (Number.isNaN(d.getTime())) return date;
  return `${WEEKDAYS[d.getUTCDay()]}, ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/**
 * `"2026-09-25"` → `"Fri, 25 Sep 2026"` (the top bar).
 *
 * @param date - `YYYY-MM-DD`.
 * @returns The short date.
 */
export function shortDate(date: string): string {
  const d = utcDay(date);
  if (Number.isNaN(d.getTime())) return date;
  return `${WEEKDAYS[d.getUTCDay()].slice(0, 3)}, ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()].slice(0, 3)} ${d.getUTCFullYear()}`;
}

/**
 * `"2026-09-25"` → `"25 Sep"` (timetable column heads).
 *
 * @param date - `YYYY-MM-DD`.
 * @returns Day and short month.
 */
export function dayMonth(date: string): string {
  const d = utcDay(date);
  if (Number.isNaN(d.getTime())) return date;
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()].slice(0, 3)}`;
}

/**
 * The span of a week: `"21 – 25 September"`, or `"28 September – 2 October"`
 * across a month, with the year added when the span crosses one.
 *
 * @param start - First day, `YYYY-MM-DD`.
 * @param end - Last day, `YYYY-MM-DD`.
 * @returns The span.
 */
export function weekSpan(start: string, end: string): string {
  const a = utcDay(start);
  const b = utcDay(end);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return `${start} – ${end}`;
  if (a.getUTCFullYear() !== b.getUTCFullYear()) {
    return `${a.getUTCDate()} ${MONTHS[a.getUTCMonth()]} ${a.getUTCFullYear()} – ${b.getUTCDate()} ${MONTHS[b.getUTCMonth()]} ${b.getUTCFullYear()}`;
  }
  if (a.getUTCMonth() !== b.getUTCMonth()) {
    return `${a.getUTCDate()} ${MONTHS[a.getUTCMonth()]} – ${b.getUTCDate()} ${MONTHS[b.getUTCMonth()]}`;
  }
  return `${a.getUTCDate()} – ${b.getUTCDate()} ${MONTHS[b.getUTCMonth()]}`;
}

/**
 * The timetable's week heading: `"Week 3 · 21 – 25 September"`, or
 * `"Outside term · …"` when the week is not in a term.
 *
 * @param week - The response's `week`.
 * @param week.number - Week of term, or null.
 * @param week.start - Monday.
 * @param week.end - Last school day.
 * @param week.inTerm - Whether the week falls in the term.
 * @returns The heading.
 */
export function weekLabel(week: { number: number | null; start: string; end: string; inTerm: boolean }): string {
  const span = weekSpan(week.start, week.end);
  return week.inTerm && week.number !== null ? `Week ${week.number} · ${span}` : `Outside term · ${span}`;
}

/**
 * A timestamp as the school's clock shows it: `"8:44am"`.
 *
 * @param iso - The instant.
 * @param timezone - The school's timezone.
 * @returns The time, or an empty string when unreadable.
 */
export function clockTime(iso: string | null | undefined, timezone: string): string {
  if (!iso) return "";
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return "";
  const { minutes } = schoolClock(ms, timezone);
  const h24 = Math.floor(minutes / 60);
  const m = Math.floor(minutes % 60);
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, "0")}${h24 < 12 ? "am" : "pm"}`;
}

/**
 * The period a lesson fills, by key or else by matching start time.
 *
 * @param lesson - The lesson.
 * @param periods - The school's periods.
 * @returns The period, or undefined.
 */
export function periodOf(lesson: Pick<Lesson, "periodKey" | "startTime">, periods: readonly Period[]): Period | undefined {
  return (
    (lesson.periodKey ? periods.find((p) => p.key === lesson.periodKey) : undefined) ??
    periods.find((p) => !p.isBreak && toMinutes(p.startTime) === toMinutes(lesson.startTime))
  );
}

/**
 * "Mathematics · JSS1 A".
 *
 * @param lesson - The lesson.
 * @returns Course title and class name.
 */
export function lessonTitle(lesson: Pick<Lesson, "course" | "class">): string {
  return `${lesson.course.title} · ${lesson.class.name}`;
}

/** Where a register stands against its morning deadline. */
export interface RegisterDeadline {
  /** True once `closesAt` has passed and the register is still not submitted. */
  overdue: boolean;
  /** The close time on the school clock, as the design writes it (`"11:00"`). */
  time: string;
}

/**
 * Reads a register's deadline on the school clock. An unsubmitted register
 * becomes overdue at `closesAt`; a submitted one never is.
 *
 * @param register - The register's `submittedAt` and `closesAt` (ISO).
 * @param register.submittedAt - When it was submitted, or null.
 * @param register.closesAt - When registers close today (ISO).
 * @param nowMs - The current instant (server-offset).
 * @param timezone - The school's timezone.
 * @returns The deadline, or null when `closesAt` cannot be read.
 */
export function registerDeadline(
  register: { submittedAt: string | null; closesAt: string },
  nowMs: number,
  timezone: string,
): RegisterDeadline | null {
  const closes = Date.parse(register.closesAt);
  if (!Number.isFinite(closes)) return null;
  const { minutes } = schoolClock(closes, timezone);
  const time = displayTime(`${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(Math.floor(minutes % 60)).padStart(2, "0")}`);
  return { overdue: !register.submittedAt && nowMs >= closes, time };
}

/**
 * The Take register button's tip: `"Open today's register for JSS1 A · closes
 * at 11:00"`, or `"Register overdue for JSS1 A · closed at 11:00"` once the
 * close time has passed.
 *
 * @param register - The register the button opens.
 * @param nowMs - The current instant.
 * @param timezone - The school's timezone.
 * @returns The tip.
 */
export function registerButtonTip(
  register: { className: string; submittedAt: string | null; closesAt: string },
  nowMs: number,
  timezone: string,
): string {
  const deadline = registerDeadline(register, nowMs, timezone);
  if (!deadline) return `Open today's register for ${register.className}`;
  return deadline.overdue
    ? `Register overdue for ${register.className} · closed at ${deadline.time}`
    : `Open today's register for ${register.className} · closes at ${deadline.time}`;
}

/**
 * The live text of a "Needs your attention" item. A `register` item turns
 * into "Register overdue · closed at 11:00" in the danger tone once its
 * class's register has passed `closesAt` unsubmitted; every other item keeps
 * the server's text and tone.
 *
 * @param item - The attention item.
 * @param registers - Today's register statuses.
 * @param nowMs - The current instant.
 * @param timezone - The school's timezone.
 * @returns The description, and whether it is overdue.
 */
export function attentionText(
  item: Pick<AttentionItem, "kind" | "description" | "action">,
  registers: readonly RegisterStatus[],
  nowMs: number,
  timezone: string,
): { description: string; overdue: boolean } {
  if (item.kind !== "register") return { description: item.description, overdue: false };
  const register = registers.find((r) => r.classId === item.action.target.classId);
  const deadline = register ? registerDeadline(register, nowMs, timezone) : null;
  if (!deadline?.overdue) return { description: item.description, overdue: false };
  return { description: `Register overdue · closed at ${deadline.time}`, overdue: true };
}
