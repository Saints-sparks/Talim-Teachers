/**
 * Types for the redesigned Subjects page: the week-by-week scheme of work
 * (Round 1, §6) and "Round 3", §24–25 of
 * `talimBE-V2/docs/redesign-teachers-today-timetable.md`.
 *
 * The scheme-of-work routes are already in the generated contract, so those
 * types are ALIASES of `./api.d.ts` (a backend change fails `tsc`). The
 * Round 3 additions — the subject cards (§25) and the new resource fields
 * (§24) — are HAND-WRITTEN until the backend ships them: then run
 * `npm run types:api` and alias the generated DTOs instead. "ASSUMED" marks a
 * choice the contract leaves open; "NOT IN THE CONTRACT" marks an optional
 * field the page would use but does not need.
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
 * teacher teaches. `lessonsPerWeek` comes from the timetable;
 * `legacyCurriculum` is the old text curriculum for this course and term,
 * shown read-only under "Earlier notes" (`GET /curriculum/:id`).
 */
export interface SubjectCard {
  course: { id: string; code: string; title: string };
  class: { id: string; name: string };
  studentCount: number;
  lessonsPerWeek: number;
  totalWeeks: number;
  currentWeek: number | null;
  taughtCount: number;
  resourceCount: number;
  legacyCurriculum: { id: string; updatedAt: string } | null;
}

/** §24: who can see a resource. Parents only with `students_and_parents`. */
export type ResourceVisibility = "students" | "students_and_parents";

/** §24: derived by the server from the MIME type or extension when not sent. */
export type ResourceKind = "pdf" | "slides" | "video" | "doc" | "image" | "other";

/** A populated-or-bare reference, as the resource routes return them. */
export type ResourceRef = string | { _id?: string; id?: string; name?: string; title?: string } | null | undefined;

/**
 * §24: a resource as `GET /resources/course/:courseId` returns it, with the
 * Round 3 fields. ASSUMED: the existing fields keep their shapes (Mongo
 * `_id`, populated references) and the new ones are added beside them; the
 * Round 3 fields are optional so a resource saved before the migration still
 * renders.
 */
export interface CourseResource {
  _id: string;
  name: string;
  classId?: ResourceRef;
  courseId?: ResourceRef;
  termId?: ResourceRef;
  /** ISO date. */
  uploadDate?: string;
  createdAt?: string;
  /** Optional since §24. */
  image?: string | null;
  files?: string[];
  week?: number | null;
  visibility?: ResourceVisibility;
  kind?: ResourceKind;
  mimeType?: string | null;
  sizeBytes?: number | null;
  /** Unique viewers (students and parents). */
  viewCount?: number;
}

/**
 * §24 `POST /resources`: the existing `CreateResourceDto` plus `visibility`,
 * `kind`, `mimeType` and `sizeBytes`; `image` becomes optional. The page
 * sends `image` too, the same URL as `files[0]`, as uploads made here always
 * have.
 */
export interface CreateCourseResourceBody {
  name: string;
  classId: string;
  courseId: string;
  termId: string;
  uploadDate?: string;
  image?: string;
  files: string[];
  week?: number;
  visibility: ResourceVisibility;
  kind?: ResourceKind;
  mimeType: string;
  sizeBytes: number;
}
