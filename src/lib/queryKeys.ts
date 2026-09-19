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
  },
  notifications: {
    all: ["notifications"] as const,
    list: (userId: string, params?: Record<string, unknown>) => ["notifications", userId, "list", params ?? {}] as const,
    detail: (notificationId: string) => ["notifications", "detail", notificationId] as const,
    unreadCount: (userId: string) => ["notifications", userId, "unread"] as const,
  },
  chat: {
    all: ["chat"] as const,
    rooms: (userId: string) => ["chat", userId, "rooms"] as const,
    messages: (roomId: string, params?: Record<string, unknown>) => ["chat", "room", roomId, "messages", params ?? {}] as const,
    participants: (roomId: string) => ["chat", "room", roomId, "participants"] as const,
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
