/**
 * Where Today's actions go: attention targets, the register button, the
 * scheme of work and the setup steps, each mapped onto a route that exists in
 * this app today. Pure; no React.
 *
 * Query parameters the destination does not read yet are still passed (they
 * are harmless and let those pages preselect later); the ones that work today
 * are `?room=` on Messages, `?courseId=&tab=plan&week=` on Subjects (the
 * scheme of work), `?courseId=&tab=resources&upload=1&week=` on Subjects (the
 * upload sheet), `?date=` on the register (`/attendance/class/:id`, also
 * `/attendance?classId=&date=`), `?classId=` on Students and
 * `?courseId=&assessmentId=` on Grading.
 */
import type { AttentionTarget, AttentionTone, RegisterStatus, SetupStepKey } from "@/types/today";
import type { NotificationTarget } from "@/types/inboxSettings";

/**
 * Builds a path with a query string, dropping empty values.
 *
 * @param path - The route.
 * @param params - Query values.
 * @returns The href.
 */
function withQuery(path: string, params: Record<string, string | number | undefined | null>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `${path}?${query}` : path;
}

/**
 * The attendance page for one class's register on a date.
 *
 * @param classId - The class.
 * @param date - `YYYY-MM-DD`; optional.
 * @returns The href.
 */
export function registerRoute(classId: string, date?: string): string {
  return withQuery(`/attendance/class/${encodeURIComponent(classId)}`, { date });
}

/**
 * "Message the class": the class-group chat room when the lesson has one
 * (`classRoomId`), otherwise the inbox. The lesson sheet only links here
 * when there is a room; without one it creates or reuses the class group
 * first (`useClassGroup`).
 *
 * @param classRoomId - The lesson's class-group room, or null.
 * @returns The href.
 */
export function classMessagesRoute(classRoomId: string | null | undefined): string {
  return withQuery("/messages", { room: classRoomId });
}

/**
 * The scheme of work for a course: the Subjects page on that course's Plan
 * tab, scrolled to the week.
 *
 * @param courseId - The course.
 * @param week - The week to open, when known.
 * @returns The href.
 */
export function schemeOfWorkRoute(courseId: string, week?: number | null): string {
  return withQuery("/subjects", { courseId, tab: "plan", week: week ?? undefined });
}

/**
 * The Subjects page's upload sheet: that course (else the first subject) on
 * its Resources tab, with the sheet open on the week (else the current one).
 * Every "Upload" and "Share a resource" goes here: Today's header, its setup
 * step and attention items, and the lesson sheet on Today and the Timetable.
 *
 * @param courseId - The course, if known.
 * @param week - The scheme-of-work week, if known.
 * @returns `/subjects?courseId=&tab=resources&upload=1&week=` (without the parameters not known).
 */
export function uploadResourceRoute(courseId?: string, week?: number | null): string {
  return withQuery("/subjects", { courseId, tab: "resources", upload: 1, week: week ?? undefined });
}

/**
 * Maps an attention action's target, or a notification's `metadata.target`
 * (Round 4 §30, which adds four pages), to a route in this app.
 *
 * - `attendance` → the class's register (`/attendance/class/:id`), or the class list.
 * - `grading` → `/grading?courseId=&assessmentId=`, which opens that course and assessment.
 * - `messages` → `/messages?room=` (Messages opens that room), or the inbox.
 * - `resources` → `/subjects?courseId=&tab=resources&upload=1&week=` (opens the Subjects upload sheet).
 * - `subjects` → the course's scheme of work, or `/subjects`.
 * - `leave` → there is no leave screen in the teacher app yet, so the class's
 *   register, where approved leave shows, or `/attendance`.
 * - `announcements` → the Notifications page on its Announcements tab.
 * - `timetable` → `/timetable` (with `?date=`, not read yet).
 * - `settings` → `/settings`.
 *
 * @param target - The action's target.
 * @returns The href.
 */
export function attentionHref(target: AttentionTarget | NotificationTarget): string {
  switch (target.page) {
    case "attendance":
      return target.classId ? registerRoute(target.classId, target.date) : "/attendance";
    case "grading":
      return withQuery("/grading", { courseId: target.courseId, assessmentId: target.assessmentId, classId: target.classId });
    case "messages":
      return withQuery("/messages", { room: target.roomId });
    case "resources":
      return uploadResourceRoute(target.courseId, target.week);
    case "subjects":
      return target.courseId ? schemeOfWorkRoute(target.courseId, target.week) : "/subjects";
    case "leave":
      return target.classId ? registerRoute(target.classId, target.date) : "/attendance";
    case "announcements":
      return "/notifications?tab=announcements";
    case "timetable":
      return withQuery("/timetable", { date: target.date });
    case "settings":
      return "/settings";
    default:
      return "/dashboard";
  }
}

/** Dot colour class per tone (tokens defined in globals.css). */
export const TONE_DOT: Record<AttentionTone, string> = {
  warning: "tl-dot-warning",
  neutral: "tl-dot-neutral",
  success: "tl-dot-success",
  info: "tl-dot-info",
  accent: "tl-dot-accent",
};

/** What the "Take register" button should do. */
export type RegisterAction =
  | { kind: "hidden" }
  | { kind: "take"; register: RegisterStatus; href: string }
  | { kind: "submitted"; register: RegisterStatus };

/**
 * Picks the register the header button opens: the first class-teacher class
 * whose register is still open, else "submitted" when they are all in, else
 * nothing (not a class teacher, or not a school day).
 *
 * @param registers - Today's register statuses.
 * @param date - Today, `YYYY-MM-DD`.
 * @param isSchoolDay - Whether registers are taken today.
 * @returns The action.
 */
export function pickRegisterAction(registers: readonly RegisterStatus[], date: string, isSchoolDay: boolean): RegisterAction {
  if (!isSchoolDay) return { kind: "hidden" };
  // A class with no students has no register to take (the server does not count it as pending either).
  const mine = registers.filter((r) => r.isClassTeacher && r.studentCount > 0);
  if (mine.length === 0) return { kind: "hidden" };
  const open = mine.find((r) => !r.submittedAt);
  if (open) return { kind: "take", register: open, href: registerRoute(open.classId, date) };
  return { kind: "submitted", register: mine[0] };
}

/**
 * Where each setup step sends the teacher. `tour` opens the tour sheet, so
 * it has no route here; `resource` goes to the Subjects upload sheet.
 *
 * @param key - The step.
 * @returns The href, or null for the in-page steps.
 */
export function setupStepHref(key: SetupStepKey): string | null {
  switch (key) {
    case "profile":
      return "/settings?tab=account";
    case "register":
      return "/attendance";
    case "publish":
      return "/grading";
    case "plan":
      return "/subjects";
    case "resource":
      return uploadResourceRoute();
    default:
      return null;
  }
}
