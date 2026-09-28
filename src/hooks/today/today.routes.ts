/**
 * Where Today's actions go: attention targets, the register button, the
 * scheme of work and the setup steps, each mapped onto a route that exists in
 * this app today. Pure; no React.
 *
 * Query parameters the destination does not read yet are still passed (they
 * are harmless and let those pages preselect later); the ones that work today
 * are `?room=` on Messages, `?courseId=` on Curriculum, `?upload=1&courseId=`
 * on Resources, `?date=` on the register (`/attendance/class/:id`, also
 * `/attendance?classId=&date=`), `?classId=` on Students and
 * `?courseId=&assessmentId=` on Grading.
 */
import type { AttentionTarget, AttentionTone, RegisterStatus, SetupStepKey } from "@/types/today";

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
 * (`classRoomId`), otherwise the inbox.
 *
 * @param classRoomId - The lesson's class-group room, or null.
 * @returns The href.
 */
export function classMessagesRoute(classRoomId: string | null | undefined): string {
  return withQuery("/messages", { room: classRoomId });
}

/**
 * The scheme of work for a course. Until the week-by-week Subjects screen
 * lands, that is the course's curriculum page.
 *
 * @param courseId - The course.
 * @param week - The week to open, when known.
 * @returns The href.
 */
export function schemeOfWorkRoute(courseId: string, week?: number | null): string {
  return withQuery("/curriculum", { courseId, week: week ?? undefined });
}

/**
 * The resources page with the upload dialog open for a course (and week).
 *
 * @param courseId - The course, if known.
 * @param week - The scheme-of-work week, if known.
 * @returns The href.
 */
export function uploadResourceRoute(courseId?: string, week?: number | null): string {
  return withQuery("/resources", { upload: 1, courseId, week: week ?? undefined });
}

/**
 * Maps an attention action's target to a route in this app.
 *
 * - `attendance` → the class's register (`/attendance/class/:id`), or the class list.
 * - `grading` → `/grading?courseId=&assessmentId=`, which opens that course and assessment.
 * - `messages` → `/messages?room=` (Messages opens that room), or the inbox.
 * - `resources` → `/resources?upload=1&courseId=&week=` (opens the upload dialog).
 * - `subjects` → the course's scheme of work, or `/subjects`.
 * - `leave` → there is no leave screen in the teacher app yet, so the class's
 *   register, where approved leave shows, or `/attendance`.
 *
 * @param target - The action's target.
 * @returns The href.
 */
export function attentionHref(target: AttentionTarget): string {
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
 * Where each setup step sends the teacher. `tour` opens the tour sheet and
 * `resource` the upload dialog, so they have no route here.
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
      return "/curriculum";
    case "resource":
      return uploadResourceRoute();
    default:
      return null;
  }
}
