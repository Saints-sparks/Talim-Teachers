/**
 * Where the pages Subjects replaced send old links, and the links Subjects
 * gives to the written curriculum. Pure; no React.
 */
import { MAX_SCHEME_WEEK } from "./scheme.logic";

/** A page's `searchParams` as Next hands them over. */
export type RouteSearchParams = Record<string, string | string[] | undefined>;

/**
 * The first value of a query parameter that may be repeated.
 *
 * @param value - One value, several, or none.
 * @returns The first value, trimmed, or undefined when empty.
 */
function firstValue(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  const trimmed = raw?.trim();
  return trimmed ? trimmed : undefined;
}

/**
 * Where an old `/resources` link goes: the Subjects page's Resources tab,
 * keeping the course, the week (when it is a real week, 1 to 30) and
 * `upload=1` (which opens the upload sheet). Anything else is dropped.
 *
 * @param params - The old link's query.
 * @returns `/subjects?courseId=&tab=resources&upload=1&week=`, without the parts the link did not have.
 */
export function resourcesRedirectHref(params: RouteSearchParams): string {
  const search = new URLSearchParams();
  const courseId = firstValue(params.courseId);
  if (courseId) search.set("courseId", courseId);
  search.set("tab", "resources");
  const upload = firstValue(params.upload);
  if (upload === "1" || upload === "true") search.set("upload", "1");
  const week = firstValue(params.week);
  if (week && /^\d{1,2}$/.test(week) && Number(week) >= 1 && Number(week) <= MAX_SCHEME_WEEK) search.set("week", String(Number(week)));
  return `/subjects?${search.toString()}`;
}

/**
 * The Curriculum page for one course, where its written curriculum (the text
 * students read in their portal) is written and edited.
 *
 * @param courseId - The course.
 * @param termId - The term, when it is not the current one.
 * @returns `/curriculum?courseId=&termId=`.
 */
export function curriculumHref(courseId: string, termId?: string): string {
  const search = new URLSearchParams({ courseId });
  if (termId) search.set("termId", termId);
  return `/curriculum?${search.toString()}`;
}
