/**
 * Types for the resource endpoints, taken from `talimBE-V2`
 * (`CreateResourceDto`, `UpdateResourceDto`, `ResourceSchema`).
 *
 * `ResourceSchema` populates `classId`, `courseId`, `uploadedBy` and `termId`
 * on every read, so each is normally an object. They are typed as
 * "object or bare id" because a populate that finds no document (an uploader
 * stored as a User id rather than a Teacher id, for example) leaves `null`,
 * and a create/update response may not populate at all.
 */

/** A populated class (`select: 'name classDescription'`). */
export interface ResourceClass {
  _id: string;
  name?: string;
  classDescription?: string;
}

/**
 * A populated course. The schema selects `name description`, but a course has
 * `title` and `courseCode` and no `name`, so the API sends only `description`
 * here; the UI resolves the title from the teacher's own course list.
 */
export interface ResourceCourse {
  _id: string;
  title?: string;
  name?: string;
  courseCode?: string;
  description?: string;
}

/** A populated term (`select: 'name startDate endDate'`). */
export interface ResourceTerm {
  _id: string;
  name?: string;
  startDate?: string;
  endDate?: string;
}

/** A populated uploader. */
export interface ResourceUploader {
  _id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  image?: string;
}

/** A reference that is populated, a bare id, or missing. */
export type Ref<T> = T | string | null | undefined;

/** A teaching resource as the API returns it. */
export interface Resource {
  _id: string;
  schoolId?: string;
  name: string;
  classId: Ref<ResourceClass>;
  courseId: Ref<ResourceCourse>;
  uploadedBy: Ref<ResourceUploader>;
  termId: Ref<ResourceTerm>;
  /** ISO date. */
  uploadDate: string;
  /** The hosted file the resource shows as its cover (the same URL as `files[0]` for uploads made here). */
  image: string;
  files: string[];
  createdAt?: string;
  updatedAt?: string;
}

/** Body of `POST /resources`. Mirrors `CreateResourceDto`. */
export interface CreateResourcePayload {
  name: string;
  classId: string;
  courseId: string;
  termId: string;
  image: string;
  files?: string[];
  /** ISO date; the API defaults to now. */
  uploadDate?: string;
}

/** Body of `PUT /resources/:id`. Mirrors `UpdateResourceDto` (every field optional). */
export interface UpdateResourcePayload {
  name?: string;
  classId?: string;
  courseId?: string;
  termId?: string;
  uploadDate?: string;
  image?: string;
  files?: string[];
}

/**
 * The id of a populated-or-bare reference.
 *
 * @param ref - A populated document, a bare id, or nothing.
 * @returns The id, or an empty string.
 */
export function refId(ref: Ref<{ _id?: string }>): string {
  if (!ref) return "";
  return typeof ref === "string" ? ref : (ref._id ?? "");
}
