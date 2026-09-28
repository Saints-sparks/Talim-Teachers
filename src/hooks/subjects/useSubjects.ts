"use client";

/**
 * Data hooks for the redesigned Subjects page.
 *
 * - `useSubjectCards`: `GET /scheme-of-work/me?termId=`.
 * - `useScheme`: `GET /scheme-of-work/course/:courseId?termId=`.
 * - `useCourseResources`: `GET /resources/course/:courseId`, narrowed to the page's term.
 * - `useLegacyCurriculum`: `GET /curriculum/:id`, only once "Earlier notes" is opened.
 * - `useSaveWeek`, `useMarkWeekTaught`, `useRemoveResource`: the mutations.
 * - `useResourceUploader`: the two-step upload (Cloudinary, then `POST /resources`).
 *
 * Nothing is fetched while the teacher must change a temporary password.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient, type QueryClient, type UseQueryResult } from "@tanstack/react-query";
import { useAuth } from "@/app/context/AuthContext";
import { subjectsService } from "@/app/services/subjects/subjects.service";
import { resourcesForTerm } from "@/hooks/subjects/scheme.logic";
import { buildResourcePayload, isUploadAborted, uploadErrorMessage, type ResourcePayloadInput, type UploadPhase } from "@/hooks/subjects/upload.logic";
import type { Curriculum } from "@/hooks/curriculum/types";
import { logger } from "@/lib/logger";
import { queryKeys, staleTimes } from "@/lib/queryKeys";
import type { CourseResource, SchemeOfWork, SubjectCard } from "@/types/subjects";

/** The key segment for "no term chosen" (the server's current term). */
export const CURRENT_TERM_KEY = "current";

/**
 * Who is asking, for query keys; nothing is fetched until there is a session
 * without a pending password change.
 *
 * @returns The school and user ids and whether queries may run.
 */
function useSession(): { schoolId: string; userId: string; enabled: boolean } {
  const { user, schoolId } = useAuth();
  const userId = user?.userId ?? "";
  return { schoolId: schoolId ?? "none", userId: userId || "none", enabled: Boolean(schoolId && userId) && !user?.mustChangePassword };
}

/**
 * A key without its last segment (the term), so one invalidation covers every term.
 *
 * @param key - A key from the factory.
 * @returns The prefix.
 */
function withoutTerm(key: readonly unknown[]): readonly unknown[] {
  return key.slice(0, -1);
}

/**
 * Refetches everything a change to a course's resources or weeks can move:
 * its resources, its scheme (per-week counts) in every term, the cards,
 * the old Resources page and Today (setup and attention items).
 *
 * @param queryClient - The client.
 * @param session - School and user.
 * @param session.schoolId - The school.
 * @param session.userId - The teacher.
 * @param courseId - The course that changed.
 */
function invalidateCourse(queryClient: QueryClient, session: { schoolId: string; userId: string }, courseId: string): void {
  const { schoolId, userId } = session;
  void queryClient.invalidateQueries({ queryKey: queryKeys.schemeOfWork.resources(schoolId, courseId) });
  void queryClient.invalidateQueries({ queryKey: withoutTerm(queryKeys.schemeOfWork.course(schoolId, courseId, CURRENT_TERM_KEY)) });
  void queryClient.invalidateQueries({ queryKey: withoutTerm(queryKeys.schemeOfWork.mine(schoolId, userId, CURRENT_TERM_KEY)) });
  void queryClient.invalidateQueries({ queryKey: queryKeys.resources.all });
  void queryClient.invalidateQueries({ queryKey: queryKeys.teacher.today(schoolId, userId) });
}

/**
 * The teacher's subject cards for a term.
 *
 * @param termId - The term, or undefined for the current one.
 * @returns The query result; the previous term's cards stay while the next load.
 */
export function useSubjectCards(termId: string | undefined): UseQueryResult<SubjectCard[], unknown> {
  const { schoolId, userId, enabled } = useSession();
  return useQuery({
    queryKey: queryKeys.schemeOfWork.mine(schoolId, userId, termId ?? CURRENT_TERM_KEY),
    queryFn: () => subjectsService.getMySubjects(termId),
    enabled,
    staleTime: staleTimes.list,
    placeholderData: keepPreviousData,
  });
}

/**
 * One course's scheme of work for a term.
 *
 * @param courseId - The course, or undefined while none is open.
 * @param termId - The term, or undefined for the current one.
 * @returns The query result.
 */
export function useScheme(courseId: string | undefined, termId: string | undefined): UseQueryResult<SchemeOfWork, unknown> {
  const { schoolId, enabled } = useSession();
  return useQuery({
    queryKey: queryKeys.schemeOfWork.course(schoolId, courseId ?? "none", termId ?? CURRENT_TERM_KEY),
    queryFn: () => subjectsService.getScheme(courseId!, termId),
    enabled: enabled && Boolean(courseId),
    staleTime: staleTimes.list,
  });
}

/**
 * One course's resources, narrowed to a term on the client (resources carry
 * `termId`; the route has no term filter).
 *
 * @param courseId - The course, or undefined.
 * @param termId - The page's term id once known (the scheme's `term.id`).
 * @returns The query result.
 */
export function useCourseResources(courseId: string | undefined, termId: string | undefined): UseQueryResult<CourseResource[], unknown> {
  const { schoolId, enabled } = useSession();
  const select = useCallback((list: CourseResource[]) => resourcesForTerm(list, termId), [termId]);
  return useQuery({
    queryKey: queryKeys.schemeOfWork.resources(schoolId, courseId ?? "none"),
    queryFn: () => subjectsService.getCourseResources(courseId!),
    enabled: enabled && Boolean(courseId),
    staleTime: staleTimes.list,
    select,
  });
}

/**
 * The old text curriculum, read only when the teacher opens "Earlier notes".
 *
 * @param curriculumId - The curriculum, if the course has one.
 * @param open - Whether "Earlier notes" is open.
 * @returns The query result.
 */
export function useLegacyCurriculum(curriculumId: string | undefined, open: boolean): UseQueryResult<Curriculum, unknown> {
  const { schoolId, enabled } = useSession();
  return useQuery({
    queryKey: queryKeys.schemeOfWork.legacy(schoolId, curriculumId ?? "none"),
    queryFn: () => subjectsService.getLegacyCurriculum(curriculumId!),
    enabled: enabled && open && Boolean(curriculumId),
    staleTime: staleTimes.reference,
  });
}

/** What {@link useSaveWeek} takes. */
export interface SaveWeekInput {
  courseId: string;
  week: number;
  topic: string;
  objectives: string;
  /** The page's term param (undefined for current), for the cache key. */
  termParam: string | undefined;
  /** The scheme's term id, sent so the save lands in the term on screen. */
  termId?: string;
}

/**
 * Saves one week's topic and objectives; the response (the whole scheme)
 * replaces the cached one. Today and the timetable show the week's topic, so
 * they are refreshed too.
 *
 * @returns The mutation.
 */
export function useSaveWeek() {
  const queryClient = useQueryClient();
  const { schoolId, userId } = useSession();
  return useMutation({
    mutationFn: (input: SaveWeekInput) =>
      subjectsService.saveWeek(input.courseId, input.week, { topic: input.topic, objectives: input.objectives, ...(input.termId ? { termId: input.termId } : {}) }),
    onSuccess: (scheme, input) => {
      queryClient.setQueryData(queryKeys.schemeOfWork.course(schoolId, input.courseId, input.termParam ?? CURRENT_TERM_KEY), scheme);
      void queryClient.invalidateQueries({ queryKey: queryKeys.teacher.today(schoolId, userId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.timetable.myWeeks(schoolId, userId) });
    },
  });
}

/** What {@link useMarkWeekTaught} takes. */
export interface MarkWeekInput {
  courseId: string;
  week: number;
  taught: boolean;
  termParam: string | undefined;
  termId?: string;
}

/**
 * Marks a week taught (or undoes it). The scheme and the card's progress
 * update at once; a failure puts them back. Afterwards the scheme, the cards,
 * Today and the timetable weeks are refetched (they all show taught weeks).
 *
 * @returns The mutation.
 */
export function useMarkWeekTaught() {
  const queryClient = useQueryClient();
  const { schoolId, userId } = useSession();
  return useMutation({
    mutationFn: (input: MarkWeekInput) =>
      subjectsService.setTaught(input.courseId, input.week, { taught: input.taught, ...(input.termId ? { termId: input.termId } : {}) }),
    onMutate: async (input) => {
      const term = input.termParam ?? CURRENT_TERM_KEY;
      const schemeKey = queryKeys.schemeOfWork.course(schoolId, input.courseId, term);
      const cardsKey = queryKeys.schemeOfWork.mine(schoolId, userId, term);
      await Promise.all([queryClient.cancelQueries({ queryKey: schemeKey }), queryClient.cancelQueries({ queryKey: cardsKey })]);
      const scheme = queryClient.getQueryData<SchemeOfWork>(schemeKey);
      const cards = queryClient.getQueryData<SubjectCard[]>(cardsKey);
      const before = scheme?.weeks.find((w) => w.week === input.week);
      const changed = Boolean(before) && Boolean(before?.taughtAt) !== input.taught;
      if (scheme) {
        const at = new Date().toISOString();
        queryClient.setQueryData<SchemeOfWork>(schemeKey, {
          ...scheme,
          weeks: scheme.weeks.map((w) => (w.week === input.week ? { ...w, taughtAt: input.taught ? at : null } : w)),
        });
      }
      if (cards && changed) {
        queryClient.setQueryData<SubjectCard[]>(
          cardsKey,
          cards.map((c) => (c.course.id === input.courseId ? { ...c, taughtCount: Math.max(0, c.taughtCount + (input.taught ? 1 : -1)) } : c)),
        );
      }
      return { schemeKey, cardsKey, scheme, cards };
    },
    onError: (_error, _input, context) => {
      if (!context) return;
      if (context.scheme) queryClient.setQueryData(context.schemeKey, context.scheme);
      if (context.cards) queryClient.setQueryData(context.cardsKey, context.cards);
    },
    onSettled: (_data, _error, input) => {
      void queryClient.invalidateQueries({ queryKey: withoutTerm(queryKeys.schemeOfWork.course(schoolId, input.courseId, CURRENT_TERM_KEY)) });
      void queryClient.invalidateQueries({ queryKey: withoutTerm(queryKeys.schemeOfWork.mine(schoolId, userId, CURRENT_TERM_KEY)) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.teacher.today(schoolId, userId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.timetable.myWeeks(schoolId, userId) });
    },
  });
}

/**
 * Removes a resource, then refreshes the course's lists and counts.
 *
 * @returns The mutation; `mutateAsync` takes `{ id, courseId }`.
 */
export function useRemoveResource() {
  const queryClient = useQueryClient();
  const { schoolId, userId } = useSession();
  return useMutation({
    mutationFn: (input: { id: string; courseId: string }) => subjectsService.removeResource(input.id),
    onSettled: (_data, _error, input) => invalidateCourse(queryClient, { schoolId, userId }, input.courseId),
  });
}

/** What the upload sheet submits: the payload fields, without the hosted URL. */
export type UploadRequest = Omit<ResourcePayloadInput, "url" | "file"> & { file: File };

/** What {@link useResourceUploader} gives the upload sheet. */
export interface ResourceUploader {
  phase: UploadPhase;
  /** Upload progress, 0-1. */
  progress: number;
  /** The last failure, worded for the teacher; null when there is none. */
  error: string | null;
  /** Uploads the file (unless this file is already hosted) and saves the resource. */
  submit: (request: UploadRequest) => Promise<boolean>;
  /** Aborts an upload in flight. */
  cancel: () => void;
  /** Back to a clean form (after Done or closing the sheet). */
  reset: () => void;
}

/**
 * The two-step upload: the file to Cloudinary with progress and cancel, then
 * `POST /resources`. The hosted URL is kept for the same file, so a retry
 * after the API refused the resource does not upload it again. Every path
 * ends in `idle` (with `error` set) or `done`: nothing is left spinning.
 *
 * @returns See {@link ResourceUploader}.
 */
export function useResourceUploader(): ResourceUploader {
  const queryClient = useQueryClient();
  const { schoolId, userId } = useSession();
  const [phase, setPhase] = useState<UploadPhase>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const hostedRef = useRef<{ file: File; url: string } | null>(null);

  useEffect(() => () => controllerRef.current?.abort(), []);

  const submit = useCallback(
    async (request: UploadRequest): Promise<boolean> => {
      const controller = new AbortController();
      controllerRef.current = controller;
      setError(null);
      setProgress(0);
      try {
        let url = hostedRef.current?.file === request.file ? hostedRef.current.url : "";
        if (!url) {
          setPhase("uploading");
          url = await subjectsService.uploadFile(request.file, { signal: controller.signal, onProgress: setProgress });
          hostedRef.current = { file: request.file, url };
        }
        if (controller.signal.aborted) throw Object.assign(new Error("Upload cancelled."), { name: "UploadError", aborted: true });
        setPhase("saving");
        await subjectsService.createResource(buildResourcePayload({ ...request, url }));
        setPhase("done");
        invalidateCourse(queryClient, { schoolId, userId }, request.courseId);
        return true;
      } catch (caught) {
        setPhase("idle");
        if (isUploadAborted(caught)) return false;
        logger.error("subjects", "resource upload failed", caught);
        setError(uploadErrorMessage(caught));
        return false;
      } finally {
        if (controllerRef.current === controller) controllerRef.current = null;
      }
    },
    [queryClient, schoolId, userId],
  );

  const cancel = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
  }, []);

  const reset = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    hostedRef.current = null;
    setPhase("idle");
    setProgress(0);
    setError(null);
  }, []);

  return { phase, progress, error, submit, cancel, reset };
}
