/**
 * Dev and test fixtures for the Attendance and Students screens
 * (`GET /teachers/me/classes`, `GET|PUT /registers/:classId`,
 * `GET /teachers/me/classes/:classId/students`,
 * `GET /teachers/me/students/:studentId`), in the hand-written contract shape
 * of `src/types/classroom.ts`.
 *
 * Mirrors the seed of `TALIM Redesign/Talim Teacher Portal.dc.html`: Seyi
 * Tinubu is class teacher of JSS1 A (12 students; Zainab Yusuf on approved
 * leave today) and teaches JSS2 B (10 students, whose register the class
 * teacher submitted at 8:44am with one absence and one late). "Today" is
 * Friday 25 September 2026 (see `today.fixture.ts`); the term started on
 * Monday 7 September.
 *
 * In fixture mode (`NEXT_PUBLIC_USE_FIXTURES=true`, dev only) the register
 * PUT writes to an in-memory store, so drafts survive navigation until the
 * page is reloaded. Nothing in a production build imports this file
 * statically.
 */
import { FIXTURE_TODAY } from "@/lib/fixtures/today.fixture";
import type {
  ClassRoster,
  MarkStatus,
  MyClass,
  RegisterCounts,
  RegisterStudent,
  RegisterSaved,
  RegisterView,
  RosterStudent,
  SaveRegisterBody,
  StudentCourseScores,
  StudentRecord,
} from "@/types/classroom";

export const FIXTURE_TERM = { id: "term-1", name: "First term", startDate: "2026-09-07", endDate: "2026-12-11" };
export const FIXTURE_SCHOOL = "Easy Sparks Education Center";

type ClassKey = "c1" | "c2";

interface SeedStudent {
  id: string;
  name: string;
  first: string;
  cls: ClassKey;
  adm: string;
  guardian: string;
  phone: string;
  /** Term attendance: present, late, absent, on leave. */
  att: [number, number, number, number];
  gender: "Female" | "Male";
  email: string;
  dob: string;
  relationship: "Mother" | "Father";
  guardianEmail: string;
}

const S1: [string, string, string][] = [
  ["Musa Adele", "Mr. Ibrahim Adele", "+234 803 112 4410"],
  ["Jaye Femi", "Mrs. Kemi Femi", "+234 805 229 1034"],
  ["Chiamaka Obi", "Mrs. Adaobi Obi", "+234 806 771 2290"],
  ["Tolu Bakare", "Mr. Segun Bakare", "+234 802 348 9912"],
  ["Ifeoma Nwosu", "Mrs. Ngozi Nwosu", "+234 809 115 6620"],
  ["Kelechi Eze", "Mr. Chidi Eze", "+234 813 402 7781"],
  ["Aisha Bello", "Mrs. Hauwa Bello", "+234 816 553 0198"],
  ["David Okafor", "Mr. Peter Okafor", "+234 807 664 2031"],
  ["Zainab Yusuf", "Mr. Aliyu Yusuf", "+234 818 290 4476"],
  ["Emeka Nnaji", "Mrs. Uche Nnaji", "+234 803 918 3304"],
  ["Funmi Adeyemi", "Mrs. Bisi Adeyemi", "+234 810 447 5529"],
  ["Samuel Ogun", "Mr. Dayo Ogun", "+234 814 336 7102"],
];
const S2: [string, string, string][] = [
  ["Halima Sani", "Mrs. Rakiya Sani", "+234 802 771 0934"],
  ["Daniel Ojo", "Mr. Kunle Ojo", "+234 806 118 5527"],
  ["Precious Etim", "Mrs. Grace Etim", "+234 813 664 2208"],
  ["Ibrahim Lawal", "Mr. Musa Lawal", "+234 809 552 7713"],
  ["Grace Uche", "Mrs. Joy Uche", "+234 805 339 8820"],
  ["Tobi Alade", "Mr. Wale Alade", "+234 817 204 6691"],
  ["Ngozi Ibe", "Mrs. Chioma Ibe", "+234 803 447 1182"],
  ["Yusuf Garba", "Mr. Sani Garba", "+234 816 990 3357"],
  ["Blessing Akpan", "Mrs. Mfon Akpan", "+234 812 225 4409"],
  ["Victor Ade", "Mr. Tayo Ade", "+234 808 671 5530"],
];
const ATT: [number, number, number, number][] = [
  [13, 1, 0, 0], [12, 0, 2, 0], [12, 1, 0, 1], [11, 2, 1, 0], [14, 0, 0, 0], [12, 1, 1, 0], [13, 1, 0, 0], [10, 2, 2, 0],
  [11, 0, 1, 2], [13, 0, 1, 0], [14, 0, 0, 0], [11, 1, 2, 0], [13, 0, 1, 0], [12, 2, 0, 0], [14, 0, 0, 0], [11, 1, 1, 1],
  [13, 1, 0, 0], [12, 0, 2, 0], [14, 0, 0, 0], [10, 3, 1, 0], [13, 0, 0, 1], [12, 1, 1, 0],
];
const FEMALE = ["Jaye", "Chiamaka", "Ifeoma", "Aisha", "Zainab", "Funmi", "Halima", "Precious", "Grace", "Ngozi", "Blessing"];

/** The 22 seed students, built the way the design builds them. */
export const FIXTURE_STUDENTS: readonly SeedStudent[] = [...S1, ...S2].map(([name, guardian, phone], i) => {
  const [first] = name.split(" ");
  const cls: ClassKey = i < S1.length ? "c1" : "c2";
  const guardianName = guardian.replace(/^(Mr\.|Mrs\.)\s*/, "");
  const year = cls === "c1" ? 2013 + (i % 2) : 2012 + (i % 2);
  const month = (i * 5) % 12;
  const day = ((i * 7) % 27) + 1;
  return {
    id: `s${i + 1}`,
    name,
    first,
    cls,
    adm: `2601${String(i + 1).padStart(4, "0")}`,
    guardian,
    phone,
    att: ATT[i],
    gender: FEMALE.includes(first) ? "Female" : "Male",
    email: `${name.toLowerCase().replace(" ", ".")}@easysparks.edu.ng`,
    dob: `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    relationship: /^Mrs/.test(guardian) ? "Mother" : "Father",
    guardianEmail: `${guardianName.toLowerCase().replace(" ", ".")}@gmail.com`,
  };
});

const CLASSES: Record<ClassKey, { id: ClassKey; name: string; role: MyClass["role"]; capacity: number }> = {
  c1: { id: "c1", name: "JSS1 A", role: "class_teacher", capacity: 30 },
  c2: { id: "c2", name: "JSS2 B", role: "subject_teacher", capacity: 30 },
};

const COURSES = {
  k1: { id: "k1", code: "MTH111", title: "Mathematics", cls: "c1" as ClassKey },
  k2: { id: "k2", code: "MTH211", title: "Mathematics", cls: "c2" as ClassKey },
  k3: { id: "k3", code: "FMT201", title: "Further Mathematics", cls: "c2" as ClassKey },
};

const ASSESSMENTS = [
  { id: "a1", name: "1st CA", maxScore: 20 },
  { id: "a2", name: "2nd CA", maxScore: 20 },
  { id: "a3", name: "Exam", maxScore: 60 },
];

/** Zainab Yusuf (s9) is on approved leave today. */
const LEAVE_TODAY: Record<string, { id: string; type: string; requestedBy: string | null }> = {
  s9: { id: "leave-s9", type: "Medical", requestedBy: "Mr. Aliyu Yusuf" },
};

/** Samuel Ogun's guardian has no Talim account; Victor Ade has no guardian on record. */
const NO_ACCOUNT = new Set(["s12"]);
const NO_GUARDIAN = new Set(["s22"]);

/**
 * The students of a fixture class.
 *
 * @param classId - `c1` or `c2`.
 * @returns Its students, by name.
 */
function studentsOf(classId: string): SeedStudent[] {
  return FIXTURE_STUDENTS.filter((s) => s.cls === classId).sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * The term attendance rate the contract defines: (present + late) / (present + late + absent), to 1 decimal.
 *
 * @param att - Present, late, absent, on leave.
 * @returns The rate, or null with no records.
 */
function rateOf(att: readonly number[]): number | null {
  const attended = att[0] + att[1];
  const counted = attended + att[2];
  return counted ? Math.round((attended / counted) * 1000) / 10 : null;
}

/**
 * `GET /teachers/me/classes`.
 *
 * @returns JSS1 A (class teacher) then JSS2 B.
 */
export function makeMyClassesFixture(): MyClass[] {
  return [
    { ...CLASSES.c1, studentCount: studentsOf("c1").length, courses: [{ id: "k1", code: "MTH111", title: "Mathematics" }] },
    {
      ...CLASSES.c2,
      studentCount: studentsOf("c2").length,
      courses: [
        { id: "k2", code: "MTH211", title: "Mathematics" },
        { id: "k3", code: "FMT201", title: "Further Mathematics" },
      ],
    },
  ];
}

/** Fixture-mode register writes, keyed `classId|date`. */
interface StoredRegister {
  marks: Record<string, { status: MarkStatus; absenceReason: string | null; note: string | null }>;
  submittedAt: string | null;
  lastEditedAt: string | null;
  /** Students absent at the last submit, so a resubmit notifies only new ones. */
  notifiedAbsent: string[];
}
const store = new Map<string, StoredRegister>();

/**
 * Clears the fixture-mode register store (tests).
 */
export function resetClassroomFixtureStore(): void {
  store.clear();
}

/**
 * Day of the week of a `YYYY-MM-DD` (0 Sunday … 6 Saturday).
 *
 * @param date - The day.
 * @returns The weekday number.
 */
function weekday(date: string): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

/**
 * What the register of a past school day looked like: most present, a few
 * late or absent, submitted at 7:50am.
 *
 * @param classId - The class.
 * @param date - A past school day.
 * @returns The stored register.
 */
function pastRegister(classId: string, date: string): StoredRegister {
  const seed = Number(date.slice(8, 10));
  const marks: StoredRegister["marks"] = {};
  studentsOf(classId).forEach((s, i) => {
    const k = (i * 5 + seed * 3) % 17;
    const status: MarkStatus = k === 0 ? "absent" : k === 1 ? "late" : "present";
    marks[s.id] = { status, absenceReason: status === "absent" ? "Sick" : null, note: null };
  });
  return { marks, submittedAt: `${date}T06:50:00.000Z`, lastEditedAt: null, notifiedAbsent: [] };
}

/**
 * The stored register for a class and day, seeding today's JSS2 B (submitted
 * at 8:44am with Ibrahim Lawal absent and Tobi Alade late) and past days.
 *
 * @param classId - The class.
 * @param date - The day.
 * @returns The stored register (created on first read).
 */
function storedRegister(classId: string, date: string): StoredRegister {
  const key = `${classId}|${date}`;
  let reg = store.get(key);
  if (reg) return reg;
  if (date < FIXTURE_TODAY) {
    reg = pastRegister(classId, date);
  } else if (date === FIXTURE_TODAY && classId === "c2") {
    const marks: StoredRegister["marks"] = {};
    for (const s of studentsOf("c2")) marks[s.id] = { status: "present", absenceReason: null, note: null };
    marks.s16 = { status: "absent", absenceReason: "Sick", note: null };
    marks.s20 = { status: "late", absenceReason: null, note: null };
    reg = { marks, submittedAt: "2026-09-25T07:44:00.000Z", lastEditedAt: null, notifiedAbsent: ["s16"] };
  } else {
    reg = { marks: {}, submittedAt: null, lastEditedAt: null, notifiedAbsent: [] };
  }
  store.set(key, reg);
  return reg;
}

/** Options for {@link makeRegisterFixture}. */
export interface RegisterFixtureOptions {
  /** Make the day a holiday with this title. */
  holiday?: string;
  /** Answer as if the caller were staff (edit access on past days too). */
  staff?: boolean;
}

/**
 * `GET /registers/:classId?date=` as the fixture teacher sees it.
 *
 * - JSS1 A today: editable, nobody marked, Zainab Yusuf on approved leave.
 * - JSS2 B: view only (`not_class_teacher`); today's register is submitted.
 * - Past days: read-only (`past`), submitted. Future days: `future`.
 * - Weekends, holidays and days outside the term: `not_school_day`.
 *
 * @param classId - `c1` or `c2`.
 * @param date - The day; today when omitted.
 * @param options - See {@link RegisterFixtureOptions}.
 * @returns The register view.
 */
export function makeRegisterFixture(classId: string, date: string = FIXTURE_TODAY, options: RegisterFixtureOptions = {}): RegisterView {
  const cls = CLASSES[classId as ClassKey] ?? CLASSES.c1;
  const wd = weekday(date);
  const inTerm = date >= FIXTURE_TERM.startDate && date <= FIXTURE_TERM.endDate;
  const schoolDay: RegisterView["schoolDay"] =
    wd === 0 || wd === 6
      ? { isSchoolDay: false, reason: "weekend", holidayTitle: null }
      : options.holiday
        ? { isSchoolDay: false, reason: "holiday", holidayTitle: options.holiday }
        : !inTerm
          ? { isSchoolDay: false, reason: "no_term", holidayTitle: null }
          : { isSchoolDay: true, reason: null, holidayTitle: null };
  const isToday = date === FIXTURE_TODAY;
  const isFuture = date > FIXTURE_TODAY;
  const reg = schoolDay.isSchoolDay && !isFuture ? storedRegister(cls.id, date) : { marks: {}, submittedAt: null, lastEditedAt: null, notifiedAbsent: [] };

  // The API's precedence: not_school_day > future > past (never staff) > not_class_teacher.
  let readOnlyReason: RegisterView["readOnlyReason"] = null;
  if (!schoolDay.isSchoolDay) readOnlyReason = "not_school_day";
  else if (isFuture) readOnlyReason = "future";
  else if (!isToday && !options.staff) readOnlyReason = "past";
  else if (cls.role !== "class_teacher" && !options.staff) readOnlyReason = "not_class_teacher";

  const students: RegisterStudent[] = studentsOf(cls.id).map((s) => {
    const leave = isToday && schoolDay.isSchoolDay ? (LEAVE_TODAY[s.id] ?? null) : null;
    const mark = reg.marks[s.id];
    return {
      id: s.id,
      name: s.name,
      firstName: s.first,
      admissionNumber: s.adm,
      avatarUrl: null,
      status: leave ? "on_leave" : (mark?.status ?? null),
      absenceReason: leave ? null : (mark?.absenceReason ?? null),
      note: leave ? null : (mark?.note ?? null),
      leave,
    };
  });

  return {
    class: { id: cls.id, name: cls.name },
    date,
    today: FIXTURE_TODAY,
    isToday,
    term: inTerm ? { ...FIXTURE_TERM } : null,
    schoolDay,
    closesAt: `${date}T10:00:00.000Z`,
    editableUntil: `${date}T15:00:00.000Z`,
    submittedAt: reg.submittedAt,
    submittedBy: reg.submittedAt ? { id: cls.id === "c1" ? "t-seyi" : "t-bola", name: cls.id === "c1" ? "Seyi Tinubu" : "Bola Ajayi" } : null,
    lastEditedAt: reg.lastEditedAt,
    inferred: false,
    access: readOnlyReason ? "view" : "edit",
    readOnlyReason,
    counts: countStudents(students),
    students,
  };
}

/**
 * The five tile counts for a list of register students.
 *
 * @param students - The students.
 * @returns The counts.
 */
function countStudents(students: readonly RegisterStudent[]): RegisterCounts {
  const counts: RegisterCounts = { present: 0, late: 0, absent: 0, onLeave: 0, unmarked: 0 };
  for (const s of students) {
    if (s.status === "present") counts.present++;
    else if (s.status === "late") counts.late++;
    else if (s.status === "absent") counts.absent++;
    else if (s.status === "on_leave") counts.onLeave++;
    else counts.unmarked++;
  }
  return counts;
}

/** What the fixture PUT throws on an incomplete submit (same shape as the API's 409 body). */
export class FixtureRegisterIncomplete extends Error {
  constructor(readonly missing: number) {
    super(`${missing} students still need a mark`);
  }
}

/**
 * `PUT /registers/:classId?date=` against the fixture store: drafts upsert,
 * a submit checks everyone not on leave is marked and counts the parents it
 * would notify.
 *
 * @param classId - The class.
 * @param date - The day; today when omitted.
 * @param body - The marks and whether to submit.
 * @returns The updated register view, with `notified` on a submit.
 * @throws FixtureRegisterIncomplete when a submit leaves students unmarked.
 */
export function saveRegisterFixture(classId: string, date: string = FIXTURE_TODAY, body: SaveRegisterBody): RegisterSaved {
  const reg = storedRegister(classId, date);
  const leave = date === FIXTURE_TODAY ? LEAVE_TODAY : {};
  for (const mark of body.marks) {
    if (leave[mark.studentId]) continue;
    reg.marks[mark.studentId] = {
      status: mark.status,
      absenceReason: mark.status === "absent" ? (mark.absenceReason ?? null) : null,
      note: mark.note ?? null,
    };
  }
  if (!body.submit) return { ...makeRegisterFixture(classId, date), notified: 0 };

  const missing = studentsOf(classId).filter((s) => !leave[s.id] && !reg.marks[s.id]).length;
  if (missing > 0) throw new FixtureRegisterIncomplete(missing);
  const absent = Object.entries(reg.marks).filter(([, m]) => m.status === "absent").map(([id]) => id);
  const notified = absent.filter((id) => !reg.notifiedAbsent.includes(id)).length;
  const now = new Date().toISOString();
  if (reg.submittedAt) reg.lastEditedAt = now;
  else reg.submittedAt = now;
  reg.notifiedAbsent = Array.from(new Set([...reg.notifiedAbsent, ...absent]));
  return { ...makeRegisterFixture(classId, date), notified };
}

/**
 * `GET /teachers/me/classes/:classId/students`.
 *
 * @param classId - `c1` or `c2`.
 * @returns The roster: JSS1 A's register is not submitted yet, JSS2 B's is (one absent).
 */
export function makeRosterFixture(classId: string): ClassRoster {
  const cls = CLASSES[classId as ClassKey] ?? CLASSES.c1;
  const students = studentsOf(cls.id);
  const rates = students.map((s) => rateOf(s.att)).filter((r): r is number => r !== null);
  const today = storedRegister(cls.id, FIXTURE_TODAY);
  const submitted = Boolean(today.submittedAt);
  const roster: RosterStudent[] = students.map((s) => ({
    id: s.id,
    name: s.name,
    firstName: s.first,
    admissionNumber: s.adm,
    email: s.email,
    avatarUrl: null,
    attendanceRateTerm: rateOf(s.att),
    guardian: NO_GUARDIAN.has(s.id) ? null : { userId: NO_ACCOUNT.has(s.id) ? null : `u-guardian-${s.id}`, name: s.guardian, relationship: s.relationship, phone: s.phone, email: s.guardianEmail },
  }));
  return {
    class: { id: cls.id, name: cls.name, role: cls.role, capacity: cls.capacity, studentCount: students.length },
    stats: {
      attendanceRateTerm: rates.length ? Math.round((rates.reduce((a, b) => a + b, 0) / rates.length) * 10) / 10 : null,
      absentToday: submitted ? Object.values(today.marks).filter((m) => m.status === "absent").length : null,
      registerSubmitted: submitted,
    },
    courses: makeMyClassesFixture().find((c) => c.id === cls.id)?.courses ?? [],
    students: roster,
  };
}

/**
 * A class with nobody in it, for the empty states.
 *
 * @returns The roster.
 */
export function makeEmptyRosterFixture(): ClassRoster {
  const base = makeRosterFixture("c1");
  return {
    ...base,
    class: { ...base.class, studentCount: 0 },
    stats: { attendanceRateTerm: null, absentToday: null, registerSubmitted: false },
    students: [],
  };
}

/**
 * The fixture's score for one student in one course and assessment.
 * JSS1 A Mathematics: 1st CA drafted for the first eight students.
 * JSS2 B Mathematics: 1st and 2nd CA published, the exam drafted (complete).
 * JSS2 B Further Mathematics: 1st CA drafted for half the class.
 *
 * @param courseId - The course.
 * @param assessmentId - The assessment.
 * @param index - The student's position in the seed (0-based).
 * @param inClass - The student's position in their class (0-based).
 * @returns The score and whether it is published, or null when not entered.
 */
function scoreFor(courseId: string, assessmentId: string, index: number, inClass: number): { score: number; published: boolean } | null {
  if (courseId === "k1") {
    const g1 = [16, 14, 18, 11, 19, 13, 15, 9];
    return assessmentId === "a1" && inClass < g1.length ? { score: g1[inClass], published: false } : null;
  }
  if (courseId === "k2") {
    const g2 = [17, 12, 15, 18, 10, 14, 16, 13, 19, 11];
    if (assessmentId === "a1") return { score: g2[inClass], published: true };
    if (assessmentId === "a2") return { score: 9 + ((index * 7 + 3 + 5) % 11), published: true };
    return { score: 28 + ((index * 13 + 7) % 31), published: false };
  }
  if (courseId === "k3" && assessmentId === "a1" && inClass < 5) return { score: 9 + ((index * 7 + 6) % 11), published: false };
  return null;
}

/**
 * The design's grade letters, on a percentage.
 *
 * @param percent - Total as a percentage.
 * @returns A to F.
 */
function letter(percent: number): string {
  return percent >= 70 ? "A" : percent >= 60 ? "B" : percent >= 50 ? "C" : percent >= 45 ? "D" : percent >= 40 ? "E" : "F";
}

/**
 * One student's scores in one course, with class averages, total, grade and
 * position the way section 14 describes them.
 *
 * @param courseId - The course.
 * @param student - The student.
 * @returns The course scores.
 */
function courseScores(courseId: keyof typeof COURSES, student: SeedStudent): StudentCourseScores {
  const course = COURSES[courseId];
  const mates = studentsOf(course.cls);
  const idx = (s: SeedStudent) => FIXTURE_STUDENTS.indexOf(s);
  const pos = (s: SeedStudent) => FIXTURE_STUDENTS.filter((x) => x.cls === s.cls).indexOf(s);
  const assessments = ASSESSMENTS.map((a) => {
    const mine = scoreFor(courseId, a.id, idx(student), pos(student));
    const all = mates.map((m) => scoreFor(courseId, a.id, idx(m), pos(m))).filter((x): x is { score: number; published: boolean } => x !== null);
    const avg = all.length ? Math.round((all.reduce((n, x) => n + x.score, 0) / all.length) * 10) / 10 : null;
    return {
      id: a.id,
      name: a.name,
      maxScore: a.maxScore,
      score: mine?.score ?? null,
      classAverage: avg,
      status: mine ? (mine.published ? "published" : "draft") : "not_entered",
    } as const;
  });
  const entered = assessments.filter((a) => a.score !== null);
  const complete = entered.length === assessments.length;
  const total = entered.length ? entered.reduce((n, a) => n + (a.score ?? 0), 0) : null;
  let position: StudentCourseScores["position"] = null;
  if (complete && total !== null) {
    const board = mates
      .map((m) => ASSESSMENTS.map((a) => scoreFor(courseId, a.id, idx(m), pos(m))))
      .filter((parts) => parts.every((p) => p !== null))
      .map((parts) => parts.reduce((n, p) => n + (p?.score ?? 0), 0))
      .sort((a, b) => b - a);
    position = { rank: board.indexOf(total) + 1, of: board.length };
  }
  return {
    course: { id: course.id, code: course.code, title: course.title },
    className: CLASSES[course.cls].name,
    assessments: [...assessments],
    total,
    grade: complete && total !== null ? letter(total) : null,
    position,
    complete,
  };
}

/**
 * `GET /teachers/me/students/:studentId` for a fixture student.
 *
 * @param studentId - `s1` … `s22`.
 * @returns The record, or null for an unknown id (the API answers 404).
 */
export function makeStudentRecordFixture(studentId: string): StudentRecord | null {
  const s = FIXTURE_STUDENTS.find((x) => x.id === studentId);
  if (!s) return null;
  const courseIds = (Object.keys(COURSES) as (keyof typeof COURSES)[]).filter((k) => COURSES[k].cls === s.cls);
  const [present, late, absent, onLeave] = s.att;
  return {
    student: {
      id: s.id,
      name: s.name,
      firstName: s.first,
      admissionNumber: s.adm,
      class: { id: s.cls, name: CLASSES[s.cls].name },
      dateOfBirth: s.dob,
      gender: s.gender,
      email: s.email,
      avatarUrl: null,
    },
    school: { name: FIXTURE_SCHOOL },
    guardian: NO_GUARDIAN.has(s.id)
      ? null
      : {
          userId: NO_ACCOUNT.has(s.id) ? null : `u-guardian-${s.id}`,
          name: s.guardian,
          relationship: s.relationship,
          // Nothing stores these on the API; it always answers null.
          occupation: null,
          email: s.guardianEmail,
          phone: s.phone,
          address: null,
        },
    attendance: { rate: rateOf(s.att), schoolDays: present + late + absent + onLeave, present, late, absent, onLeave },
    scores: courseIds.map((k) => courseScores(k, s)),
  };
}
