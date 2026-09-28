"use client";

/**
 * Data hooks for the redesigned Attendance screen.
 *
 * - `useMyClasses`: `GET /teachers/me/classes` (also the Students tabs).
 * - `useRegisterView`: `GET /registers/:classId?date=`.
 * - `useRegisterEditor`: the teacher's marks over that register, saved as a
 *   draft (`PUT … { submit: false }`) 700ms after the last change, and the
 *   submit (`submit: true`) with its 409 handling, toast and cache updates.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { keepPreviousData, useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { useAuth } from "@/app/context/AuthContext";
import { classroomService } from "@/app/services/classroom/classroom.service";
import { toast } from "@/components/CustomToast";
import { getErrorMessage } from "@/lib/apiError";
import { logger } from "@/lib/logger";
import { queryKeys } from "@/lib/queryKeys";
import {
  marksFor,
  mergeMarks,
  missingFromError,
  parentsToNotify,
  pruneSaved,
  submittedMessage,
  type LocalMark,
  type MarkOverlay,
} from "@/hooks/attendance/register.logic";
import type { MyClass, RegisterStudent, RegisterView } from "@/types/classroom";

/** How long after the last change a draft is saved. */
export const DRAFT_DEBOUNCE_MS = 700;

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
 * The signed-in teacher's classes.
 *
 * @returns The query result.
 */
export function useMyClasses(): UseQueryResult<MyClass[], unknown> {
  const { schoolId, userId, enabled } = useSession();
  return useQuery({
    queryKey: queryKeys.classroom.myClasses(schoolId, userId),
    queryFn: classroomService.getMyClasses,
    enabled,
    staleTime: 5 * 60_000,
  });
}

/**
 * One class's register for a day.
 *
 * @param classId - The class, or undefined while none is chosen.
 * @param date - `YYYY-MM-DD`, or undefined for today.
 * @returns The query result; the previous register stays on screen while the next loads.
 */
export function useRegisterView(classId: string | undefined, date: string | undefined): UseQueryResult<RegisterView, unknown> {
  const { schoolId, enabled } = useSession();
  return useQuery({
    queryKey: queryKeys.classroom.register(schoolId, classId ?? "none", date ?? "today"),
    queryFn: () => classroomService.getRegister(classId!, date),
    enabled: enabled && Boolean(classId),
    staleTime: 15_000,
    refetchOnWindowFocus: true,
    placeholderData: keepPreviousData,
  });
}

/** Where the draft save stands. */
export type DraftState = { kind: "idle" } | { kind: "saving" } | { kind: "saved"; at: number } | { kind: "error"; message: string };

/** What {@link useRegisterEditor} gives the screen. */
export interface RegisterEditor {
  /** The server's students with the local marks laid over them. */
  students: RegisterStudent[];
  /** Whether a submitted register has been reopened with "Edit register". */
  editing: boolean;
  draft: DraftState;
  submitting: boolean;
  /** Parents a submit would notify now. */
  toNotify: number;
  setMark: (studentId: string, patch: Partial<LocalMark>) => void;
  markRest: (overlay: (current: MarkOverlay) => MarkOverlay) => void;
  startEditing: () => void;
  cancelEditing: () => void;
  /** Saves the pending draft now (Retry). */
  retryDraft: () => void;
  submit: () => Promise<void>;
}

/**
 * The teacher's marks on one register. While the register is not submitted,
 * every change is saved as a draft shortly after the last one, so marks
 * survive a reload. A reopened (submitted) register keeps its changes on this
 * device until Resubmit, so Cancel really discards them. Changing class or
 * day saves any pending draft first.
 *
 * @param view - The register, once loaded.
 * @param dateParam - The date the register was requested with (undefined for today), for the cache key.
 * @returns The editor.
 */
export function useRegisterEditor(view: RegisterView | undefined, dateParam: string | undefined): RegisterEditor {
  const queryClient = useQueryClient();
  const { schoolId, userId } = useSession();
  const [overlay, setOverlay] = useState<MarkOverlay>({});
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<DraftState>({ kind: "idle" });
  const [submitting, setSubmitting] = useState(false);

  const classId = view?.class.id;
  const scope = view ? `${view.class.id}|${view.date}` : "";
  const key = queryKeys.classroom.register(schoolId, classId ?? "none", dateParam ?? "today");

  // Refs so the debounced save and the flush on unmount see current values.
  const overlayRef = useRef(overlay);
  overlayRef.current = overlay;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<{ classId: string; date: string; key: readonly unknown[] } | null>(null);

  const saveDraft = useCallback(
    async (target: { classId: string; date: string; key: readonly unknown[] }, marks: MarkOverlay) => {
      const server = queryClient.getQueryData<RegisterView>(target.key);
      const students = mergeMarks(server?.students ?? [], marks).filter((s) => marks[s.id]);
      const body = { marks: marksFor(students), submit: false };
      if (body.marks.length === 0) return;
      setDraft({ kind: "saving" });
      try {
        const saved = await classroomService.saveRegister(target.classId, target.date, body);
        queryClient.setQueryData(target.key, saved);
        setOverlay((current) => pruneSaved(current, saved.students));
        setDraft({ kind: "saved", at: Date.now() });
      } catch (error) {
        logger.warn("attendance", "draft save failed", error);
        setDraft({ kind: "error", message: getErrorMessage(error, "Your marks are not saved yet.") });
      }
    },
    [queryClient],
  );

  const flush = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const target = pending.current;
    pending.current = null;
    if (target) void saveDraft(target, overlayRef.current);
  }, [saveDraft]);

  // A new class or day: save what is pending for the old one, then start clean.
  useEffect(() => {
    setOverlay({});
    setEditing(false);
    setDraft({ kind: "idle" });
    return () => flush();
  }, [scope, flush]);

  const schedule = useCallback(() => {
    if (!view || (view.submittedAt && editing)) return;
    pending.current = { classId: view.class.id, date: view.date, key };
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, DRAFT_DEBOUNCE_MS);
  }, [view, editing, key, flush]);

  const setMark = useCallback(
    (studentId: string, patch: Partial<LocalMark>) => {
      const base = view?.students.find((s) => s.id === studentId);
      setOverlay((current) => {
        const prev: LocalMark = current[studentId] ?? {
          status: base?.status === "present" || base?.status === "late" || base?.status === "absent" ? base.status : "present",
          absenceReason: base?.absenceReason ?? null,
          note: base?.note ?? null,
        };
        const next: LocalMark = { ...prev, ...patch };
        if (next.status !== "absent") next.absenceReason = null;
        const updated = { ...current, [studentId]: next };
        overlayRef.current = updated;
        return updated;
      });
      schedule();
    },
    [view, schedule],
  );

  const markRest = useCallback(
    (update: (current: MarkOverlay) => MarkOverlay) => {
      setOverlay((current) => {
        const updated = update(current);
        overlayRef.current = updated;
        return updated;
      });
      schedule();
    },
    [schedule],
  );

  const students = useMemo(() => mergeMarks(view?.students ?? [], overlay), [view, overlay]);
  const absentAtLastSubmit = useMemo(
    () => (view?.submittedAt ? view.students.filter((s) => s.status === "absent").map((s) => s.id) : []),
    [view],
  );
  const toNotify = parentsToNotify(students, absentAtLastSubmit);

  const submit = useCallback(async () => {
    if (!view) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    pending.current = null;
    setSubmitting(true);
    try {
      const saved = await classroomService.saveRegister(view.class.id, view.date, { marks: marksFor(students), submit: true });
      queryClient.setQueryData(key, saved);
      setOverlay({});
      setEditing(false);
      setDraft({ kind: "idle" });
      toast.success(submittedMessage(view.class.name, saved.notified));
      // Today's badges, attention list and class cards, and the Students stats, all read the register.
      void queryClient.invalidateQueries({ queryKey: queryKeys.teacher.today(schoolId, userId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.classroom.roster(schoolId, view.class.id) });
    } catch (error) {
      const missing = missingFromError(error);
      if (missing !== null) {
        toast.error(`${missing} ${missing === 1 ? "student still needs" : "students still need"} a mark before you can submit.`);
        void queryClient.invalidateQueries({ queryKey: key });
      } else {
        toast.error(getErrorMessage(error, "The register was not submitted. Please try again."));
        if (error && typeof error === "object" && "status" in error && (error as { status: number }).status === 403) {
          void queryClient.invalidateQueries({ queryKey: key });
        }
      }
    } finally {
      setSubmitting(false);
    }
  }, [view, students, queryClient, key, schoolId, userId]);

  return {
    students,
    editing,
    draft,
    submitting,
    toNotify,
    setMark,
    markRest,
    startEditing: () => setEditing(true),
    cancelEditing: () => {
      setOverlay({});
      setEditing(false);
    },
    retryDraft: () => {
      if (view) pending.current = { classId: view.class.id, date: view.date, key };
      flush();
    },
    submit,
  };
}
