/**
 * Dev and test fixtures for the Grading page (Round 3, §15–23), in the
 * contract shapes of `src/types/grading.ts` and the "Round 3 as built"
 * behaviour (409 codes at the top level of the error body, unlock's answer,
 * `''` for an unwritten remark, the submission's `{ key, label }` basis).
 *
 * Mirrors the seed of `TALIM Redesign/Talim Teacher Portal.dc.html` and the
 * classes and students of `classroom.fixture.ts`: Seyi Tinubu is class
 * teacher of JSS1 A and teaches Mathematics there (MTH111, 1st CA drafted for
 * eight of twelve), and Mathematics (MTH211: 1st and 2nd CA published, the
 * exam drafted for everyone) and Further Mathematics (FMT201: 1st CA drafted
 * for five) in JSS2 B. JSS1 A's other subjects are taught by colleagues and
 * are published or not as the design shows. "Now" is `FIXTURE_NOW`.
 *
 * In fixture mode (`NEXT_PUBLIC_USE_FIXTURES=true`, dev only) saves, publishes,
 * unlocks, reminders, remarks and submissions write to an in-memory store, so
 * they survive navigation until the page is reloaded. Nothing in a
 * production build imports this file statically.
 */
import type { SchoolTerm } from "@/hooks/academic/useSchoolTerms";
import { DEFAULT_SCALE, competitionRanks, gradeFor, percentOf } from "@/hooks/grading/grading.logic";
import { ApiError, type ApiErrorBody } from "@/lib/apiError";
import { FIXTURE_STUDENTS, FIXTURE_TERM, makeMyClassesFixture } from "@/lib/fixtures/classroom.fixture";
import { FIXTURE_NOW } from "@/lib/fixtures/today.fixture";
import type {
  AssessmentStatus,
  Broadsheet,
  BroadsheetRow,
  ClassReadiness,
  CourseGradingSheet,
  GradingAssessment,
  GradingConflictBody,
  GradingStudent,
  PublishResult,
  ReminderResult,
  SaveRemarksBody,
  SaveScoresBody,
  TermRemarks,
  TermResultStatus,
  TermResultSubmission,
  UnlockResult,
} from "@/types/grading";

/**
 * `GET /academic-year-term/term/school`: this year's first term (current) and last year's third.
 *
 * @returns The terms.
 */
export function makeTermsFixture(): SchoolTerm[] {
  return [
    { _id: FIXTURE_TERM.id, name: FIXTURE_TERM.name, isActive: true, academicYearName: "2026/2027", startDate: FIXTURE_TERM.startDate, endDate: FIXTURE_TERM.endDate },
    { _id: "term-0", name: "Third term", isActive: false, academicYearName: "2025/2026", startDate: "2026-04-20", endDate: "2026-07-24" },
  ];
}

const ASSESSMENTS = [
  { id: "a1", name: "1st CA", type: "ca", maxScore: 20, dueDate: "2026-10-02" },
  { id: "a2", name: "2nd CA", type: "ca", maxScore: 20, dueDate: "2026-10-30" },
  { id: "a3", name: "Exam", type: "exam", maxScore: 60, dueDate: "2026-12-04" },
];

const TEACHER = { id: "teacher-seyi", name: "Seyi Tinubu" };

const MY_COURSES: Record<string, { id: string; code: string; title: string; classId: string }> = {
  k1: { id: "k1", code: "MTH111", title: "Mathematics", classId: "c1" },
  k2: { id: "k2", code: "MTH211", title: "Mathematics", classId: "c2" },
  k3: { id: "k3", code: "FMT201", title: "Further Mathematics", classId: "c2" },
};

/** JSS1 A's other subjects, taught by colleagues, with their status per assessment (the design's `others`). */
const OTHERS = [
  { id: "o1", code: "ENG111", title: "English Language", teacher: { id: "t-okoro", name: "Mrs. Adaeze Okoro" }, st: ["published", "not_started", "not_started"] },
  { id: "o2", code: "BSC111", title: "Basic Science", teacher: { id: "t-salami", name: "Mr. Tunji Salami" }, st: ["published", "not_started", "not_started"] },
  { id: "o3", code: "SST111", title: "Social Studies", teacher: { id: "t-ajayi", name: "Mrs. Bola Ajayi" }, st: ["draft", "not_started", "not_started"] },
  { id: "o4", code: "CMP111", title: "Computer Studies", teacher: { id: "t-adebayo", name: "Mr. Femi Adebayo" }, st: ["published", "not_started", "not_started"] },
] as const;

interface AssessmentState {
  status: AssessmentStatus;
  savedAt: string | null;
  publishedAt: string | null;
  unlockedAt: string | null;
  /** Scores at the unlock, to tell who changed on the republish. */
  snapshot: Record<string, number> | null;
}

interface Store {
  scores: Map<string, Record<string, number>>;
  states: Map<string, AssessmentState>;
  reminders: Map<string, string>;
  remarks: Map<string, string>;
  submissions: TermResultSubmission[];
  /** Colleagues' statuses, which a test may change. */
  others: Map<string, AssessmentStatus>;
}

let store: Store = seed();

/**
 * The students of a fixture class in seed order (the order the design's score seeds use).
 *
 * @param classId - `c1` or `c2`.
 * @returns The students.
 */
function seedOrder(classId: string) {
  return FIXTURE_STUDENTS.filter((s) => s.cls === classId);
}

/**
 * The starting store: the design's scores and statuses.
 *
 * @returns A fresh store.
 */
function seed(): Store {
  const scores = new Map<string, Record<string, number>>();
  const states = new Map<string, AssessmentState>();
  const blank = (): AssessmentState => ({ status: "not_started", savedAt: null, publishedAt: null, unlockedAt: null, snapshot: null });
  for (const k of Object.keys(MY_COURSES)) for (const a of ASSESSMENTS) states.set(`${k}|${a.id}`, blank());

  const c1 = seedOrder("c1");
  const g1 = [16, 14, 18, 11, 19, 13, 15, 9];
  scores.set("k1|a1", Object.fromEntries(g1.map((v, i) => [c1[i].id, v])));
  states.set("k1|a1", { ...blank(), status: "draft", savedAt: "2026-09-24T15:12:00.000Z" });

  const c2 = seedOrder("c2");
  const g2 = [17, 12, 15, 18, 10, 14, 16, 13, 19, 11];
  const index = (id: string) => FIXTURE_STUDENTS.findIndex((s) => s.id === id);
  scores.set("k2|a1", Object.fromEntries(c2.map((s, i) => [s.id, g2[i]])));
  scores.set("k2|a2", Object.fromEntries(c2.map((s) => [s.id, 9 + ((index(s.id) * 7 + 3 + 5) % 11)])));
  scores.set("k2|a3", Object.fromEntries(c2.map((s) => [s.id, 28 + ((index(s.id) * 13 + 7) % 31)])));
  states.set("k2|a1", { ...blank(), status: "published", savedAt: "2026-09-18T14:20:00.000Z", publishedAt: "2026-09-18T14:29:00.000Z" });
  states.set("k2|a2", { ...blank(), status: "published", savedAt: "2026-09-24T13:00:00.000Z", publishedAt: "2026-09-24T13:05:00.000Z" });
  states.set("k2|a3", { ...blank(), status: "draft", savedAt: "2026-09-25T08:10:00.000Z" });

  scores.set("k3|a1", Object.fromEntries(c2.slice(0, 5).map((s) => [s.id, 9 + ((index(s.id) * 7 + 6) % 11)])));
  states.set("k3|a1", { ...blank(), status: "draft", savedAt: "2026-09-23T13:00:00.000Z" });

  const others = new Map<string, AssessmentStatus>();
  for (const o of OTHERS) o.st.forEach((st, ai) => others.set(`${o.id}|${ASSESSMENTS[ai].id}`, st as AssessmentStatus));

  return {
    scores,
    states,
    reminders: new Map(),
    remarks: new Map([["s1", "A careful worker. Should read more widely."]]),
    submissions: [],
    others,
  };
}

/**
 * Puts the store back to the seed (tests).
 */
export function resetGradingFixtureStore(): void {
  store = seed();
}

/**
 * The API's error for a fixture failure, shaped as the backend sends it: the
 * standard envelope with `error.code` (`CONFLICT` for every 409), and a 409's
 * machine-readable fields (`code`, `missing`, `waitingOn`, `sentAt`,
 * `status`) at the top level of the body.
 *
 * @param status - The HTTP status.
 * @param message - The message.
 * @param extra - Top-level fields of the body.
 * @returns The error to throw.
 */
function fixtureError(status: number, message: string, extra: Partial<GradingConflictBody> = {}): ApiError {
  const code = status === 403 ? "FORBIDDEN" : status === 404 ? "NOT_FOUND" : status === 409 ? "CONFLICT" : "BAD_REQUEST";
  const body = { success: false, statusCode: status, message, error: { code, message }, ...extra };
  return ApiError.fromResponse({ status }, body as ApiErrorBody);
}

/**
 * Rounds to 1 decimal.
 *
 * @param n - A number.
 * @returns It, to 1 decimal.
 */
function r1(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * A course's class name.
 *
 * @param classId - The class.
 * @returns Its name.
 */
function className(classId: string): string {
  return makeMyClassesFixture().find((c) => c.id === classId)?.name ?? classId;
}

/**
 * The students of a class, by name.
 *
 * @param classId - The class.
 * @returns The students.
 */
function byName(classId: string) {
  return seedOrder(classId).sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * `GET /grading/course/:courseId?termId=`.
 *
 * @param courseId - `k1`, `k2` or `k3`; anything else answers 403 (a course the teacher does not teach).
 * @param termId - The term; last year's term has no assessments.
 * @returns The sheet.
 * @throws ApiError 403 for an unknown course.
 */
export function makeCourseSheetFixture(courseId: string, termId?: string): CourseGradingSheet {
  const course = MY_COURSES[courseId];
  if (!course) throw fixtureError(403, "You do not teach this course.");
  const pastTerm = termId && termId !== FIXTURE_TERM.id;
  const term = pastTerm ? { id: termId, name: makeTermsFixture().find((t) => t._id === termId)?.name ?? "Term" } : { id: FIXTURE_TERM.id, name: FIXTURE_TERM.name };
  const students = byName(course.classId);
  const passMark = 50;
  const assessments: GradingAssessment[] = pastTerm
    ? []
    : ASSESSMENTS.map((a) => {
        const st = store.states.get(`${courseId}|${a.id}`)!;
        const got = students.map((s) => store.scores.get(`${courseId}|${a.id}`)?.[s.id]).filter((v): v is number => v !== undefined);
        const pcts = got.map((v) => (v / a.maxScore) * 100);
        return {
          ...a,
          status: st.status,
          savedAt: st.savedAt,
          publishedAt: st.publishedAt,
          unlockedAt: st.unlockedAt,
          stats: {
            entered: got.length,
            total: students.length,
            average: pcts.length ? r1(pcts.reduce((x, y) => x + y, 0) / pcts.length) : null,
            highest: pcts.length ? r1(Math.max(...pcts)) : null,
            lowest: pcts.length ? r1(Math.min(...pcts)) : null,
            passRate: pcts.length ? r1((pcts.filter((p) => p >= passMark).length / pcts.length) * 100) : null,
          },
        };
      });
  const totalMax = assessments.reduce((n, a) => n + a.maxScore, 0);
  const rows: GradingStudent[] = students.map((s) => {
    const scores: Record<string, number | null> = {};
    for (const a of assessments) scores[a.id] = store.scores.get(`${courseId}|${a.id}`)?.[s.id] ?? null;
    const got = Object.values(scores).filter((v): v is number => v !== null);
    const total = got.length ? got.reduce((x, y) => x + y, 0) : null;
    const complete = assessments.length > 0 && got.length === assessments.length;
    const percent = total === null ? null : percentOf(total, totalMax);
    return {
      id: s.id,
      name: s.name,
      admissionNumber: s.adm,
      scores,
      total,
      percent,
      grade: complete && percent !== null ? gradeFor(percent, DEFAULT_SCALE) : null,
      position: null,
      complete,
    };
  });
  const ranks = competitionRanks(rows, (r) => (r.complete ? r.total : null));
  for (const r of rows) r.position = ranks.get(r) ?? null;
  return {
    course: { id: course.id, code: course.code, title: course.title },
    class: { id: course.classId, name: className(course.classId) },
    term,
    scale: DEFAULT_SCALE,
    passMark,
    assessments,
    totalMax,
    students: rows,
  };
}

/**
 * `PUT /grading/course/:courseId/assessments/:assessmentId/scores`.
 *
 * @param courseId - The course.
 * @param assessmentId - The assessment.
 * @param body - The scores; null deletes.
 * @returns The sheet after the save.
 * @throws ApiError 409 `{ code: 'LOCKED' }` while published; 400 for a score out of range.
 */
export function saveScoresFixture(courseId: string, assessmentId: string, body: SaveScoresBody): CourseGradingSheet {
  const key = `${courseId}|${assessmentId}`;
  const state = store.states.get(key);
  const assessment = ASSESSMENTS.find((a) => a.id === assessmentId);
  if (!state || !assessment) throw fixtureError(404, "Assessment not found");
  if (state.status === "published") throw fixtureError(409, "These scores are published and locked.", { code: "LOCKED" });
  for (const s of body.scores) {
    if (s.score !== null && (s.score < 0 || s.score > assessment.maxScore)) throw fixtureError(400, `Scores must be between 0 and ${assessment.maxScore}.`);
  }
  const current = { ...(store.scores.get(key) ?? {}) };
  for (const s of body.scores) {
    if (s.score === null) delete current[s.studentId];
    else current[s.studentId] = s.score;
  }
  store.scores.set(key, current);
  const any = Object.keys(current).length > 0;
  store.states.set(key, {
    ...state,
    status: state.status === "unlocked" ? "unlocked" : any ? "draft" : "not_started",
    savedAt: FIXTURE_NOW,
  });
  return makeCourseSheetFixture(courseId, body.termId);
}

/**
 * `POST /grading/course/:courseId/assessments/:assessmentId/publish`.
 *
 * @param courseId - The course.
 * @param assessmentId - The assessment.
 * Publishing scores that are already published is a no-op answering the last
 * `publishedAt`, `changed: []` and `notified: 0`, as the server does.
 *
 * @param courseId - The course.
 * @param assessmentId - The assessment.
 * @returns When, whose scores it published (every student on a first publish,
 *   the changed ones on a republish), and how many people were told (each
 *   fixture student and one parent).
 * @throws ApiError 409 `{ missing: studentIds }` while a student has no score.
 */
export function publishFixture(courseId: string, assessmentId: string): PublishResult {
  const key = `${courseId}|${assessmentId}`;
  const state = store.states.get(key);
  const course = MY_COURSES[courseId];
  if (!state || !course) throw fixtureError(404, "Assessment not found");
  if (state.status === "published") return { publishedAt: state.publishedAt ?? FIXTURE_NOW, changed: [], notified: 0 };
  const students = byName(course.classId);
  const scores = store.scores.get(key) ?? {};
  const missing = students.filter((s) => scores[s.id] === undefined).map((s) => s.id);
  if (missing.length) throw fixtureError(409, `${missing.length} students have no score.`, { missing });
  const changed = state.snapshot ? students.filter((s) => state.snapshot?.[s.id] !== scores[s.id]).map((s) => s.id) : students.map((s) => s.id);
  store.states.set(key, { ...state, status: "published", publishedAt: FIXTURE_NOW, snapshot: null });
  return { publishedAt: FIXTURE_NOW, changed, notified: changed.length * 2 };
}

/**
 * `POST /grading/course/:courseId/assessments/:assessmentId/unlock`.
 *
 * @param courseId - The course.
 * @param assessmentId - The assessment.
 * @returns `{ status: 'unlocked', unlockedAt }`.
 * @throws ApiError 409 `NOT_PUBLISHED` unless it is published.
 */
export function unlockFixture(courseId: string, assessmentId: string): UnlockResult {
  const key = `${courseId}|${assessmentId}`;
  const state = store.states.get(key);
  if (!state) throw fixtureError(404, "Assessment not found");
  if (state.status !== "published") throw fixtureError(409, "Only published scores can be unlocked.", { code: "NOT_PUBLISHED" });
  store.states.set(key, { ...state, status: "unlocked", unlockedAt: FIXTURE_NOW, snapshot: { ...(store.scores.get(key) ?? {}) } });
  return { status: "unlocked", unlockedAt: FIXTURE_NOW };
}

/** One subject of JSS1 A as the class report sees it. */
interface ReportSubject {
  id: string;
  code: string;
  title: string;
  teacher: { id: string; name: string } | null;
  isMine: boolean;
  status: (assessmentId: string) => AssessmentStatus;
  /** Published score of a student, or null. */
  score: (studentId: string, assessmentId: string) => number | null;
}

/**
 * JSS1 A's subjects: Mathematics (the caller's, from the store) and the colleagues'.
 *
 * @returns The subjects.
 */
function reportSubjects(): ReportSubject[] {
  const mine: ReportSubject = {
    id: "k1",
    code: "MTH111",
    title: "Mathematics",
    teacher: TEACHER,
    isMine: true,
    status: (a) => store.states.get(`k1|${a}`)?.status ?? "not_started",
    score: (s, a) => (store.states.get(`k1|${a}`)?.status === "published" || store.states.get(`k1|${a}`)?.status === "unlocked" ? (store.scores.get(`k1|${a}`)?.[s] ?? null) : null),
  };
  const others = OTHERS.map((o, oi): ReportSubject => ({
    id: o.id,
    code: o.code,
    title: o.title,
    teacher: o.teacher,
    isMine: false,
    status: (a) => store.others.get(`${o.id}|${a}`) ?? "not_started",
    score: (s, a) => {
      const st = store.others.get(`${o.id}|${a}`);
      if (st !== "published" && st !== "unlocked") return null;
      const i = FIXTURE_STUDENTS.findIndex((x) => x.id === s);
      const idx = oi + 1;
      const ai = ASSESSMENTS.findIndex((x) => x.id === a);
      return a === "a3" ? 22 + ((i * 11 + idx * 7) % 37) : 5 + ((i * 5 + idx * 3 + ai * 7) % 15);
    },
  }));
  return [mine, ...others];
}

/**
 * Throws the 403 a class the caller is not class teacher of answers with.
 *
 * @param classId - The class.
 * @throws ApiError 403 for anything but JSS1 A.
 */
function assertClassTeacher(classId: string): void {
  if (classId !== "c1") throw fixtureError(403, "Only the class teacher can open the class report.");
}

/**
 * `GET /grading/classes/:classId/readiness?termId=`.
 *
 * @param classId - `c1` (the caller is its class teacher); anything else answers 403.
 * @returns The readiness table.
 * @throws ApiError 403 for another class.
 */
export function makeReadinessFixture(classId: string): ClassReadiness {
  assertClassTeacher(classId);
  return {
    class: { id: "c1", name: className("c1") },
    term: { id: FIXTURE_TERM.id, name: FIXTURE_TERM.name },
    assessments: ASSESSMENTS.map((a) => ({ id: a.id, name: a.name, maxScore: a.maxScore })),
    subjects: reportSubjects().map((s) => ({
      course: { id: s.id, code: s.code, title: s.title },
      teacher: s.teacher,
      isMine: s.isMine,
      cells: ASSESSMENTS.map((a) => ({ assessmentId: a.id, status: s.status(a.id), reminderSentAt: store.reminders.get(`${s.id}|${a.id}`) ?? null })),
    })),
  };
}

/**
 * `POST /grading/classes/:classId/reminders`.
 *
 * @param classId - The class.
 * @param body - The course and assessment.
 * @param body.courseId - The colleague's course.
 * @param body.assessmentId - The assessment.
 * @returns When it was sent.
 * @throws ApiError 409 `ALREADY_REMINDED` (with the earlier `sentAt`) when already sent today, `PUBLISHED` once published.
 */
export function sendReminderFixture(classId: string, body: { courseId: string; assessmentId: string }): ReminderResult {
  assertClassTeacher(classId);
  const key = `${body.courseId}|${body.assessmentId}`;
  const earlier = store.reminders.get(key);
  if (earlier) throw fixtureError(409, "A reminder was already sent today.", { code: "ALREADY_REMINDED", sentAt: earlier });
  if (store.others.get(key) === "published") throw fixtureError(409, "These scores are already published.", { code: "PUBLISHED" });
  store.reminders.set(key, FIXTURE_NOW);
  return { sentAt: FIXTURE_NOW };
}

/**
 * `GET /grading/classes/:classId/broadsheet?termId=&basis=`.
 *
 * @param classId - `c1`.
 * @param basis - An assessment id or `total`.
 * @returns The broadsheet (published scores only).
 * @throws ApiError 403 for another class.
 */
export function makeBroadsheetFixture(classId: string, basis: string): Broadsheet {
  assertClassTeacher(classId);
  const subjects = reportSubjects();
  const assessment = ASSESSMENTS.find((a) => a.id === basis);
  const isTotal = !assessment;
  const published = (s: ReportSubject) =>
    isTotal ? ASSESSMENTS.every((a) => s.status(a.id) === "published") : s.status(basis) === "published";
  const cell = (s: ReportSubject, studentId: string): number | null => {
    if (!published(s)) return null;
    if (!isTotal) return s.score(studentId, basis);
    const parts = ASSESSMENTS.map((a) => s.score(studentId, a.id));
    if (parts.some((p) => p === null)) return null;
    return percentOf((parts as number[]).reduce((x, y) => x + y, 0), 100);
  };
  const max = assessment?.maxScore ?? null;
  const rows: BroadsheetRow[] = byName("c1").map((st) => {
    const cells = subjects.map((s) => cell(s, st.id));
    const got = cells.filter((v): v is number => v !== null);
    const pcts = got.map((v) => (max ? (v / max) * 100 : v));
    const average = pcts.length ? r1(pcts.reduce((x, y) => x + y, 0) / pcts.length) : null;
    return {
      student: { id: st.id, name: st.name, admissionNumber: st.adm },
      cells,
      total: got.length ? r1(got.reduce((x, y) => x + y, 0)) : null,
      average,
      position: null,
      grade: average === null ? null : gradeFor(average, DEFAULT_SCALE),
      publishedCount: got.length,
    };
  });
  const ranks = competitionRanks(rows, (r) => r.average);
  for (const r of rows) r.position = ranks.get(r) ?? null;
  const waitingOn = subjects.filter((s) => !published(s)).map((s) => ({ courseId: s.id, title: s.title }));
  return {
    class: { id: "c1", name: className("c1") },
    term: { id: FIXTURE_TERM.id, name: FIXTURE_TERM.name },
    basis: { key: isTotal ? "total" : basis, label: assessment?.name ?? "Term total", maxPerSubject: max },
    scale: DEFAULT_SCALE,
    passMark: 50,
    subjects: subjects.map((s) => ({ courseId: s.id, code: s.code, title: s.title, published: published(s) })),
    rows,
    ready: waitingOn.length === 0,
    waitingOn,
  };
}

/**
 * `GET /grading/classes/:classId/remarks?termId=`: averages over every
 * published score so far.
 *
 * @param classId - `c1`.
 * @returns The rows.
 * @throws ApiError 403 for another class.
 */
export function makeRemarksFixture(classId: string): TermRemarks {
  assertClassTeacher(classId);
  const subjects = reportSubjects();
  const rows = byName("c1").map((st) => {
    const perSubject = subjects
      .map((s) => {
        const got = ASSESSMENTS.map((a) => ({ a, v: s.score(st.id, a.id) })).filter((x) => x.v !== null);
        if (!got.length) return null;
        return (got.reduce((n, x) => n + (x.v as number), 0) / got.reduce((n, x) => n + x.a.maxScore, 0)) * 100;
      })
      .filter((v): v is number => v !== null);
    return {
      student: { id: st.id, name: st.name, admissionNumber: st.adm },
      position: null as { rank: number; of: number } | null,
      average: perSubject.length ? r1(perSubject.reduce((x, y) => x + y, 0) / perSubject.length) : null,
      publishedCount: perSubject.length,
      subjectCount: subjects.length,
      classTeacherRemark: store.remarks.get(st.id) ?? "",
      principalRemark: st.id === "s1" ? "A pleasure to have in the school. Keep it up." : "",
    };
  });
  const ranks = competitionRanks(rows, (r) => r.average);
  for (const r of rows) r.position = ranks.get(r) ?? null;
  return { rows };
}

/**
 * `PUT /grading/classes/:classId/remarks`.
 *
 * @param classId - `c1`.
 * @param body - The remarks.
 * @returns The rows after the save.
 * @throws ApiError 409 `RESULTS_SUBMITTED` / `RESULTS_PUBLISHED` while the term results are with the office or published; 400 over 500 characters.
 */
export function saveRemarksFixture(classId: string, body: SaveRemarksBody): TermRemarks {
  assertClassTeacher(classId);
  const mine = store.submissions.filter((s) => s.class.id === classId);
  if (mine.some((s) => s.status === "published")) throw fixtureError(409, "The term results are published.", { code: "RESULTS_PUBLISHED" });
  if (mine.some((s) => s.status === "submitted")) {
    throw fixtureError(409, "Remarks are locked while the term results are with the school office.", { code: "RESULTS_SUBMITTED" });
  }
  for (const r of body.remarks) {
    if (r.classTeacherRemark.length > 500) throw fixtureError(400, "A remark can be at most 500 characters.");
  }
  for (const r of body.remarks) store.remarks.set(r.studentId, r.classTeacherRemark.trim());
  return makeRemarksFixture(classId);
}

/**
 * `GET /grading/classes/:classId/term-results?termId=`.
 *
 * @param classId - `c1`.
 * @returns The class's submissions.
 * @throws ApiError 403 for another class.
 */
export function makeTermResultsFixture(classId: string): TermResultSubmission[] {
  assertClassTeacher(classId);
  return store.submissions.filter((s) => s.class.id === classId);
}

/**
 * A submission as the API answers it, for JSS1 A.
 *
 * @param basis - An assessment id or `total`.
 * @param status - Its status.
 * @param extra - The dates, people and reason that differ from a fresh submission.
 * @returns The submission.
 */
function submissionOf(basis: string, status: TermResultStatus, extra: Partial<TermResultSubmission> = {}): TermResultSubmission {
  const students = byName("c1");
  return {
    id: `tr-c1-${basis}`,
    class: { id: "c1", name: className("c1") },
    term: { id: FIXTURE_TERM.id, name: FIXTURE_TERM.name },
    basis: { key: basis, label: ASSESSMENTS.find((a) => a.id === basis)?.name ?? "Term total" },
    status,
    submittedAt: FIXTURE_NOW,
    submittedBy: TEACHER,
    studentCount: students.length,
    missingRemarks: students.filter((s) => !(store.remarks.get(s.id) ?? "").trim()).length,
    returnReason: null,
    returnedAt: null,
    returnedBy: null,
    publishedAt: null,
    publishedBy: null,
    ...extra,
  };
}

/**
 * `POST /grading/classes/:classId/term-results`.
 *
 * @param classId - `c1`.
 * @param basis - An assessment id or `total`.
 * @returns The submission (a returned one is reused, keeping its return as history).
 * @throws ApiError 409 `{ waitingOn }` unless every subject has published the basis; `ALREADY_SUBMITTED` / `ALREADY_PUBLISHED`.
 */
export function submitTermResultsFixture(classId: string, basis: string): TermResultSubmission {
  const sheet = makeBroadsheetFixture(classId, basis);
  const existing = store.submissions.find((s) => s.class.id === classId && s.basis.key === sheet.basis.key);
  if (existing?.status === "submitted") throw fixtureError(409, "Already with the school office.", { code: "ALREADY_SUBMITTED", status: "submitted" });
  if (existing?.status === "published") throw fixtureError(409, "Already published.", { code: "ALREADY_PUBLISHED", status: "published" });
  if (!sheet.ready) throw fixtureError(409, "Some subjects have not published yet.", { waitingOn: sheet.waitingOn });
  const submission = submissionOf(sheet.basis.key, "submitted", {
    returnReason: existing?.returnReason ?? null,
    returnedAt: existing?.returnedAt ?? null,
    returnedBy: existing?.returnedBy ?? null,
  });
  store.submissions = [...store.submissions.filter((s) => s !== existing), submission];
  return submission;
}

/**
 * Test helper: sets a colleague's status for an assessment in JSS1 A.
 *
 * @param courseId - `o1` … `o4`.
 * @param assessmentId - `a1` … `a3`.
 * @param status - The new status.
 */
export function setOtherSubjectStatusFixture(courseId: string, assessmentId: string, status: AssessmentStatus): void {
  store.others.set(`${courseId}|${assessmentId}`, status);
}

/**
 * Test helper: stores a submission in a given state.
 *
 * @param basis - An assessment id or `total`.
 * @param status - Its status.
 * @param reason - The office's reason, for `returned`.
 * @returns The submission.
 */
export function setTermResultFixture(basis: string, status: TermResultStatus, reason?: string): TermResultSubmission {
  const submission = submissionOf(basis, status, {
    submittedAt: "2026-09-24T10:00:00.000Z",
    returnedAt: status === "returned" ? "2026-09-25T08:00:00.000Z" : null,
    returnedBy: status === "returned" ? { id: "admin-1", name: "School office" } : null,
    returnReason: status === "returned" ? (reason ?? null) : null,
    publishedAt: status === "published" ? "2026-09-25T08:00:00.000Z" : null,
    publishedBy: status === "published" ? { id: "admin-1", name: "School office" } : null,
  });
  store.submissions = [...store.submissions.filter((s) => s.basis.key !== basis), submission];
  return submission;
}
