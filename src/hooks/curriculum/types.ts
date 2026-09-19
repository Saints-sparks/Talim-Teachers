/**
 * Types for the curriculum endpoints, taken from `talimBE-V2`
 * (`CreateCurriculumDto`, `UpdateCurriculumDto`, `GetCurriculumByCourseAndTermDto`
 * and the shapes `CurriculumController` returns).
 *
 * The API returns a curriculum in two shapes. `POST /curriculum/by-course-term`
 * flattens the course (`title`, `className`, `schoolName`, `teacherName`) and
 * drops `teacherId`; every other read (`GET /curriculum`, `/curriculum/:id`, create,
 * update) returns Mongoose populates with `teacherId` as a `{ firstName, lastName }`
 * object. {@link Curriculum} is the union of both, with every field the two
 * shapes do not share optional.
 */

/** The course block of a curriculum. Flattened by `by-course-term`, populated elsewhere. */
export interface CurriculumCourse {
  _id: string;
  courseCode?: string;
  title?: string;
  name?: string;
  description?: string;
  className?: string | null;
  schoolName?: string | null;
  teacherName?: string | null;
}

/** The term block of a curriculum. */
export interface CurriculumTerm {
  _id: string;
  name?: string;
  startDate?: string;
  endDate?: string;
}

/** The author of a curriculum, populated by every read except `by-course-term`. */
export interface CurriculumAuthor {
  _id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

/** A curriculum as the API returns it. */
export interface Curriculum {
  _id: string;
  /** Populated object, or the bare id right after a create/update that did not populate. */
  course: CurriculumCourse | string;
  term: CurriculumTerm | string;
  /** HTML written in the editor. */
  content: string;
  attachments?: string[];
  teacherId?: CurriculumAuthor | string;
  createdAt?: string;
  updatedAt?: string;
}

/** Body of `POST /curriculum`. Mirrors `CreateCurriculumDto`. */
export interface CreateCurriculumPayload {
  course: string;
  term: string;
  content: string;
  attachments?: string[];
  teacherId: string;
}

/** Body of `PATCH /curriculum/:id`. Mirrors `UpdateCurriculumDto` (every field optional). */
export type UpdateCurriculumPayload = Partial<CreateCurriculumPayload>;

/** Filters `GET /curriculum` understands. */
export interface CurriculumFilters {
  course?: string;
  term?: string;
  teacherId?: string;
}

/**
 * The id of a populated-or-bare reference.
 *
 * @param ref - A populated object, a bare id, or nothing.
 * @returns The id, or an empty string when there is none.
 */
export function refId(ref: { _id?: string } | string | null | undefined): string {
  if (!ref) return "";
  return typeof ref === "string" ? ref : (ref._id ?? "");
}

/**
 * The course of a curriculum as an object, whichever shape the API used.
 *
 * @param curriculum - A curriculum.
 * @returns The populated course, or `null` when only an id came back.
 */
export function courseOf(curriculum: Curriculum): CurriculumCourse | null {
  return typeof curriculum.course === "object" && curriculum.course ? curriculum.course : null;
}

/**
 * The term of a curriculum as an object, whichever shape the API used.
 *
 * @param curriculum - A curriculum.
 * @returns The populated term, or `null` when only an id came back.
 */
export function termOf(curriculum: Curriculum): CurriculumTerm | null {
  return typeof curriculum.term === "object" && curriculum.term ? curriculum.term : null;
}

/**
 * The display name of a curriculum's course.
 *
 * @param curriculum - A curriculum.
 * @param fallback - Shown when the course carries no name (a bare id).
 * @returns The course title, name, or the fallback.
 */
export function courseTitle(curriculum: Curriculum, fallback = "Untitled course"): string {
  const course = courseOf(curriculum);
  return course?.title || course?.name || fallback;
}

/**
 * The teacher's display name for a curriculum.
 *
 * @param curriculum - A curriculum.
 * @returns The author's name, the course teacher's name, or `null` when the API sent neither.
 */
export function teacherName(curriculum: Curriculum): string | null {
  const author = curriculum.teacherId;
  if (author && typeof author === "object") {
    const name = `${author.firstName ?? ""} ${author.lastName ?? ""}`.trim();
    if (name) return name;
  }
  return courseOf(curriculum)?.teacherName || null;
}

/** The text the editor starts with; an editor still holding it has no content yet. */
export const EDITOR_PLACEHOLDER_HTML = "<p>Enter curriculum content here...</p>";

/**
 * Whether the editor holds anything the teacher wrote.
 *
 * @param html - The editor's current HTML.
 * @returns False for empty output and for the untouched placeholder.
 */
export function hasContent(html: string): boolean {
  const trimmed = html.trim();
  return trimmed !== "" && trimmed !== "<p></p>" && trimmed !== EDITOR_PLACEHOLDER_HTML;
}
