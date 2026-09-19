/**
 * Pure helpers that turn a resource into the strings and links the resource
 * screens show. Kept out of the components so they can be tested.
 */
import { refId, type Resource, type ResourceClass, type ResourceCourse } from "./types";

/** A class as the teacher record or a course lists it. */
export interface ClassLike {
  _id?: string;
  id?: string;
  name?: string;
  title?: string;
  className?: string;
}

/** A course as the teacher record lists it. */
export interface CourseLike {
  _id?: string;
  id?: string;
  title?: string;
  name?: string;
  courseCode?: string;
  classId?: ClassLike | string | null;
}

/**
 * The id of a class or course record, whichever key it carries.
 *
 * @param value - A record, a bare id, or nothing.
 * @returns The id, or an empty string.
 */
export function recordId(value: ClassLike | CourseLike | string | null | undefined): string {
  if (!value) return "";
  return typeof value === "string" ? value : (value._id ?? value.id ?? "");
}

/**
 * The display name of a class record.
 *
 * @param value - A record, a bare id, or nothing.
 * @param fallback - Shown when the record has no name.
 * @returns The class name, or the fallback.
 */
export function className(value: ClassLike | string | null | undefined, fallback = "Unassigned Class"): string {
  if (!value || typeof value === "string") return fallback;
  return value.name || value.title || value.className || fallback;
}

/**
 * The class column of a resource: the populated name, else the teacher's own
 * class list looked up by id.
 *
 * @param resource - The resource.
 * @param classes - The teacher's classes.
 * @returns A class name, or "Unassigned Class".
 */
export function resourceClassName(resource: Pick<Resource, "classId">, classes: ClassLike[]): string {
  const ref = resource.classId;
  if (!ref) return "Unassigned Class";
  if (typeof ref === "object" && ref.name) return ref.name;
  const id = refId(ref as ResourceClass);
  const match = classes.find((item) => recordId(item) === id);
  return match ? className(match) : "Unassigned Class";
}

/**
 * The course column of a resource. The API populates only `description` for the
 * course, so the title and code come from the teacher's own course list.
 *
 * @param resource - The resource.
 * @param courses - The teacher's courses.
 * @returns "CODE - Title", the title alone, or "No course".
 */
export function resourceCourseName(resource: Pick<Resource, "courseId">, courses: CourseLike[]): string {
  const ref = resource.courseId;
  if (!ref) return "No course";
  const id = refId(ref as ResourceCourse);
  const known = typeof ref === "object" ? ref : undefined;
  const match = courses.find((item) => recordId(item) === id);
  const title = known?.title || match?.title || match?.name;
  const code = known?.courseCode || match?.courseCode;
  return [code, title].filter(Boolean).join(" - ") || "No course";
}

/**
 * The term column / detail line of a resource.
 *
 * @param resource - The resource.
 * @returns The term's name, or "Unknown term".
 */
export function resourceTermName(resource: Pick<Resource, "termId">): string {
  const ref = resource.termId;
  if (ref && typeof ref === "object" && ref.name) return ref.name;
  return "Unknown term";
}

/**
 * A date as the resource table shows it.
 *
 * @param value - An ISO date from the API.
 * @returns "September 18, 2026"-style text, or an em dash when unreadable.
 */
export function formatUploadDate(value: string | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(date);
}

/**
 * The address "View" opens: the first file, else the cover image.
 *
 * @param resource - The resource.
 * @returns A URL, or an empty string when the resource carries no file.
 */
export function resourceUrl(resource: Pick<Resource, "files" | "image">): string {
  if (resource.files && resource.files.length > 0) return resource.files[0];
  return resource.image || "";
}

/** Everything the upload and edit forms offer in their class select. */
export interface ClassOption {
  _id: string;
  name: string;
}

/**
 * The classes a resource may be filed under: the teacher's classes from every
 * list the roster exposes, plus the class of the selected course (which the
 * teacher may teach without being assigned to).
 *
 * @param sources - Class lists (assigned classes, form-teacher classes, context classes).
 * @param selectedCourse - The course chosen in the form, if any.
 * @returns De-duplicated options, each with an id and a name.
 */
export function classOptions(sources: Array<ClassLike[] | undefined>, selectedCourse?: CourseLike | null): ClassOption[] {
  const seen = new Map<string, ClassOption>();
  for (const list of sources) {
    for (const item of list ?? []) {
      const id = recordId(item);
      if (id && !seen.has(id)) seen.set(id, { _id: id, name: className(item, "Class") });
    }
  }
  const courseClass = selectedCourse?.classId;
  const courseClassId = recordId(courseClass);
  if (courseClassId && !seen.has(courseClassId)) {
    seen.set(courseClassId, {
      _id: courseClassId,
      name: className(typeof courseClass === "object" ? courseClass : null, "Course class"),
    });
  }
  return Array.from(seen.values());
}
