"use client";

/**
 * The submit path of the marking screen, built for a classroom with a weak
 * signal:
 *
 * - **Marks are never lost.** What the teacher chose (and any absence reason)
 *   lives in `drafts`, separate from the server data, and is cleared only when
 *   the server confirms the mark. A failed request leaves the draft in place
 *   and marks that row `failed` with a Retry; drafts are mirrored to
 *   `sessionStorage` so a reload or a killed tab does not lose them either.
 * - **No double submit.** A synchronous in-flight set (state updates are
 *   asynchronous) makes a second tap on a row that is already sending a no-op.
 * - **A lost answer is not a lost mark.** A timeout can mean the server stored
 *   the mark and the reply never arrived; the server then answers a retry with
 *   400 "already recorded". On those failures the roster is re-read, and a
 *   student the server now holds is treated as done rather than as an error.
 * - **One request per mark.** The current term comes from the cached
 *   `useCurrentTerm` query, not a fetch per submit, and a stored mark is
 *   written straight into the cached roster instead of refetching it.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { attendanceService } from "@/app/services/attendance/attendance.service";
import {
  applyMarkToStatus,
  buildAttendancePayload,
  classifySubmitFailure,
  localDayKey,
  pruneDrafts,
  type DraftMark,
} from "@/app/services/attendance/attendance.helpers";
import { classAttendanceKey } from "@/hooks/attendance/useClassAttendanceStatus";
import { useCurrentTerm } from "@/hooks/academic/useCurrentTerm";
import { useSchoolId } from "@/hooks/useSchoolId";
import { useTeacherOnboarding } from "@/app/context/OnboardingContext";
import { toast } from "@/components/CustomToast";
import { logger } from "@/lib/logger";
import type { ClassAttendanceStatus, MarkableStatus } from "@/types/attendance";

/** Where one row is in its submit. */
export interface RowState {
  phase: "submitting" | "failed";
  /** Why the last attempt failed; present when `phase` is `failed`. */
  message?: string;
  /** False when retrying unchanged cannot help (403, 404). */
  retryable?: boolean;
}

/** What {@link useAttendanceMarking} hands the marking screen. */
export interface AttendanceMarking {
  drafts: Record<string, DraftMark>;
  rows: Record<string, RowState>;
  /** Marks whose last attempt failed and can be retried. */
  failedCount: number;
  /** The current term has loaded, so a mark can be built. */
  termReady: boolean;
  /** Loading the term failed; marks cannot be sent until it loads. */
  termFailed: boolean;
  retryTerm: () => void;
  setStatus: (studentId: string, status: MarkableStatus) => void;
  setReason: (studentId: string, reason: string) => void;
  /** Sends one student's mark; a no-op while that student is already sending. */
  submit: (studentId: string) => Promise<void>;
  /** Retries every failed mark, one after another. */
  retryFailed: () => Promise<void>;
}

const storageKey = (schoolId: string | null, classId: string, day: string) =>
  `attendance-drafts:${schoolId ?? "none"}:${classId}:${day}`;

/**
 * Reads unsent marks saved by an earlier visit today.
 *
 * @param key - The storage key.
 * @returns The saved drafts, or an empty object when there are none or storage is unavailable.
 */
function readDrafts(key: string): Record<string, DraftMark> {
  try {
    const raw = sessionStorage.getItem(key);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, DraftMark>) : {};
  } catch {
    return {};
  }
}

/**
 * Saves (or clears) unsent marks. Storage can be unavailable (private windows,
 * blocked site data); the marks still live in memory then.
 *
 * @param key - The storage key.
 * @param drafts - The unsent marks.
 */
function writeDrafts(key: string, drafts: Record<string, DraftMark>): void {
  try {
    if (Object.keys(drafts).length === 0) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, JSON.stringify(drafts));
  } catch {
    /* in-memory drafts still work */
  }
}

/**
 * Draft marks and the submit flow for one class.
 *
 * @param classId - The class being marked.
 * @param status - The roster as currently loaded; used to prune drafts the
 *   server already has and to name students in messages.
 * @returns The state and actions the marking screen renders from.
 */
export function useAttendanceMarking(classId: string, status: ClassAttendanceStatus | undefined): AttendanceMarking {
  const queryClient = useQueryClient();
  const schoolId = useSchoolId();
  const term = useCurrentTerm();
  const { markStepComplete } = useTeacherOnboarding();

  const day = localDayKey();
  const key = storageKey(schoolId, classId, day);

  const [drafts, setDrafts] = useState<Record<string, DraftMark>>({});
  const [rows, setRows] = useState<Record<string, RowState>>({});
  const inFlight = useRef(new Set<string>());
  const draftsRef = useRef(drafts);
  draftsRef.current = drafts;
  const statusRef = useRef(status);
  statusRef.current = status;
  const [hydratedKey, setHydratedKey] = useState<string | null>(null);

  // Restore today's unsent marks once per class/day, then keep storage in step.
  useEffect(() => {
    if (hydratedKey === key) return;
    setDrafts(readDrafts(key));
    setRows({});
    setHydratedKey(key);
  }, [key, hydratedKey]);

  useEffect(() => {
    if (hydratedKey === key) writeDrafts(key, drafts);
  }, [key, hydratedKey, drafts]);

  // A mark the server already holds is no longer a draft.
  useEffect(() => {
    if (!status) return;
    setDrafts((prev) => pruneDrafts(prev, status.students));
    setRows((prev) => {
      const marked = new Set(status.students.filter((s) => s.attendanceMarked).map((s) => s.studentId));
      const stale = Object.keys(prev).filter((id) => marked.has(id) && prev[id].phase === "failed");
      if (stale.length === 0) return prev;
      const next = { ...prev };
      for (const id of stale) delete next[id];
      return next;
    });
  }, [status]);

  const setStatus = useCallback((studentId: string, next: MarkableStatus) => {
    setDrafts((prev) => ({ ...prev, [studentId]: { ...prev[studentId], status: next } }));
    setRows((prev) => (prev[studentId]?.phase === "failed" ? withoutKey(prev, studentId) : prev));
  }, []);

  const setReason = useCallback((studentId: string, reason: string) => {
    setDrafts((prev) => ({ ...prev, [studentId]: { ...prev[studentId], reason } }));
  }, []);

  const clearRow = useCallback((studentId: string) => {
    setDrafts((prev) => withoutKey(prev, studentId));
    setRows((prev) => withoutKey(prev, studentId));
  }, []);

  /** Re-reads the roster; resolves to whether the server now holds this student's mark. */
  const serverHasMark = useCallback(
    async (studentId: string): Promise<boolean> => {
      try {
        const fresh = await queryClient.fetchQuery({
          queryKey: classAttendanceKey(schoolId, classId),
          queryFn: () => attendanceService.getClassStatus(classId),
          staleTime: 0,
        });
        return fresh.students.some((s) => s.studentId === studentId && s.attendanceMarked);
      } catch (error) {
        logger.error("attendance", "Could not re-read the roster after a failed submit", error);
        return false;
      }
    },
    [queryClient, schoolId, classId],
  );

  const submit = useCallback(
    async (studentId: string): Promise<void> => {
      if (inFlight.current.has(studentId)) return;

      const draft = draftsRef.current[studentId];
      const built = buildAttendancePayload({
        studentId,
        classId,
        termId: term.data?._id,
        status: draft?.status,
        absenceReason: draft?.reason,
      });
      if (!built.ok) {
        toast.error(built.message);
        return;
      }

      const student = statusRef.current?.students.find((s) => s.studentId === studentId);
      const name = student ? `${student.firstName} ${student.lastName}`.trim() : "this student";

      inFlight.current.add(studentId);
      setRows((prev) => ({ ...prev, [studentId]: { phase: "submitting" } }));

      try {
        const stored = await attendanceService.mark(built.payload);
        queryClient.setQueryData<ClassAttendanceStatus>(classAttendanceKey(schoolId, classId), (prev) =>
          prev
            ? applyMarkToStatus(prev, studentId, {
                status: built.payload.status,
                absenceReason: built.payload.absenceReason,
                recordedAt: new Date().toISOString(),
              })
            : prev,
        );
        clearRow(studentId);
        markStepComplete("mark-attendance");
        toast.success(`Attendance submitted for ${name}`);
        logger.debug("attendance", "Stored mark", stored?._id);
      } catch (error) {
        logger.error("attendance", "Submitting a mark failed", error);
        const failure = classifySubmitFailure(error);

        if (failure.reconcile && (await serverHasMark(studentId))) {
          clearRow(studentId);
          toast.success(`${name} was already marked. The list is up to date.`);
        } else {
          setRows((prev) => ({
            ...prev,
            [studentId]: { phase: "failed", message: failure.message, retryable: failure.retryable },
          }));
          toast.error(failure.message);
        }
      } finally {
        inFlight.current.delete(studentId);
      }
    },
    [classId, term.data?._id, queryClient, schoolId, clearRow, markStepComplete, serverHasMark],
  );

  const retryFailed = useCallback(async (): Promise<void> => {
    const failed = Object.entries(rows)
      .filter(([, row]) => row.phase === "failed" && row.retryable !== false)
      .map(([id]) => id);
    for (const id of failed) await submit(id);
  }, [rows, submit]);

  const failedCount = useMemo(() => Object.values(rows).filter((row) => row.phase === "failed").length, [rows]);

  const refetchTerm = term.refetch;
  const retryTerm = useCallback(() => {
    void refetchTerm();
  }, [refetchTerm]);

  return {
    drafts,
    rows,
    failedCount,
    termReady: Boolean(term.data?._id),
    termFailed: term.isError && !term.data,
    retryTerm,
    setStatus,
    setReason,
    submit,
    retryFailed,
  };
}

/**
 * A copy of a record without one key.
 *
 * @param source - The record.
 * @param omit - The key to drop.
 * @returns The same object when the key is absent, otherwise a copy without it.
 */
function withoutKey<T>(source: Record<string, T>, omit: string): Record<string, T> {
  if (!(omit in source)) return source;
  const next = { ...source };
  delete next[omit];
  return next;
}
