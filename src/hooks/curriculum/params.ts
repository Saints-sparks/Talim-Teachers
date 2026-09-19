/**
 * The query string `/curriculum` is opened with. The subject cards, the view
 * page and the editor's own redirect all build these URLs.
 */

/** What the page should do with the course it was opened for. */
export type CurriculumMode = "view" | "edit" | "create" | null;

/** The parsed query string. */
export interface CurriculumParams {
  courseId: string | null;
  mode: CurriculumMode;
  courseTitle: string | null;
  courseCode: string | null;
  curriculumId: string | null;
  termId: string | null;
}

/** Anything with `URLSearchParams.get`, so tests need no router. */
export interface ParamSource {
  get(name: string): string | null;
}

/**
 * Reads the curriculum page's query string. `URLSearchParams` already decodes
 * values, so titles are not decoded a second time (a title containing `%`
 * used to throw a `URIError`).
 *
 * @param source - The page's search params.
 * @returns The parsed values; unknown modes become `null`.
 */
export function parseCurriculumParams(source: ParamSource): CurriculumParams {
  const mode = source.get("mode");
  return {
    courseId: source.get("courseId"),
    mode: mode === "view" || mode === "edit" || mode === "create" ? mode : null,
    courseTitle: source.get("courseTitle"),
    courseCode: source.get("courseCode"),
    curriculumId: source.get("curriculumId"),
    termId: source.get("termId"),
  };
}

/**
 * The view page for a course's curriculum, where the editor sends the teacher
 * after saving.
 *
 * @param courseId - The course.
 * @param termId - The term.
 * @param curriculumId - The curriculum, when known.
 * @returns The route to push.
 */
export function viewRoute(courseId: string, termId: string, curriculumId: string | null): string {
  return `/curriculum/view?courseId=${courseId}&termId=${termId}&curriculumId=${curriculumId ?? ""}`;
}
