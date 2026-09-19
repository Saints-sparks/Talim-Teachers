"use client";

import { useState } from "react";
import { toast } from "@/components/CustomToast";
import { useAuth } from "@/app/context/AuthContext";
import { ApiError, getErrorMessage } from "@/lib/apiError";
import { logger } from "@/lib/logger";
import { hasContent, refId, type CreateCurriculumPayload, type Curriculum } from "./types";
import { useSaveCurriculum } from "./useCurriculumMutations";

/** Inputs of {@link useCurriculumForm}. */
export interface CurriculumFormInput {
  /** The course fixed by the page's URL, or `null` when the teacher picks one. */
  initialCourseId: string | null | undefined;
  /** The curriculum being edited; `null` when writing a new one. */
  curriculum: Curriculum | null;
  /** The school's current term, the term a new curriculum is filed under. */
  currentTermId: string | undefined;
  /** The editor's current HTML. */
  html: string;
  /** Hosted URLs of the attachments. */
  attachments: string[];
  /** Called after a successful save. */
  onSaved: () => void;
}

/** What {@link useCurriculumForm} returns. */
export interface CurriculumForm {
  courseId: string;
  termId: string;
  /** Picks a course when the page did not fix one. */
  selectCourse: (courseId: string) => void;
  /** True once the curriculum has a course, a term and some content. */
  isComplete: boolean;
  isSaving: boolean;
  /** Validates and saves; toasts the outcome. */
  save: () => Promise<void>;
}

/**
 * The message for a failed curriculum save, keyed on the API's error code.
 *
 * @param error - What the mutation threw.
 * @returns A message safe to show the teacher.
 */
export function saveErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.code === "CONFLICT") {
    return "A curriculum already exists for this course and term. Open it from the course to edit it.";
  }
  return getErrorMessage(error, "Failed to save curriculum");
}

/**
 * The curriculum editor's form: which course and term it is filed under,
 * client validation that mirrors `CreateCurriculumDto`, and the save call.
 *
 * A new curriculum is filed under the current term and credited to the
 * signed-in teacher. Updating omits `teacherId`, so editing a colleague's
 * curriculum for a course you teach does not reassign it.
 *
 * @param input - See {@link CurriculumFormInput}.
 * @returns See {@link CurriculumForm}.
 */
export function useCurriculumForm(input: CurriculumFormInput): CurriculumForm {
  const { initialCourseId, curriculum, currentTermId, html, attachments, onSaved } = input;
  const { user } = useAuth();
  const saveMutation = useSaveCurriculum();
  const [pickedCourseId, setPickedCourseId] = useState("");

  const courseId = curriculum ? refId(curriculum.course) : initialCourseId || pickedCourseId;
  const termId = curriculum ? refId(curriculum.term) : (currentTermId ?? "");
  const isComplete = Boolean(courseId && termId && hasContent(html));

  const save = async () => {
    if (!courseId) return void toast.error("Please select a course");
    if (!termId) return void toast.error("Term information is not loaded yet");
    if (!hasContent(html)) return void toast.error("Please enter curriculum content");
    if (!user?.userId) return void toast.error("Teacher ID not available");

    try {
      if (curriculum) {
        await saveMutation.mutateAsync({
          mode: "update",
          id: curriculum._id,
          payload: { course: courseId, term: termId, content: html, attachments },
        });
        toast.success("Curriculum updated successfully");
      } else {
        const payload: CreateCurriculumPayload = {
          course: courseId,
          term: termId,
          content: html,
          teacherId: user.userId,
          attachments,
        };
        await saveMutation.mutateAsync({ mode: "create", payload });
        toast.success("Curriculum created successfully");
      }
      onSaved();
    } catch (error) {
      logger.error("curriculum", "saving the curriculum failed", error);
      toast.error(saveErrorMessage(error));
    }
  };

  return { courseId, termId, selectCourse: setPickedCourseId, isComplete, isSaving: saveMutation.isPending, save };
}
