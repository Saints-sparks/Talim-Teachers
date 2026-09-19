"use client";

import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/app/context/AuthContext";
import { toast } from "@/components/CustomToast";
import { getErrorMessage } from "@/lib/apiError";
import { queryKeys, staleTimes } from "@/lib/queryKeys";
import { getNotification, markNotificationRead } from "@/app/services/notifications.service";
import { normalizeSystemNotification, type TeacherNotification } from "@/app/lib/notifications/inbox";

/**
 * One notification, for the `/notifications/[id]` page.
 *
 * @param id - The notification id from the route.
 * @returns The normalised notification (`null` until loaded), the query state,
 * and `markAsRead`, which refreshes this page and the inbox afterwards.
 */
export function useNotificationDetail(id: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.userId || user?._id || "";
  const queryKey = queryKeys.notifications.detail(id);

  const query = useQuery({
    queryKey,
    queryFn: () => getNotification(id),
    enabled: Boolean(id && userId),
    staleTime: staleTimes.list,
  });

  const notification: TeacherNotification | null = useMemo(
    () => (query.data ? normalizeSystemNotification(query.data, userId) : null),
    [query.data, userId],
  );

  const mutation = useMutation({
    mutationFn: () => markNotificationRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all }),
    onError: (err) => toast.error(getErrorMessage(err, "Failed to mark notification as read. Please try again.")),
  });

  return {
    notification,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    markAsRead: () => mutation.mutate(),
  };
}
