"use client";

import { useMutation, useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { useAuth } from "@/app/context/AuthContext";
import { useTeacherOnboarding } from "@/app/context/OnboardingContext";
import { queryKeys, staleTimes } from "@/lib/queryKeys";
import { useSchoolId } from "@/hooks/useSchoolId";
import { createResource, listResourcesByUploader, removeResource, updateResource } from "./resourceApi";
import type { CreateResourcePayload, Resource, UpdateResourcePayload } from "./types";

/**
 * The signed-in teacher's resources, cached.
 *
 * Uploading, editing and deleting invalidate this query, so the list is never
 * patched by hand and every tab of the page agrees. A failed read is an error
 * the page can show, not an empty list.
 *
 * @returns The query result; idle until there is a signed-in user.
 */
export function useMyResources(): UseQueryResult<Resource[], unknown> {
  const schoolId = useSchoolId();
  const { user } = useAuth();
  const userId = user?.userId ?? "";

  return useQuery({
    queryKey: queryKeys.resources.list(schoolId ?? "none", { uploadedBy: userId }),
    queryFn: () => listResourcesByUploader(userId),
    enabled: Boolean(schoolId && userId),
    staleTime: staleTimes.list,
  });
}

/**
 * Uploads a resource, then refreshes the list. The first upload also ticks the
 * "upload a resource" onboarding step.
 *
 * @returns The mutation; `mutateAsync` takes a `CreateResourcePayload`.
 */
export function useCreateResource() {
  const queryClient = useQueryClient();
  const { markStepComplete } = useTeacherOnboarding();

  return useMutation<Resource, unknown, CreateResourcePayload>({
    mutationFn: createResource,
    onSuccess: () => markStepComplete("upload-resource"),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.resources.all });
    },
  });
}

/**
 * Edits a resource, then refreshes the list.
 *
 * @returns The mutation; `mutateAsync` takes `{ id, payload }`.
 */
export function useUpdateResource() {
  const queryClient = useQueryClient();

  return useMutation<Resource, unknown, { id: string; payload: UpdateResourcePayload }>({
    mutationFn: ({ id, payload }) => updateResource(id, payload),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.resources.all });
    },
  });
}

/**
 * Deletes a resource, then refreshes the list.
 *
 * @returns The mutation; `mutateAsync` takes the resource id.
 */
export function useDeleteResource() {
  const queryClient = useQueryClient();

  return useMutation<Resource, unknown, string>({
    mutationFn: removeResource,
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.resources.all });
    },
  });
}
