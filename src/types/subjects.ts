/**
 * Types for the redesigned Subjects page: the week-by-week scheme of work
 * (Round 1, §6) and "Round 3", §24–25 of
 * `talimBE-V2/docs/redesign-teachers-today-timetable.md`, with its "Round 3
 * as built" list (which wins where the two disagree).
 *
 * Everything the generated contract (`./api.d.ts`, refreshed with
 * `npm run types:api`) describes is an ALIAS of it, so a backend change fails
 * `tsc`: the scheme-of-work routes, the subject cards (§25; `legacyCurriculum`
 * may carry `updatedAt: null`), the resource enums and the create body (§24).
 *
 * Hand-written on purpose (Swagger is silent there):
 * - {@link CourseResource} and {@link ResourceRef}: the resource routes
 *   declare no response schema. As built, every resource response carries
 *   `id` beside `_id`; `classId`, `courseId`, `termId` and `uploadedBy` are
 *   populated objects on reads (the mobile app reads them that way) and bare
 *   ids on the create response, so clients take `ref._id ?? ref`; and a
 *   resource saved before Round 3 answers `visibility: 'students'`, a derived
 *   `kind` and `viewCount: 0`.
 */
import type { components } from "./api";

type S = components["schemas"];

/** §6: one week of a course's scheme of work. Empty strings where nothing is written yet. */
export type SchemeWeek = S["SchemeWeekDto"];

/**
 * §6 `GET /scheme-of-work/course/:courseId?termId=`: every week from 1 to
 * `totalWeeks`, with the course, the term and the current week (null outside
 * the term). Also what the two `PUT` routes answer.
 */
export type SchemeOfWork = S["SchemeOfWorkDto"];

/** §6 `PUT /scheme-of-work/course/:courseId/weeks/:week`. */
export type SaveSchemeWeekBody = S["SaveSchemeWeekDto"];

/** §6 `POST /scheme-of-work/course/:courseId/weeks/:week/taught`. */
export type MarkWeekTaughtBody = S["MarkSchemeWeekTaughtDto"];

/** §6: the taught toggle's answer. */
export type WeekTaughtResult = S["SchemeWeekTaughtDto"];

/**
 * §25 `GET /scheme-of-work/me?termId=` (teacher): one card per course the
 * teacher teaches, by course title then class. `lessonsPerWeek` comes from
 * the timetable; `legacyCurriculum` is the old text curriculum for this
 * course and term, shown read-only under "Earlier notes" (`GET /curriculum/:id`).
 */
export type SubjectCard = S["SubjectCardDto"];

/** §24: who can see a resource. Parents only with `students_and_parents`. */
export type ResourceVisibility = S["CreateResourceDto"]["visibility"];

/** §24: derived by the server from the MIME type or extension when not sent. */
export type ResourceKind = NonNullable<S["CreateResourceDto"]["kind"]>;

/**
 * A resource's reference to its class, course, term or uploader. HAND-WRITTEN
 * (no response schema): a populated object on reads (`{ _id, name, ... }`), a
 * bare id on the create response, null when the referenced record is gone.
 * Read it with `refId` (`ref._id ?? ref`).
 */
export type ResourceRef = string | { _id: string; id?: string; name?: string; title?: string } | null | undefined;

/**
 * §24: a resource as `GET /resources/course/:courseId` (and `POST /resources`)
 * returns it. HAND-WRITTEN: the resource routes declare no response schema.
 * The Round 3 fields are always present (a resource saved before them
 * answers `visibility: 'students'`, a derived `kind` and `viewCount: 0`);
 * `mimeType` and `sizeBytes` only when the upload sent them.
 */
export interface CourseResource {
  _id: string;
  /** The same id as `_id` (as built: every resource response carries both). */
  id: string;
  name: string;
  classId: ResourceRef;
  courseId: ResourceRef;
  termId: ResourceRef;
  uploadedBy?: ResourceRef;
  /** ISO date. */
  uploadDate?: string;
  createdAt?: string;
  updatedAt?: string;
  /** Optional since §24. */
  image?: string | null;
  files?: string[];
  week?: number | null;
  visibility: ResourceVisibility;
  kind: ResourceKind;
  mimeType?: string;
  sizeBytes?: number;
  /** Unique viewers (students and parents). */
  viewCount: number;
}

/**
 * §24 `POST /resources`: the generated `CreateResourceDto` (with
 * `visibility`, `kind`, `mimeType`, `sizeBytes` and the week; `image`
 * optional) without `uploadedBy`, which the server ignores for teachers. The
 * page always sends `files`, `mimeType` and `sizeBytes`, and `image` too
 * (the same URL as `files[0]`, as uploads made here always have).
 */
export type CreateCourseResourceBody = Omit<S["CreateResourceDto"], "uploadedBy"> &
  Required<Pick<S["CreateResourceDto"], "files" | "mimeType" | "sizeBytes">>;
