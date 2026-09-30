/**
 * Query-key factory. Every cached resource is keyed `[resource, schoolId, …params]`
 * so a school switch (or logout) invalidates everything at once via
 * `queryClient.removeQueries({ queryKey: [resource] })`, and a mutation can
 * invalidate exactly the list it changed.
 *
 * Add a resource here when a page moves onto TanStack Query; never build
 * ad-hoc key arrays inside components.
 */
export const queryKeys = {
  teacher: {
    all: ["teacher"] as const,
    detail: (teacherId: string) => ["teacher", teacherId] as const,
    kpis: (schoolId: string, teacherId: string) => ["teacher", schoolId, teacherId, "kpis"] as const,
    progress: (schoolId: string, teacherId: string) => ["teacher", schoolId, teacherId, "progress"] as const,
    /** `GET /teachers/dashboard/me` — KPIs, schedule, grading/attendance/resources summaries, activity and setup progress in one payload. */
    dashboard: (schoolId: string, teacherId: string) => ["teacher", schoolId, teacherId, "dashboard"] as const,
    /** `GET /teachers/today` — the redesign's Today aggregate (lessons, registers, attention, classes, setup, counts). */
    today: (schoolId: string, teacherId: string) => ["teacher", schoolId, teacherId, "today"] as const,
  },
  /** The redesign's Attendance and Students screens (`src/types/classroom.ts`). */
  classroom: {
    all: ["classroom"] as const,
    /** `GET /teachers/me/classes`. */
    myClasses: (schoolId: string, teacherId: string) => ["classroom", schoolId, teacherId, "classes"] as const,
    /** `GET /registers/:classId?date=`; `"today"` when no date is sent. */
    register: (schoolId: string, classId: string, date: string) => ["classroom", schoolId, "register", classId, date] as const,
    /** Prefix of every loaded register of a class. */
    registers: (schoolId: string, classId: string) => ["classroom", schoolId, "register", classId] as const,
    /** `GET /teachers/me/classes/:classId/students`. */
    roster: (schoolId: string, classId: string) => ["classroom", schoolId, "roster", classId] as const,
    /** `GET /teachers/me/students/:studentId`. */
    student: (schoolId: string, studentId: string) => ["classroom", schoolId, "student", studentId] as const,
  },
  /**
   * The redesign's Grading page ("Round 3", `src/types/grading.ts`). `termId`
   * is `"current"` when none is sent (the server's current term).
   */
  grading: {
    all: ["grading"] as const,
    /** `GET /grading/course/:courseId?termId=`. */
    sheet: (schoolId: string, courseId: string, termId: string) => ["grading", schoolId, "sheet", courseId, termId] as const,
    /** `GET /grading/classes/:classId/readiness?termId=`. */
    readiness: (schoolId: string, classId: string, termId: string) => ["grading", schoolId, "readiness", classId, termId] as const,
    /** `GET /grading/classes/:classId/broadsheet?termId=&basis=`. */
    broadsheet: (schoolId: string, classId: string, termId: string, basis: string) =>
      ["grading", schoolId, "broadsheet", classId, termId, basis] as const,
    /** `GET /grading/classes/:classId/remarks?termId=`. */
    remarks: (schoolId: string, classId: string, termId: string) => ["grading", schoolId, "remarks", classId, termId] as const,
    /** `GET /grading/classes/:classId/term-results?termId=`. */
    termResults: (schoolId: string, classId: string, termId: string) => ["grading", schoolId, "term-results", classId, termId] as const,
    /** Prefix of everything loaded for one class (readiness, broadsheets, remarks, submissions). */
    class: (schoolId: string) => ["grading", schoolId] as const,
  },
  /** The redesign's Subjects page (`src/types/subjects.ts`). `termId` is `"current"` when none is sent. */
  schemeOfWork: {
    all: ["scheme-of-work"] as const,
    /** `GET /scheme-of-work/me?termId=`: the subject cards. */
    mine: (schoolId: string, userId: string, termId: string) => ["scheme-of-work", schoolId, "me", userId, termId] as const,
    /** `GET /scheme-of-work/course/:courseId?termId=`. */
    course: (schoolId: string, courseId: string, termId: string) => ["scheme-of-work", schoolId, "course", courseId, termId] as const,
    /** `GET /resources/course/:courseId`: the Resources tab. */
    resources: (schoolId: string, courseId: string) => ["scheme-of-work", schoolId, "resources", courseId] as const,
    /** `GET /curriculum/:id`: the read-only "Earlier notes". */
    legacy: (schoolId: string, curriculumId: string) => ["scheme-of-work", schoolId, "legacy", curriculumId] as const,
  },
  academic: {
    all: ["academic"] as const,
    years: (schoolId: string) => ["academic", schoolId, "years"] as const,
    terms: (schoolId: string) => ["academic", schoolId, "terms"] as const,
    currentTerm: (schoolId: string) => ["academic", schoolId, "current-term"] as const,
  },
  classes: {
    all: ["classes"] as const,
    list: (schoolId: string) => ["classes", schoolId, "list"] as const,
    assigned: (schoolId: string, teacherId: string) => ["classes", schoolId, "assigned", teacherId] as const,
    detail: (schoolId: string, classId: string) => ["classes", schoolId, classId] as const,
  },
  students: {
    all: ["students"] as const,
    list: (schoolId: string, params?: Record<string, unknown>) => ["students", schoolId, "list", params ?? {}] as const,
    byClass: (schoolId: string, classId: string) => ["students", schoolId, "class", classId] as const,
    byCourse: (schoolId: string, courseId: string) => ["students", schoolId, "course", courseId] as const,
    detail: (schoolId: string, studentId: string) => ["students", schoolId, studentId] as const,
  },
  subjects: {
    all: ["subjects"] as const,
    list: (schoolId: string) => ["subjects", schoolId, "list"] as const,
    detail: (schoolId: string, subjectId: string) => ["subjects", schoolId, subjectId] as const,
  },
  courses: {
    all: ["courses"] as const,
    bySchool: (schoolId: string) => ["courses", schoolId, "school"] as const,
    byClass: (schoolId: string, classId: string) => ["courses", schoolId, "class", classId] as const,
    byTeacher: (schoolId: string, teacherId: string) => ["courses", schoolId, "teacher", teacherId] as const,
    detail: (schoolId: string, courseId: string) => ["courses", schoolId, courseId] as const,
    statistics: (schoolId: string, courseId: string, termId: string) =>
      ["courses", schoolId, courseId, "statistics", termId] as const,
  },
  attendance: {
    all: ["attendance"] as const,
    byClass: (schoolId: string, classId: string, params?: Record<string, unknown>) =>
      ["attendance", schoolId, "class", classId, params ?? {}] as const,
    byStudent: (schoolId: string, studentId: string, params?: Record<string, unknown>) =>
      ["attendance", schoolId, "student", studentId, params ?? {}] as const,
    summary: (schoolId: string, params?: Record<string, unknown>) => ["attendance", schoolId, "summary", params ?? {}] as const,
    analytics: (schoolId: string, params?: Record<string, unknown>) => ["attendance", schoolId, "analytics", params ?? {}] as const,
  },
  grades: {
    all: ["grades"] as const,
    assessments: (schoolId: string, params?: Record<string, unknown>) => ["grades", schoolId, "assessments", params ?? {}] as const,
    assessmentGrades: (schoolId: string, assessmentId: string, courseId: string) =>
      ["grades", schoolId, "assessment", assessmentId, courseId] as const,
    courseGrades: (schoolId: string, courseId: string, termId: string) =>
      ["grades", schoolId, "course", courseId, termId] as const,
    studentCumulative: (schoolId: string, studentId: string, termId: string) =>
      ["grades", schoolId, "cumulative", studentId, termId] as const,
    classCumulative: (schoolId: string, classId: string, termId: string) =>
      ["grades", schoolId, "class-cumulative", classId, termId] as const,
    /** A class's courses with their assessment completion — `assessment-overview`. */
    assessmentOverview: (schoolId: string, classId: string, termId: string) =>
      ["grades", schoolId, "assessment-overview", classId, termId] as const,
    /** Every course grade one student has for a term. */
    studentCourseGrades: (schoolId: string, studentId: string, termId: string) =>
      ["grades", schoolId, "student-courses", studentId, termId] as const,
    /** One student's assessment scores in one course and term. */
    studentAssessmentHistory: (schoolId: string, studentId: string, courseId: string, termId: string) =>
      ["grades", schoolId, "student-assessments", studentId, courseId, termId] as const,
    publication: (schoolId: string, courseId: string, termId: string) =>
      ["grades", schoolId, "publication", courseId, termId] as const,
    analytics: (schoolId: string, params?: Record<string, unknown>) => ["grades", schoolId, "analytics", params ?? {}] as const,
  },
  curriculum: {
    all: ["curriculum"] as const,
    list: (schoolId: string, params?: Record<string, unknown>) => ["curriculum", schoolId, "list", params ?? {}] as const,
    byCourse: (schoolId: string, courseId: string) => ["curriculum", schoolId, "course", courseId] as const,
    detail: (schoolId: string, curriculumId: string) => ["curriculum", schoolId, curriculumId] as const,
  },
  resources: {
    all: ["resources"] as const,
    list: (schoolId: string, params?: Record<string, unknown>) => ["resources", schoolId, "list", params ?? {}] as const,
    detail: (schoolId: string, resourceId: string) => ["resources", schoolId, resourceId] as const,
  },
  timetable: {
    all: ["timetable"] as const,
    byClass: (schoolId: string, classId: string) => ["timetable", schoolId, "class", classId] as const,
    byTeacher: (schoolId: string, teacherId: string) => ["timetable", schoolId, "teacher", teacherId] as const,
    /** `GET /timetable/me?weekStart=` — one week of the signed-in teacher's lessons; `"current"` for the default week. */
    myWeek: (schoolId: string, teacherId: string, weekStart: string) => ["timetable", schoolId, "me", teacherId, weekStart] as const,
    /** Prefix of every `myWeek` key, for invalidating all loaded weeks. */
    myWeeks: (schoolId: string, teacherId: string) => ["timetable", schoolId, "me", teacherId] as const,
  },
  notifications: {
    all: ["notifications"] as const,
    list: (userId: string, params?: Record<string, unknown>) => ["notifications", userId, "list", params ?? {}] as const,
    detail: (notificationId: string) => ["notifications", "detail", notificationId] as const,
    unreadCount: (userId: string) => ["notifications", userId, "unread"] as const,
    /** `GET /notifications/counts` — totals per category over both feeds (Round 4 §30). */
    counts: (userId: string) => ["notifications", userId, "counts"] as const,
  },
  chat: {
    all: ["chat"] as const,
    rooms: (userId: string) => ["chat", userId, "rooms"] as const,
    messages: (roomId: string, params?: Record<string, unknown>) => ["chat", "room", roomId, "messages", params ?? {}] as const,
    participants: (roomId: string) => ["chat", "room", roomId, "participants"] as const,
    /** `GET /chat/contacts` — the "New message" picker (Round 4 §26). */
    contacts: (userId: string) => ["chat", userId, "contacts"] as const,
    /** `GET /chat/rooms/:roomId/media?kind=` — shared images, documents or links (Round 4 §29). */
    media: (roomId: string, kind: string) => ["chat", "room", roomId, "media", kind] as const,
  },
  profile: {
    all: ["profile"] as const,
    detail: (userId: string) => ["profile", userId] as const,
  },
  settings: {
    all: ["settings"] as const,
    /** `/teacher/settings` — profile, employment, summary and stored preferences. */
    teacher: (userId: string) => ["settings", userId, "teacher"] as const,
    /** `/notifications/preferences` — per-category delivery switches. */
    notificationPreferences: (userId: string) => ["settings", userId, "notification-preferences"] as const,
    /** `GET /auth/sessions` — signed-in devices (Round 4 §34). */
    sessions: (userId: string) => ["settings", userId, "sessions"] as const,
    /** `GET /auth/password-policy` — public, the same for everyone (Round 4 §34). */
    passwordPolicy: () => ["settings", "password-policy"] as const,
    /** `GET /teachers/me/school` — the school office's contact details (Round 4 §36). */
    schoolContact: (userId: string) => ["settings", userId, "school-contact"] as const,
  },
} as const;

/**
 * The prefix of a params-carrying list key, for invalidating every page of a
 * list at once. Invalidating with the full key would only match one page.
 *
 * @param key - A key built by one of the factories above.
 * @returns The key without its trailing params object.
 */
export function listPrefix(key: readonly unknown[]): readonly unknown[] {
  const last = key[key.length - 1];
  return last && typeof last === "object" && !Array.isArray(last) ? key.slice(0, -1) : key;
}

/** Stale times (ms) by how often data actually changes. */
export const staleTimes = {
  /** Classes, subjects, courses, terms: minutes between changes. */
  reference: 10 * 60_000,
  /** Lists people edit during the day (students, resources, curriculum). */
  list: 30_000,
  /** Attendance marks, grades in a grading session, unread counts. */
  live: 0,
} as const;
