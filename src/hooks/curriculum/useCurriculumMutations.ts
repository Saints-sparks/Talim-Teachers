"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createCurriculum, deleteCurriculum, updateCurriculum } from "@/app/services/curriculum.services";
import { useTeacherOnboarding } from "@/app/context/OnboardingContext";
import { queryKeys } from "@/lib/queryKeys";
import type { CreateCurriculumPayload, Curriculum, UpdateCurriculumPayload } from "./types";

/** What {@link useSaveCurriculum} is asked to do. */
export type SaveCurriculumInput =
  | { mode: "create"; payload: CreateCurriculumPayload }
  | { mode: "update"; id: string; payload: UpdateCurriculumPayload };

/**
 * Creates or updates a curriculum, then invalidates every cached curriculum
 * read so the list and the view page show the change. A first create also
 * ticks the "create a curriculum" onboarding step.
 *
 * @returns The mutation; `mutateAsync` takes a {@link SaveCurriculumInput} and
 *   resolves with the saved curriculum.
 */
export function useSaveCurriculum() {
  const queryClient = useQueryClient();
  const { markStepComplete } = useTeacherOnboarding();

  return useMutation<Curriculum, unknown, SaveCurriculumInput>({
    mutationFn: (input) =>
      input.mode === "create" ? createCurriculum(input.payload) : updateCurriculum(input.id, input.payload),
    onSuccess: (_saved, input) => {
      if (input.mode === "create") markStepComplete("create-curriculum");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.curriculum.all });
    },
  });
}

/**
 * Deletes a curriculum and invalidates every cached curriculum read.
 *
 * @returns The mutation; `mutateAsync` takes the curriculum id.
 */
export function useDeleteCurriculum() {
  const queryClient = useQueryClient();

  return useMutation<{ message: string }, unknown, string>({
    mutationFn: (id) => deleteCurriculum(id),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.curriculum.all });
    },
  });
}
