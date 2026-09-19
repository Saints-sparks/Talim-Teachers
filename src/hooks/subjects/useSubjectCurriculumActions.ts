"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { getCurriculumByCourseAndTerm } from "@/app/services/curriculum.services";
import { useCurrentTerm } from "@/hooks/academic/useCurrentTerm";
import { viewRoute } from "@/hooks/curriculum/params";
import { useCurriculumAccess } from "@/hooks/curriculum/useCurriculumAccess";
import { toast } from "@/components/CustomToast";
import { getErrorMessage } from "@/lib/apiError";
import { logger } from "@/lib/logger";
import { queryKeys, staleTimes } from "@/lib/queryKeys";
import { useSchoolId } from "@/hooks/useSchoolId";
import { curriculumCreateRoute, curriculumEditRoute, type CurriculumRouteCourse } from "./subjects.logic";

/** What {@link useSubjectCurriculumActions} returns. */
export interface SubjectCurriculumActions {
  /** A view or edit is being resolved (the card shows its spinner). */
  busy: boolean;
  /** May this user write the course's curriculum; false hides Edit. */
  canModify: boolean;
  /** Opens the course's current-term curriculum for reading. */
  view: () => Promise<void>;
  /** Opens it in the editor, or the editor's create form when none exists. */
  edit: () => Promise<void>;
}

/**
 * The View / Edit actions on a subject card. Both resolve the current term
 * (cached, not fetched per click) and the course's curriculum for it (the same
 * cache entry the curriculum page reads), then route to the right screen.
 *
 * @param course - The card's course.
 * @returns The actions and their state.
 */
export function useSubjectCurriculumActions(course: CurriculumRouteCourse): SubjectCurriculumActions {
  const router = useRouter();
  const queryClient = useQueryClient();
  const schoolId = useSchoolId();
  const { data: termData, refetch: refetchTerm } = useCurrentTerm();
  const access = useCurriculumAccess(course._id);
  const [busy, setBusy] = useState(false);
  const running = useRef(false);

  const resolve = useCallback(
    async (mode: "view" | "edit") => {
      if (running.current) return;
      running.current = true;
      setBusy(true);
      try {
        const current = termData ?? (await refetchTerm()).data;
        if (!current?._id) {
          toast.error("No current term selected.");
          return;
        }

        const curriculum = await queryClient.fetchQuery({
          queryKey: queryKeys.curriculum.list(schoolId ?? "none", { courseId: course._id, termId: current._id }),
          queryFn: () => getCurriculumByCourseAndTerm({ courseId: course._id, termId: current._id }),
          staleTime: staleTimes.list,
        });

        if (!curriculum) {
          if (!access.canCreate) {
            toast.info("No curriculum has been written for this subject yet.");
            return;
          }
          toast("No curriculum exists yet. Opening the editor to create one.");
          router.push(curriculumCreateRoute(course, current._id));
          return;
        }

        router.push(
          mode === "view" ? viewRoute(course._id, current._id, curriculum._id) : curriculumEditRoute(course, current._id, curriculum._id),
        );
      } catch (error) {
        logger.error("subjects", "Could not open the curriculum", error);
        toast.error(getErrorMessage(error, mode === "view" ? "Failed to fetch curriculum." : "Failed to fetch curriculum for editing."));
      } finally {
        running.current = false;
        setBusy(false);
      }
    },
    [termData, refetchTerm, queryClient, schoolId, course, access.canCreate, router],
  );

  return {
    busy,
    canModify: access.canModify,
    view: useCallback(() => resolve("view"), [resolve]),
    edit: useCallback(() => resolve("edit"), [resolve]),
  };
}
