/**
 * Dev and test fixtures for the redesigned Subjects page
 * (`GET /scheme-of-work/me`, `GET|PUT /scheme-of-work/course/:courseId…`,
 * the taught toggle, `GET /resources/course/:courseId`, `POST /resources`,
 * `DELETE /resources/:id` and the legacy `GET /curriculum/:id`), in the
 * shapes of `src/types/subjects.ts`.
 *
 * Mirrors the seed of `TALIM Redesign/Talim Teacher Portal.dc.html`: Seyi
 * Tinubu teaches Mathematics · JSS1 A (k1, MTH111), Mathematics · JSS2 B
 * (k2, MTH211) and Further Mathematics · JSS2 B (k3, FMT201). The first term
 * (`term-1`) has 12 weeks and it is week 3 (Friday 25 September 2026, see
 * `today.fixture.ts`). Every course has the design's 12 topics, objectives
 * for weeks 1–6 only, and weeks 1–2 taught. Resources r1–r4 are the design's.
 * Mathematics · JSS1 A also has an old text curriculum ("Earlier notes").
 * Lessons a week are counted from the app's timetable fixture.
 *
 * In fixture mode (`NEXT_PUBLIC_USE_FIXTURES=true`, dev only) saves, taught
 * toggles, uploads and removals write to an in-memory store, so they survive
 * navigation until the page is reloaded. Nothing in a production build
 * imports this file statically.
 */
import { FIXTURE_STUDENTS, FIXTURE_TERM } from "@/lib/fixtures/classroom.fixture";
import { fixtureWeekLessons } from "@/lib/fixtures/today.fixture";
import type { Curriculum } from "@/hooks/curriculum/types";
import type {
  CourseResource,
  CreateCourseResourceBody,
  MarkWeekTaughtBody,
  ResourceKind,
  SaveSchemeWeekBody,
  SchemeOfWork,
  SchemeWeek,
  SubjectCard,
  WeekTaughtResult,
} from "@/types/subjects";

/** The past term in `makeTermsFixture` (grading fixture): every week taught, no current week. */
export const FIXTURE_PAST_TERM = { id: "term-0", name: "Third term" };
/** Weeks in each fixture term. */
export const FIXTURE_TOTAL_WEEKS = 12;
/** The week "today" falls in, in the first term. */
export const FIXTURE_CURRENT_WEEK = 3;
/** The id of Mathematics · JSS1 A's old text curriculum. */
export const FIXTURE_LEGACY_CURRICULUM_ID = "cur-k1";

type CourseKey = "k1" | "k2" | "k3";

const CLASSES = {
  c1: { id: "c1", name: "JSS1 A" },
  c2: { id: "c2", name: "JSS2 B" },
} as const;

const COURSES: Record<CourseKey, { id: CourseKey; code: string; title: string; cls: keyof typeof CLASSES }> = {
  k1: { id: "k1", code: "MTH111", title: "Mathematics", cls: "c1" },
  k2: { id: "k2", code: "MTH211", title: "Mathematics", cls: "c2" },
  k3: { id: "k3", code: "FMT201", title: "Further Mathematics", cls: "c2" },
};

/** The design's 12 topics per course. */
export const FIXTURE_TOPICS: Record<CourseKey, readonly string[]> = {
  k1: [
    "Whole numbers and place value",
    "Factors, multiples and primes",
    "Fractions: types and equivalence",
    "Adding and subtracting fractions",
    "Decimals and percentages",
    "Approximation and estimation",
    "Mid-term review",
    "Letters for numbers",
    "Simple equations",
    "Angles and lines",
    "Plane shapes and perimeter",
    "Revision and examination",
  ],
  k2: [
    "Number bases",
    "Directed numbers",
    "Indices and standard form",
    "Algebraic expressions",
    "Expansion and factorisation",
    "Simple linear equations",
    "Mid-term review",
    "Linear inequalities",
    "Angles in polygons",
    "Area of plane shapes",
    "Presenting data",
    "Revision and examination",
  ],
  k3: [
    "Sets and Venn diagrams",
    "Logic and truth tables",
    "Binary operations",
    "Surds",
    "Functions and mappings",
    "Quadratic expressions",
    "Mid-term review",
    "Sequences and series",
    "Introduction to matrices",
    "Determinants",
    "Vectors in two dimensions",
    "Revision and examination",
  ],
};

/**
 * The design's objectives line for a topic.
 *
 * @param topic - The week's topic.
 * @returns "Students should be able to explain … without help."
 */
function objectivesFor(topic: string): string {
  return `Students should be able to explain ${topic.charAt(0).toLowerCase()}${topic.slice(1)} and work the related textbook exercises without help.`;
}

/** When the seeded taught weeks were marked (the Friday of each week, 3pm in Lagos). */
const SEED_TAUGHT_AT: Record<number, string> = {
  1: "2026-09-11T14:00:00.000Z",
  2: "2026-09-18T14:00:00.000Z",
};

/** The design's four resources, as the reads answer them (`id` beside `_id`, populated references). */
const SEED_RESOURCES: readonly CourseResource[] = [
  {
    _id: "r1",
    id: "r1",
    name: "Place value worksheet",
    courseId: { _id: "k1", title: "Mathematics" },
    classId: { _id: "c1", name: "JSS1 A" },
    termId: { _id: FIXTURE_TERM.id, name: FIXTURE_TERM.name },
    week: 1,
    kind: "pdf",
    mimeType: "application/pdf",
    sizeBytes: 420 * 1024,
    uploadDate: "2026-09-08T09:10:00.000Z",
    viewCount: 11,
    visibility: "students_and_parents",
    image: "https://res.cloudinary.com/talim-fixture/raw/upload/place-value-worksheet.pdf",
    files: ["https://res.cloudinary.com/talim-fixture/raw/upload/place-value-worksheet.pdf"],
  },
  {
    _id: "r2",
    id: "r2",
    name: "Factors and multiples slides",
    courseId: { _id: "k1", title: "Mathematics" },
    classId: { _id: "c1", name: "JSS1 A" },
    termId: { _id: FIXTURE_TERM.id, name: FIXTURE_TERM.name },
    week: 2,
    kind: "slides",
    mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    sizeBytes: Math.round(2.1 * 1024 * 1024),
    uploadDate: "2026-09-15T10:30:00.000Z",
    viewCount: 9,
    visibility: "students",
    image: "https://res.cloudinary.com/talim-fixture/raw/upload/factors-and-multiples.pptx",
    files: ["https://res.cloudinary.com/talim-fixture/raw/upload/factors-and-multiples.pptx"],
  },
  {
    _id: "r3",
    id: "r3",
    name: "Directed numbers practice set",
    courseId: { _id: "k2", title: "Mathematics" },
    classId: { _id: "c2", name: "JSS2 B" },
    termId: { _id: FIXTURE_TERM.id, name: FIXTURE_TERM.name },
    week: 2,
    kind: "pdf",
    mimeType: "application/pdf",
    sizeBytes: 310 * 1024,
    uploadDate: "2026-09-16T08:45:00.000Z",
    viewCount: 10,
    visibility: "students",
    image: "https://res.cloudinary.com/talim-fixture/raw/upload/directed-numbers.pdf",
    files: ["https://res.cloudinary.com/talim-fixture/raw/upload/directed-numbers.pdf"],
  },
  {
    _id: "r4",
    id: "r4",
    name: "Truth tables explained",
    courseId: { _id: "k3", title: "Further Mathematics" },
    classId: { _id: "c2", name: "JSS2 B" },
    termId: { _id: FIXTURE_TERM.id, name: FIXTURE_TERM.name },
    week: 2,
    kind: "video",
    mimeType: "video/mp4",
    sizeBytes: 38 * 1024 * 1024,
    uploadDate: "2026-09-17T13:20:00.000Z",
    viewCount: 6,
    visibility: "students",
    image: "https://res.cloudinary.com/talim-fixture/video/upload/truth-tables.mp4",
    files: ["https://res.cloudinary.com/talim-fixture/video/upload/truth-tables.mp4"],
  },
];

/** Fixture-mode writes. Week keys are `courseId|termId|week`. */
const store = {
  weeks: new Map<string, { topic: string; objectives: string }>(),
  taught: new Map<string, string | null>(),
  added: [] as CourseResource[],
  removed: new Set<string>(),
  nextId: 1,
};

/**
 * Clears everything saved, toggled, uploaded or removed in fixture mode (tests).
 */
export function resetSubjectsFixtureStore(): void {
  store.weeks.clear();
  store.taught.clear();
  store.added = [];
  store.removed.clear();
  store.nextId = 1;
}

/**
 * Whether an id is one of the fixture teacher's courses.
 *
 * @param courseId - Any id.
 * @returns True for k1, k2 and k3.
 */
function isCourse(courseId: string): courseId is CourseKey {
  return Object.prototype.hasOwnProperty.call(COURSES, courseId);
}

/**
 * The term a request means: the past term by its id, else the current one.
 *
 * @param termId - The requested term, if any.
 * @returns The term and whether it is the current one.
 */
function termOf(termId: string | undefined): { id: string; name: string; current: boolean } {
  if (termId === FIXTURE_PAST_TERM.id) return { ...FIXTURE_PAST_TERM, current: false };
  return { id: FIXTURE_TERM.id, name: FIXTURE_TERM.name, current: true };
}

/**
 * The id of a populated-or-bare reference.
 *
 * @param ref - The reference.
 * @returns Its id, or an empty string.
 */
function idOf(ref: CourseResource["courseId"]): string {
  if (!ref) return "";
  return typeof ref === "string" ? ref : (ref._id ?? ref.id ?? "");
}

/**
 * Every resource in the fixture store, seed first then uploads, less removals.
 *
 * @returns The resources.
 */
function allResources(): CourseResource[] {
  return [...SEED_RESOURCES, ...store.added].filter((r) => !store.removed.has(r._id)).map((r) => ({ ...r }));
}

/**
 * Lessons a week of a course, counted from the app's timetable fixture.
 *
 * @param courseId - The course.
 * @returns The count.
 */
function lessonsPerWeek(courseId: string): number {
  return fixtureWeekLessons().filter((l) => l.course.id === courseId).length;
}

/**
 * Students in a class, from the classroom fixture.
 *
 * @param classId - The class.
 * @returns The count.
 */
function studentCount(classId: string): number {
  return FIXTURE_STUDENTS.filter((s) => s.cls === classId).length;
}

/**
 * One week of a course's scheme, with the store's edits and taught toggles.
 *
 * @param courseId - The course.
 * @param term - The term.
 * @param week - 1 to {@link FIXTURE_TOTAL_WEEKS}.
 * @returns The week.
 */
function weekOf(courseId: CourseKey, term: { id: string; current: boolean }, week: number): SchemeWeek {
  const key = `${courseId}|${term.id}|${week}`;
  const seedTopic = FIXTURE_TOPICS[courseId][week - 1] ?? "";
  const seeded = { topic: seedTopic, objectives: !term.current || week <= 6 ? objectivesFor(seedTopic) : "" };
  const written = store.weeks.get(key) ?? seeded;
  const seedTaught = term.current ? (SEED_TAUGHT_AT[week] ?? null) : "2026-07-24T14:00:00.000Z";
  const taughtAt = store.taught.has(key) ? (store.taught.get(key) ?? null) : seedTaught;
  const resourceCount = allResources().filter((r) => idOf(r.courseId) === courseId && idOf(r.termId) === term.id && r.week === week).length;
  return { week, topic: written.topic, objectives: written.objectives, taughtAt, resourceCount };
}

/**
 * `GET /scheme-of-work/course/:courseId?termId=` as the fixture teacher sees it.
 *
 * @param courseId - k1, k2 or k3.
 * @param termId - `term-1` (default) or `term-0` (past: every week taught, no current week).
 * @returns The scheme, or null for a course the teacher does not teach (the API answers 403).
 */
export function makeSchemeFixture(courseId: string, termId?: string): SchemeOfWork | null {
  if (!isCourse(courseId)) return null;
  const course = COURSES[courseId];
  const term = termOf(termId);
  return {
    course: { id: course.id, code: course.code, title: course.title, className: CLASSES[course.cls].name },
    term: { id: term.id, name: term.name },
    totalWeeks: FIXTURE_TOTAL_WEEKS,
    currentWeek: term.current ? FIXTURE_CURRENT_WEEK : null,
    weeks: Array.from({ length: FIXTURE_TOTAL_WEEKS }, (_, i) => weekOf(courseId, term, i + 1)),
  };
}

/**
 * `GET /scheme-of-work/me?termId=`: one card per course.
 *
 * @param termId - `term-1` (default) or `term-0`.
 * @returns The three cards, in the design's order.
 */
export function makeSubjectCardsFixture(termId?: string): SubjectCard[] {
  const term = termOf(termId);
  return (Object.keys(COURSES) as CourseKey[]).map((key) => {
    const course = COURSES[key];
    const scheme = makeSchemeFixture(key, term.id)!;
    return {
      course: { id: course.id, code: course.code, title: course.title },
      class: { ...CLASSES[course.cls] },
      studentCount: studentCount(course.cls),
      lessonsPerWeek: lessonsPerWeek(key),
      totalWeeks: scheme.totalWeeks,
      currentWeek: scheme.currentWeek,
      taughtCount: scheme.weeks.filter((w) => w.taughtAt).length,
      resourceCount: allResources().filter((r) => idOf(r.courseId) === key && idOf(r.termId) === term.id).length,
      legacyCurriculum: key === "k1" && term.current ? { id: FIXTURE_LEGACY_CURRICULUM_ID, updatedAt: "2026-07-10T09:00:00.000Z" } : null,
    };
  });
}

/**
 * A teacher with no subjects this term.
 *
 * @returns No cards.
 */
export function makeNoSubjectsFixture(): SubjectCard[] {
  return [];
}

/**
 * The Resources tab of a course with nothing shared yet.
 *
 * @returns No resources.
 */
export function makeNoResourcesFixture(): CourseResource[] {
  return [];
}

/**
 * `PUT /scheme-of-work/course/:courseId/weeks/:week` against the store.
 *
 * @param courseId - The course.
 * @param week - The week.
 * @param body - Topic, objectives and optional term.
 * @returns The whole scheme after the save, or null for a course the teacher does not teach.
 */
export function saveSchemeWeekFixture(courseId: string, week: number, body: SaveSchemeWeekBody): SchemeOfWork | null {
  if (!isCourse(courseId)) return null;
  const term = termOf(body.termId);
  store.weeks.set(`${courseId}|${term.id}|${week}`, { topic: body.topic, objectives: body.objectives });
  return makeSchemeFixture(courseId, term.id);
}

/**
 * `POST /scheme-of-work/course/:courseId/weeks/:week/taught` against the store.
 *
 * @param courseId - The course.
 * @param week - The week.
 * @param body - `{ taught, termId? }`.
 * @returns `{ week, taughtAt }`, or null for a course the teacher does not teach.
 */
export function setWeekTaughtFixture(courseId: string, week: number, body: MarkWeekTaughtBody): WeekTaughtResult | null {
  if (!isCourse(courseId)) return null;
  const term = termOf(body.termId);
  const taughtAt = body.taught ? new Date().toISOString() : null;
  store.taught.set(`${courseId}|${term.id}|${week}`, taughtAt);
  return { week, taughtAt };
}

/**
 * `GET /resources/course/:courseId`: every resource of the course, any term.
 *
 * @param courseId - The course.
 * @returns The resources, oldest first.
 */
export function makeCourseResourcesFixture(courseId: string): CourseResource[] {
  return allResources().filter((r) => idOf(r.courseId) === courseId);
}

/**
 * The kind the server would derive from a MIME type.
 *
 * @param mimeType - The file's type.
 * @returns The kind.
 */
function kindOfMime(mimeType: string): ResourceKind {
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("image/")) return "image";
  if (/presentation|powerpoint/.test(mimeType)) return "slides";
  if (/word|document|text\//.test(mimeType)) return "doc";
  return "other";
}

/**
 * `POST /resources` against the store.
 *
 * @param body - The resource.
 * @returns The created resource, with no views yet.
 */
export function createResourceFixture(body: CreateCourseResourceBody): CourseResource {
  const id = `r-new-${store.nextId++}`;
  // As the create response: `id` beside `_id`, and bare (unpopulated) references.
  const created: CourseResource = {
    _id: id,
    id,
    name: body.name,
    courseId: body.courseId,
    classId: body.classId,
    termId: body.termId,
    week: body.week ?? null,
    kind: body.kind ?? kindOfMime(body.mimeType),
    mimeType: body.mimeType,
    sizeBytes: body.sizeBytes,
    uploadDate: body.uploadDate ?? new Date().toISOString(),
    createdAt: new Date().toISOString(),
    viewCount: 0,
    visibility: body.visibility,
    image: body.image ?? body.files[0] ?? null,
    files: [...body.files],
  };
  store.added.push(created);
  return { ...created };
}

/**
 * `DELETE /resources/:id` against the store.
 *
 * @param id - The resource.
 * @returns False when there is no such resource (the API answers 404).
 */
export function removeResourceFixture(id: string): boolean {
  if (!allResources().some((r) => r._id === id)) return false;
  store.removed.add(id);
  return true;
}

/**
 * `GET /curriculum/:id` for the old text curriculum of Mathematics · JSS1 A.
 *
 * @param id - The curriculum id.
 * @returns The curriculum, or null for any other id (the API answers 404).
 */
export function makeLegacyCurriculumFixture(id: string): Curriculum | null {
  if (id !== FIXTURE_LEGACY_CURRICULUM_ID) return null;
  return {
    _id: FIXTURE_LEGACY_CURRICULUM_ID,
    course: { _id: "k1", courseCode: "MTH111", title: "Mathematics", className: "JSS1 A" },
    term: { _id: FIXTURE_TERM.id, name: FIXTURE_TERM.name },
    content:
      "<h3>First term plan</h3><p>Number work first, then fractions and decimals before the mid-term break.</p>" +
      "<ul><li>Place value up to millions</li><li>Factors, multiples and primes (use the hundred square)</li><li>Fractions, decimals and percentages</li></ul>" +
      "<p><strong>Assessment:</strong> 1st CA in week 4, 2nd CA in week 8.</p>",
    attachments: [],
    createdAt: "2026-07-02T09:00:00.000Z",
    updatedAt: "2026-07-10T09:00:00.000Z",
  };
}
