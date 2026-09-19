"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { UseQueryResult } from "@tanstack/react-query";
import { useAppContext } from "@/app/context/AppContext";
import { useAuth } from "@/app/context/AuthContext";
import { toast } from "@/components/CustomToast";
import { useCurrentTerm } from "@/hooks/academic/useCurrentTerm";
import { getErrorMessage } from "@/lib/apiError";
import { logger } from "@/lib/logger";
import { parseCurriculumParams, viewRoute, type CurriculumParams } from "./params";
import type { Curriculum } from "./types";
import { idOf } from "./access";
import { useCurriculumAccess, type CurriculumAccess } from "./useCurriculumAccess";
import { useDeleteCurriculum } from "./useCurriculumMutations";
import { useCurriculumByCourseTerm } from "./useCurriculumQueries";

/** A course as the curriculum screens need it. */
export interface PageCourse {
  _id: string;
  title?: string;
  name?: string;
  courseCode?: string;
  code?: string;
  description?: string;
}

/** What {@link useCurriculumPage} hands the page. */
export interface CurriculumPageState {
  params: CurriculumParams;
  isAuthenticated: boolean;
  /** The course the page is about, from the URL or the teacher's roster. */
  course: PageCourse | null;
  teacherCourses: PageCourse[];
  currentTerm: { _id: string; name?: string } | null;
  termLoading: boolean;
  /** The course's curriculum for the term; `null` when none exists. */
  curriculumQuery: UseQueryResult<Curriculum | null, unknown>;
  /** True while the curriculum (or the term it is looked up under) is loading. */
  isLoading: boolean;
  /** Why the curriculum (or the term) could not be loaded. */
  error: unknown;
  /** Tries the failed reads again. */
  retry: () => void;
  access: CurriculumAccess;
  /** The editor's target: `null` closed, `{ curriculum: null }` a new one. */
  editorTarget: { curriculum: Curriculum | null } | null;
  /** The curriculum open in the detail modal. */
  detail: Curriculum | null;
  /** The curriculum the teacher asked to delete, awaiting confirmation. */
  pendingDelete: Curriculum | null;
  isDeleting: boolean;
  openCreate: () => void;
  openEdit: (curriculum: Curriculum) => void;
  closeEditor: () => void;
  openDetail: (curriculum: Curriculum) => void;
  closeDetail: () => void;
  requestDelete: (curriculum: Curriculum) => void;
  cancelDelete: () => void;
  confirmDelete: () => Promise<void>;
  goToSubjects: () => void;
  goBack: () => void;
}

/**
 * Everything the curriculum page needs: the URL, the cached curriculum for the
 * course and term, access, and the editor / detail / delete flows.
 *
 * Hooks are all called unconditionally here, so the page can return early
 * (signed out, no course, error) without breaking hook order — the page used to
 * call `useEffect` after a conditional return.
 *
 * @returns The state and actions described by {@link CurriculumPageState}.
 */
export function useCurriculumPage(): CurriculumPageState {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { teacherData } = useAppContext();

  const params = useMemo(() => parseCurriculumParams(searchParams), [searchParams]);
  const termQuery = useCurrentTerm();
  const termId = params.termId ?? termQuery.data?._id ?? null;
  const curriculumQuery = useCurriculumByCourseTerm(params.courseId, termId);
  const access = useCurriculumAccess(params.courseId);
  const deleteMutation = useDeleteCurriculum();

  const [editing, setEditing] = useState<{ curriculum: Curriculum | null } | null>(
    params.mode === "create" ? { curriculum: null } : null,
  );
  const [editDismissed, setEditDismissed] = useState(false);
  const [detail, setDetail] = useState<Curriculum | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Curriculum | null>(null);

  const teacherCourses = useMemo(() => {
    const assigned = teacherData?.assignedCourses;
    return Array.isArray(assigned) ? (assigned as PageCourse[]) : [];
  }, [teacherData]);

  const course: PageCourse | null = useMemo(() => {
    if (!params.courseId) return null;
    const known = teacherCourses.find((item) => idOf(item) === params.courseId);
    if (known) return known;
    return params.courseTitle
      ? { _id: params.courseId, name: params.courseTitle, courseCode: params.courseCode ?? "" }
      : null;
  }, [params.courseId, params.courseTitle, params.courseCode, teacherCourses]);

  // `?mode=edit` opens the curriculum the URL points at as soon as it loads.
  const editorTarget =
    editing ??
    (params.mode === "edit" && !editDismissed && curriculumQuery.data ? { curriculum: curriculumQuery.data } : null);

  const closeEditor = () => {
    const previous = editorTarget?.curriculum;
    setEditing(null);
    setEditDismissed(true);

    if ((params.mode === "edit" || params.mode === "create") && params.courseId && params.termId) {
      router.push(viewRoute(params.courseId, params.termId, params.curriculumId ?? previous?._id ?? null));
      return;
    }
    if (!params.courseId) router.push("/subjects");
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteMutation.mutateAsync(pendingDelete._id);
      toast.success("Curriculum deleted");
      setPendingDelete(null);
    } catch (error) {
      logger.error("curriculum", "deleting the curriculum failed", error);
      toast.error(getErrorMessage(error, "Failed to delete curriculum"));
    }
  };

  return {
    params,
    isAuthenticated,
    course,
    teacherCourses,
    currentTerm: termQuery.data ? { _id: termQuery.data._id, name: termQuery.data.name } : null,
    termLoading: termQuery.isLoading,
    curriculumQuery,
    isLoading: curriculumQuery.isLoading || (!params.termId && termQuery.isLoading),
    error: curriculumQuery.error ?? (params.termId ? null : termQuery.error),
    retry: () => {
      if (curriculumQuery.error) curriculumQuery.refetch();
      if (termQuery.error) termQuery.refetch();
    },
    access,
    editorTarget,
    detail,
    pendingDelete,
    isDeleting: deleteMutation.isPending,
    openCreate: () => setEditing({ curriculum: null }),
    openEdit: (curriculum) => setEditing({ curriculum }),
    closeEditor,
    openDetail: setDetail,
    closeDetail: () => setDetail(null),
    requestDelete: setPendingDelete,
    cancelDelete: () => setPendingDelete(null),
    confirmDelete,
    goToSubjects: () => router.push("/subjects"),
    goBack: () => router.back(),
  };
}
