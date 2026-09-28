"use client";

/**
 * Data hooks for the redesigned Grading page (`src/app/services/grading`).
 *
 * - `useCourseSheet`: `GET /grading/course/:courseId?termId=`.
 * - `useSaveScores`, `usePublishScores`, `useUnlockScores`: the score sheet's
 *   writes; each refreshes the class report, Today (whose attention list
 *   counts scores) and the student records.
 * - `useReadiness`, `useBroadsheet`, `useRemarks`, `useTermResults` and
 *   `useSendReminder`, `useSubmitTermResults`: the class report.
 * - `useRemarksAutosave`: the Remarks tab's text, saved as the teacher types.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient, type QueryClient, type UseQueryResult } from "@tanstack/react-query";
import { useAuth } from "@/app/context/AuthContext";
import { gradingService } from "@/app/services/grading/grading.service";
import { getErrorMessage } from "@/lib/apiError";
import { queryKeys } from "@/lib/queryKeys";
import type { Broadsheet, ClassReadiness, CourseGradingSheet, TermRemarks, TermResultSubmission } from "@/types/grading";
import { RemarkAutosaver, type AutosaveState } from "./remarkAutosave";

/**
 * Who is asking, for query keys; nothing is fetched until there is a session
 * without a pending password change.
 *
 * @returns The school and user ids and whether queries may run.
 */
export function useGradingSession(): { schoolId: string; userId: string; enabled: boolean } {
  const { user, schoolId } = useAuth();
  const userId = user?.userId ?? "";
  return { schoolId: schoolId ?? "none", userId: userId || "none", enabled: Boolean(schoolId && userId) && !user?.mustChangePassword };
}

/**
 * The term segment of a key: the id, or `"current"`.
 *
 * @param termId - The term picked, if any.
 * @returns The key segment.
 */
const termKey = (termId: string | undefined) => termId ?? "current";

/**
 * Refreshes everything a change of scores shows up in: the class report,
 * Today's attention list and the student records.
 *
 * @param queryClient - The client.
 * @param schoolId - The school.
 * @param userId - The teacher.
 */
export function invalidateAfterScores(queryClient: QueryClient, schoolId: string, userId: string): void {
  for (const part of ["readiness", "broadsheet", "remarks"]) void queryClient.invalidateQueries({ queryKey: ["grading", schoolId, part] });
  void queryClient.invalidateQueries({ queryKey: queryKeys.teacher.today(schoolId, userId) });
  void queryClient.invalidateQueries({ queryKey: ["classroom", schoolId, "student"] });
}

/**
 * One course's score sheet for a term.
 *
 * @param courseId - The course, or undefined while none is chosen.
 * @param termId - The term, or undefined for the current one.
 * @returns The query result.
 */
export function useCourseSheet(courseId: string | undefined, termId: string | undefined): UseQueryResult<CourseGradingSheet, unknown> {
  const { schoolId, enabled } = useGradingSession();
  return useQuery({
    queryKey: queryKeys.grading.sheet(schoolId, courseId ?? "none", termKey(termId)),
    queryFn: () => gradingService.getSheet(courseId!, termId),
    enabled: enabled && Boolean(courseId),
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  });
}

/** What a score save needs. */
export interface SaveScoresInput {
  courseId: string;
  assessmentId: string;
  termId: string | undefined;
  scores: { studentId: string; score: number | null }[];
}

/**
 * Saves one assessment's scores; the response (the whole sheet) replaces the cached sheet.
 *
 * @returns The mutation.
 */
export function useSaveScores() {
  const queryClient = useQueryClient();
  const { schoolId, userId } = useGradingSession();
  return useMutation({
    mutationFn: (input: SaveScoresInput) =>
      gradingService.saveScores(input.courseId, input.assessmentId, { ...(input.termId ? { termId: input.termId } : {}), scores: input.scores }),
    onSuccess: (sheet, input) => {
      queryClient.setQueryData(queryKeys.grading.sheet(schoolId, input.courseId, termKey(input.termId)), sheet);
      invalidateAfterScores(queryClient, schoolId, userId);
    },
  });
}

/** Which assessment of which course. */
export interface AssessmentRef {
  courseId: string;
  assessmentId: string;
  termId: string | undefined;
}

/**
 * Publishes an assessment's scores, then reloads the sheet.
 *
 * @returns The mutation.
 */
export function usePublishScores() {
  const queryClient = useQueryClient();
  const { schoolId, userId } = useGradingSession();
  return useMutation({
    mutationFn: (input: AssessmentRef) => gradingService.publish(input.courseId, input.assessmentId),
    onSettled: (_result, _error, input) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.grading.sheet(schoolId, input.courseId, termKey(input.termId)) });
      invalidateAfterScores(queryClient, schoolId, userId);
    },
  });
}

/**
 * Unlocks published scores to correct a mistake, then reloads the sheet.
 *
 * @returns The mutation.
 */
export function useUnlockScores() {
  const queryClient = useQueryClient();
  const { schoolId, userId } = useGradingSession();
  return useMutation({
    mutationFn: (input: AssessmentRef & { reason?: string }) =>
      gradingService.unlock(input.courseId, input.assessmentId, input.reason ? { reason: input.reason } : {}),
    onSettled: (_result, _error, input) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.grading.sheet(schoolId, input.courseId, termKey(input.termId)) });
      invalidateAfterScores(queryClient, schoolId, userId);
    },
  });
}

/**
 * Which subjects of a class have published which assessment.
 *
 * @param classId - The class, or undefined while none is chosen.
 * @param termId - The term, or undefined for the current one.
 * @returns The query result.
 */
export function useReadiness(classId: string | undefined, termId: string | undefined): UseQueryResult<ClassReadiness, unknown> {
  const { schoolId, enabled } = useGradingSession();
  return useQuery({
    queryKey: queryKeys.grading.readiness(schoolId, classId ?? "none", termKey(termId)),
    queryFn: () => gradingService.getReadiness(classId!, termId),
    enabled: enabled && Boolean(classId),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
}

/**
 * A class's broadsheet for one basis; the previous basis stays on screen while the next loads.
 *
 * @param classId - The class.
 * @param termId - The term, or undefined for the current one.
 * @param basis - An assessment id or `total`; undefined while unknown.
 * @returns The query result.
 */
export function useBroadsheet(classId: string | undefined, termId: string | undefined, basis: string | undefined): UseQueryResult<Broadsheet, unknown> {
  const { schoolId, enabled } = useGradingSession();
  return useQuery({
    queryKey: queryKeys.grading.broadsheet(schoolId, classId ?? "none", termKey(termId), basis ?? "none"),
    queryFn: () => gradingService.getBroadsheet(classId!, basis!, termId),
    enabled: enabled && Boolean(classId && basis),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}

/**
 * A class's remarks rows.
 *
 * @param classId - The class.
 * @param termId - The term, or undefined for the current one.
 * @returns The query result.
 */
export function useRemarks(classId: string | undefined, termId: string | undefined): UseQueryResult<TermRemarks, unknown> {
  const { schoolId, enabled } = useGradingSession();
  return useQuery({
    queryKey: queryKeys.grading.remarks(schoolId, classId ?? "none", termKey(termId)),
    queryFn: () => gradingService.getRemarks(classId!, termId),
    enabled: enabled && Boolean(classId),
    staleTime: 30_000,
  });
}

/**
 * A class's term-result submissions.
 *
 * @param classId - The class.
 * @param termId - The term, or undefined for the current one.
 * @returns The query result.
 */
export function useTermResults(classId: string | undefined, termId: string | undefined): UseQueryResult<TermResultSubmission[], unknown> {
  const { schoolId, enabled } = useGradingSession();
  return useQuery({
    queryKey: queryKeys.grading.termResults(schoolId, classId ?? "none", termKey(termId)),
    queryFn: () => gradingService.getTermResults(classId!, termId),
    enabled: enabled && Boolean(classId),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
}

/**
 * Sends a colleague a reminder.
 *
 * @returns The mutation.
 */
export function useSendReminder() {
  return useMutation({
    mutationFn: (input: { classId: string; courseId: string; assessmentId: string }) =>
      gradingService.sendReminder(input.classId, { courseId: input.courseId, assessmentId: input.assessmentId }),
  });
}

/**
 * Submits a class's summary to the school office, then reloads the submissions and remarks (now locked).
 *
 * @returns The mutation.
 */
export function useSubmitTermResults() {
  const queryClient = useQueryClient();
  const { schoolId } = useGradingSession();
  return useMutation({
    mutationFn: (input: { classId: string; termId: string | undefined; basis: string }) =>
      gradingService.submitTermResults(input.classId, { ...(input.termId ? { termId: input.termId } : {}), basis: input.basis }),
    onSettled: (_result, _error, input) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.grading.termResults(schoolId, input.classId, termKey(input.termId)) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.grading.broadsheet(schoolId, input.classId, termKey(input.termId), input.basis) });
    },
  });
}

/** What {@link useRemarksAutosave} gives the Remarks tab. */
export interface RemarksAutosave {
  /** The text to show for a student: what was typed, else what is saved. */
  textOf: (studentId: string, saved: string) => string;
  /** Records a keystroke; ignored while locked. */
  edit: (studentId: string, text: string) => void;
  state: AutosaveState;
  /** Sends what is queued now. */
  retry: () => void;
  /** Whether edits are waiting to be saved. */
  busy: boolean;
}

/**
 * The Remarks tab's text and its autosave (`PUT /grading/classes/:classId/remarks`,
 * batched 800ms after the last keystroke). The response replaces the cached
 * rows. Locked while the class's results are with the office or published;
 * a 409 locks it too and reloads the submissions. Switching class or term
 * sends what is queued first.
 *
 * @param classId - The class.
 * @param termId - The term, or undefined for the current one.
 * @param locked - Whether the remarks are locked (from the submissions).
 * @returns See {@link RemarksAutosave}.
 */
export function useRemarksAutosave(classId: string | undefined, termId: string | undefined, locked: boolean): RemarksAutosave {
  const queryClient = useQueryClient();
  const { schoolId } = useGradingSession();
  const [typed, setTyped] = useState<Record<string, string>>({});
  const [state, setState] = useState<AutosaveState>({ kind: "idle" });
  const [busy, setBusy] = useState(false);
  const saverRef = useRef<RemarkAutosaver | null>(null);

  useEffect(() => {
    if (!classId) return;
    const remarksKey = queryKeys.grading.remarks(schoolId, classId, termKey(termId));
    const saver = new RemarkAutosaver({
      save: async (remarks) => {
        const rows = await gradingService.saveRemarks(classId, { ...(termId ? { termId } : {}), remarks });
        if (rows && Array.isArray(rows.rows)) queryClient.setQueryData(remarksKey, rows);
      },
      onState: (next) => {
        setState(next);
        setBusy(saver.busy || next.kind === "pending" || next.kind === "saving");
        if (next.kind === "locked") void queryClient.invalidateQueries({ queryKey: queryKeys.grading.termResults(schoolId, classId, termKey(termId)) });
      },
      isLocked: (error) => Boolean(error && typeof error === "object" && "status" in error && (error as { status: number }).status === 409),
      message: (error) => getErrorMessage(error, "Your remarks are not saved yet."),
    });
    saverRef.current = saver;
    setTyped({});
    setState({ kind: "idle" });
    setBusy(false);
    return () => {
      void saver.flush();
      saver.dispose();
      if (saverRef.current === saver) saverRef.current = null;
    };
  }, [classId, termId, schoolId, queryClient]);

  useEffect(() => {
    saverRef.current?.setLocked(locked);
  }, [locked, classId, termId]);

  const edit = useCallback((studentId: string, text: string) => {
    if (saverRef.current?.edit(studentId, text)) setTyped((current) => ({ ...current, [studentId]: text.slice(0, 500) }));
  }, []);

  const textOf = useCallback((studentId: string, saved: string) => typed[studentId] ?? saved, [typed]);

  return useMemo(
    () => ({ textOf, edit, state, retry: () => void saverRef.current?.flush(), busy }),
    [textOf, edit, state, busy],
  );
}
