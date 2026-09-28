/**
 * Dev and test fixtures for `GET /teachers/today` and `GET /timetable/me`,
 * mirroring the seed data of `TALIM Redesign/Talim Teacher Portal.dc.html`
 * (Seyi Tinubu, Easy Sparks Education Center, Friday 25 September 2026 at
 * 10:25 in Lagos, week 3 of the first term) in the API contract's shape.
 *
 * One deliberate addition: Thursday has Mathematics · JSS1 A in periods 4 and
 * 5, so the timetable shows a double period.
 *
 * Used by the jest tests, and by the services when `NEXT_PUBLIC_USE_FIXTURES`
 * is `"true"` outside production (see `src/lib/fixtures/flag.ts`). Nothing in a
 * production build imports this file statically.
 */
import type {
  Lesson,
  Period,
  TeacherToday,
  TimetableDay,
  TimetableWeek,
  TodayLesson,
  Weekday,
} from "@/types/today";

export const FIXTURE_TIMEZONE = "Africa/Lagos";
/** 10:25 on Friday 25 September 2026 in Lagos (UTC+1). */
export const FIXTURE_NOW = "2026-09-25T09:25:00.000Z";
export const FIXTURE_TODAY = "2026-09-25";

export const FIXTURE_PERIODS: Period[] = [
  { key: "p1", label: "Period 1", startTime: "08:00", endTime: "08:40", isBreak: false },
  { key: "p2", label: "Period 2", startTime: "08:40", endTime: "09:20", isBreak: false },
  { key: "p3", label: "Period 3", startTime: "09:20", endTime: "10:00", isBreak: false },
  { key: "brk", label: "Short break", startTime: "10:00", endTime: "10:20", isBreak: true },
  { key: "p4", label: "Period 4", startTime: "10:20", endTime: "11:00", isBreak: false },
  { key: "p5", label: "Period 5", startTime: "11:00", endTime: "11:40", isBreak: false },
  { key: "p6", label: "Period 6", startTime: "11:40", endTime: "12:20", isBreak: false },
  { key: "lun", label: "Lunch", startTime: "12:20", endTime: "13:00", isBreak: true },
  { key: "p7", label: "Period 7", startTime: "13:00", endTime: "13:40", isBreak: false },
  { key: "p8", label: "Period 8", startTime: "13:40", endTime: "14:20", isBreak: false },
];

const CLASSES = {
  c1: { id: "c1", name: "JSS1 A", room: "Block B, Room 4", students: 12, classTeacher: true },
  c2: { id: "c2", name: "JSS2 B", room: "Block C, Room 2", students: 10, classTeacher: false },
} as const;

type CourseKey = "k1" | "k2" | "k3";

const COURSES: Record<CourseKey, { code: string; title: string; subject: string; cls: keyof typeof CLASSES; topic: string }> = {
  k1: { code: "MTH111", title: "Mathematics", subject: "Mathematics", cls: "c1", topic: "Fractions: types and equivalence" },
  k2: { code: "MTH211", title: "Mathematics", subject: "Mathematics", cls: "c2", topic: "Indices and standard form" },
  k3: { code: "FMT201", title: "Further Mathematics", subject: "Further Mathematics", cls: "c2", topic: "Binary operations" },
};

const WEEK_DAYS: { day: Weekday; date: string }[] = [
  { day: "Monday", date: "2026-09-21" },
  { day: "Tuesday", date: "2026-09-22" },
  { day: "Wednesday", date: "2026-09-23" },
  { day: "Thursday", date: "2026-09-24" },
  { day: "Friday", date: "2026-09-25" },
];

/** The design's `tt` table, plus Thursday p5 for the double period. */
const TIMETABLE: Record<string, Record<string, CourseKey>> = {
  Monday: { p1: "k1", p4: "k2", p7: "k3" },
  Tuesday: { p2: "k1", p5: "k3", p8: "k2" },
  Wednesday: { p1: "k2", p3: "k1", p6: "k1" },
  Thursday: { p2: "k3", p4: "k1", p5: "k1", p8: "k2" },
  Friday: { p1: "k1", p4: "k2", p5: "k3", p7: "k1" },
};

/**
 * One lesson in contract shape.
 *
 * @param day - The weekday.
 * @param date - Its date.
 * @param periodKey - The period it fills.
 * @param key - Which course.
 * @returns The lesson.
 */
function lesson(day: Weekday, date: string, periodKey: string, key: CourseKey): Lesson {
  const period = FIXTURE_PERIODS.find((p) => p.key === periodKey)!;
  const course = COURSES[key];
  const cls = CLASSES[course.cls];
  return {
    id: `tt-${day.slice(0, 3).toLowerCase()}-${periodKey}`,
    date,
    day,
    periodKey,
    startTime: period.startTime,
    endTime: period.endTime,
    course: { id: key, code: course.code, title: course.title },
    subject: { id: `s-${key}`, name: course.subject },
    class: { id: cls.id, name: cls.name },
    room: cls.room,
    isClassTeacher: cls.classTeacher,
    studentCount: cls.students,
    topic: {
      week: 3,
      topic: course.topic,
      objectives: `Students should be able to explain ${course.topic.charAt(0).toLowerCase()}${course.topic.slice(1)} and work the related textbook exercises without help.`,
      taughtAt: null,
    },
    cancelled: null,
  };
}

/**
 * Every lesson of the fixture week, ordered by date then start time.
 *
 * @returns The lessons.
 */
export function fixtureWeekLessons(): Lesson[] {
  const out: Lesson[] = [];
  for (const { day, date } of WEEK_DAYS) {
    for (const period of FIXTURE_PERIODS) {
      const key = TIMETABLE[day][period.key];
      if (key) out.push(lesson(day, date, period.key, key));
    }
  }
  return out;
}

/**
 * The Today aggregate at 10:25 on Friday 25 September 2026.
 *
 * @returns A fresh copy (tests may mutate it).
 */
export function makeTodayFixture(): TeacherToday {
  const friday = fixtureWeekLessons().filter((l) => l.date === FIXTURE_TODAY);
  const lessons: TodayLesson[] = friday.map((l) => {
    const state = l.periodKey === "p1" ? "done" : l.periodKey === "p4" ? "now" : "later";
    return { ...l, state, minutesLeft: state === "now" ? 35 : null };
  });
  return {
    date: FIXTURE_TODAY,
    day: "Friday",
    timezone: FIXTURE_TIMEZONE,
    now: FIXTURE_NOW,
    greeting: "morning",
    term: { id: "term-1", name: "First term" },
    weekNumber: 3,
    schoolDay: { isSchoolDay: true, reason: null, holidayTitle: null, endsEarlyAt: null },
    periods: FIXTURE_PERIODS.map((p) => ({ ...p })),
    lessons,
    nowLessonId: "tt-fri-p4",
    nextLessonId: "tt-fri-p5",
    firstLessonAt: "08:00",
    lastLessonEndsAt: "13:40",
    registers: [
      {
        classId: "c1",
        className: "JSS1 A",
        isClassTeacher: true,
        studentCount: 12,
        markedCount: 1,
        onLeaveCount: 1,
        submittedAt: null,
        inferred: false,
        closesAt: "2026-09-25T10:00:00.000Z",
        editableUntil: "2026-09-25T15:00:00.000Z",
        canSubmit: true,
      },
    ],
    attention: [
      {
        id: "att-register-c1",
        kind: "register",
        tone: "warning",
        title: "Submit today's register for JSS1 A",
        description: "Morning registers close at 11:00am. Zainab Yusuf is on approved leave and is already marked.",
        action: { label: "Take register", target: { page: "attendance", classId: "c1", date: FIXTURE_TODAY } },
      },
      {
        id: "att-scores-k1-a1",
        kind: "scores_missing",
        tone: "warning",
        title: "Enter 4 missing 1st CA scores",
        description: "Mathematics · JSS1 A · due Friday 2 October",
        action: { label: "Continue grading", target: { page: "grading", courseId: "k1", assessmentId: "a1" } },
      },
      {
        id: "att-scores-k3-a1",
        kind: "scores_start",
        tone: "neutral",
        title: "Start 1st CA scores for Further Mathematics · JSS2 B",
        description: "10 students · due Friday 2 October",
        action: { label: "Start grading", target: { page: "grading", courseId: "k3", assessmentId: "a1" } },
      },
      {
        id: "att-reply-t1",
        kind: "reply",
        tone: "info",
        title: "Reply to Mrs. Adaobi Obi",
        description: "Good morning Mr. Tinubu. Chiamaka has a dental appointment on Monday morning. She will be in school by 11am.",
        action: { label: "Open message", target: { page: "messages", roomId: "t1" } },
      },
      {
        id: "att-resource-k1-3",
        kind: "resource",
        tone: "accent",
        title: "Share a resource for “Fractions: types and equivalence”",
        description: "Mathematics · JSS1 A · this week's topic has nothing attached yet",
        action: { label: "Upload", target: { page: "resources", courseId: "k1", week: 3 } },
      },
    ],
    classes: [
      { id: "c1", name: "JSS1 A", role: "class_teacher", studentCount: 12, capacity: 30, attendanceRateTerm: 93, register: { submittedAt: null } },
      { id: "c2", name: "JSS2 B", role: "subject_teacher", studentCount: 10, capacity: 30, attendanceRateTerm: 91, register: null },
    ],
    events: [{ id: "ev-sports", title: "Inter-house sports", type: "early_close", startDate: "2026-10-09", endDate: "2026-10-09" }],
    setup: {
      percent: 50,
      steps: [
        { key: "profile", label: "Confirm your profile", done: true },
        { key: "register", label: "Submit a register", done: true },
        { key: "publish", label: "Publish grades", done: true },
        { key: "resource", label: "Upload a resource", done: false },
        { key: "plan", label: "Plan every week", done: false },
        { key: "tour", label: "Take the tour", done: false },
      ],
    },
    counts: { unreadMessages: 1, unreadNotifications: 3, pendingRegisters: 1 },
  };
}

/**
 * The same teacher on Saturday 26 September: no lessons, weekend.
 *
 * @returns The weekend Today.
 */
export function makeWeekendTodayFixture(): TeacherToday {
  const base = makeTodayFixture();
  return {
    ...base,
    date: "2026-09-26",
    day: "Saturday",
    now: "2026-09-26T09:25:00.000Z",
    schoolDay: { isSchoolDay: false, reason: "weekend", holidayTitle: null, endsEarlyAt: null },
    lessons: [],
    nowLessonId: null,
    nextLessonId: null,
    firstLessonAt: null,
    lastLessonEndsAt: null,
    registers: [],
    attention: base.attention.filter((a) => a.kind !== "register"),
    counts: { ...base.counts, pendingRegisters: 0 },
  };
}

/**
 * Friday 25 September declared a holiday: every lesson cancelled.
 *
 * @param title - The holiday's name.
 * @returns The holiday Today.
 */
export function makeHolidayTodayFixture(title = "Mid-term break"): TeacherToday {
  const base = makeTodayFixture();
  return {
    ...base,
    schoolDay: { isSchoolDay: false, reason: "holiday", holidayTitle: title, endsEarlyAt: null },
    lessons: base.lessons.map((l) => ({ ...l, state: "later", minutesLeft: null, cancelled: { reason: title } })),
    nowLessonId: null,
    nextLessonId: null,
    registers: [],
    attention: base.attention.filter((a) => a.kind !== "register"),
    counts: { ...base.counts, pendingRegisters: 0 },
  };
}

/**
 * Between terms: no current term, nothing scheduled.
 *
 * @returns The no-term Today.
 */
export function makeNoTermTodayFixture(): TeacherToday {
  const base = makeWeekendTodayFixture();
  return {
    ...base,
    date: FIXTURE_TODAY,
    day: "Friday",
    now: FIXTURE_NOW,
    term: null,
    weekNumber: null,
    schoolDay: { isSchoolDay: false, reason: "no_term", holidayTitle: null, endsEarlyAt: null },
    attention: [],
  };
}

/**
 * A school day on which this teacher has no lessons (the timetable exists).
 *
 * @returns The Today.
 */
export function makeNoLessonsTodayFixture(): TeacherToday {
  const base = makeTodayFixture();
  return { ...base, lessons: [], nowLessonId: null, nextLessonId: null, firstLessonAt: null, lastLessonEndsAt: null };
}

/**
 * A school with no timetable at all: no periods and no lessons.
 *
 * @returns The Today.
 */
export function makeNoTimetableTodayFixture(): TeacherToday {
  return { ...makeNoLessonsTodayFixture(), periods: [] };
}

/**
 * The timetable week of 21 – 25 September 2026 (week 3).
 *
 * @returns A fresh copy.
 */
export function makeTimetableWeekFixture(): TimetableWeek {
  const days: TimetableDay[] = WEEK_DAYS.map(({ day, date }) => ({
    date,
    day,
    isToday: date === FIXTURE_TODAY,
    holiday: null,
    endsEarlyAt: null,
    events: [],
  }));
  return {
    timezone: FIXTURE_TIMEZONE,
    now: FIXTURE_NOW,
    today: FIXTURE_TODAY,
    term: { id: "term-1", name: "First term", startDate: "2026-09-07", endDate: "2026-12-11", totalWeeks: 14 },
    week: { number: 3, start: "2026-09-21", end: "2026-09-25", isCurrent: true, prevStart: "2026-09-14", nextStart: "2026-09-28", inTerm: true },
    days,
    periods: FIXTURE_PERIODS.map((p) => ({ ...p })),
    periodsSource: "school",
    lessons: fixtureWeekLessons(),
  };
}

/**
 * The fixture week with Wednesday a holiday and Friday closing at 11:00.
 *
 * @returns The week.
 */
export function makeDisruptedWeekFixture(): TimetableWeek {
  const base = makeTimetableWeekFixture();
  return {
    ...base,
    days: base.days.map((d) =>
      d.day === "Wednesday"
        ? { ...d, holiday: { title: "Founders' Day" }, events: [{ id: "ev-fd", title: "Founders' Day", type: "holiday" }] }
        : d.day === "Friday"
          ? { ...d, endsEarlyAt: "11:00", events: [{ id: "ev-ec", title: "Staff training", type: "early_close" }] }
          : d,
    ),
    lessons: base.lessons.map((l) =>
      l.day === "Wednesday"
        ? { ...l, cancelled: { reason: "Founders' Day" } }
        : l.day === "Friday" && l.startTime >= "11:00"
          ? { ...l, cancelled: { reason: "Staff training" } }
          : l,
    ),
  };
}

/**
 * A week of a school with no timetable yet.
 *
 * @returns The empty week.
 */
export function makeEmptyTimetableWeekFixture(): TimetableWeek {
  return { ...makeTimetableWeekFixture(), periods: [], lessons: [], periodsSource: "derived" };
}

/**
 * Shifts a fixture week by whole weeks, for the dev-mode week navigation.
 *
 * @param weekStart - Any date in the wanted week (`YYYY-MM-DD`), or undefined for the current one.
 * @returns The fixture week moved to that week; outside the term it has no lessons.
 */
export function timetableWeekFixtureFor(weekStart?: string): TimetableWeek {
  const base = makeTimetableWeekFixture();
  if (!weekStart) return base;
  const monday = snapToMonday(weekStart);
  const shiftDays = Math.round((Date.parse(`${monday}T00:00:00Z`) - Date.parse(`${base.week.start}T00:00:00Z`)) / 86_400_000);
  if (shiftDays === 0) return base;
  const move = (date: string, days = shiftDays) => new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
  const start = move(base.week.start);
  const inTerm = start >= base.term!.startDate && start <= base.term!.endDate;
  const number = inTerm ? Math.floor((Date.parse(`${start}T00:00:00Z`) - Date.parse(`${base.term!.startDate}T00:00:00Z`)) / (7 * 86_400_000)) + 1 : null;
  return {
    ...base,
    week: { number, start, end: move(base.week.end), isCurrent: false, prevStart: move(start, -7), nextStart: move(start, 7), inTerm },
    days: base.days.map((d) => ({ ...d, date: move(d.date), isToday: false })),
    lessons: inTerm
      ? base.lessons.map((l) => ({ ...l, date: move(l.date), topic: l.topic && number ? { ...l.topic, week: number, taughtAt: null } : l.topic }))
      : [],
  };
}

/**
 * The Monday of the week containing a date.
 *
 * @param date - `YYYY-MM-DD`.
 * @returns That week's Monday, `YYYY-MM-DD`.
 */
function snapToMonday(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  const back = (d.getUTCDay() + 6) % 7;
  return new Date(d.getTime() - back * 86_400_000).toISOString().slice(0, 10);
}
