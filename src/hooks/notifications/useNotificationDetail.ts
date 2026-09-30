"use client";

import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/app/context/AuthContext";
import { queryKeys, staleTimes } from "@/lib/queryKeys";
import { getNotification } from "@/app/services/notifications.service";
import { normalizeSystemNotification, type TeacherNotification } from "@/app/lib/notifications/inbox";
import { inboxKey, useMarkNotificationRead, type InboxData } from "@/hooks/notifications/useNotificationInbox";

/**
 * One notification, for `/notifications/[id]` (where push notifications
 * link). It starts from the inbox's cached copy when there is one, else reads
 * `GET /notifications/:id`, and marks it read once on open (optimistically,
 * like selecting it in the inbox).
 *
 * @param id - The notification id from the route.
 * @returns The normalised notification (`null` until loaded), `isPending`,
 * the query `error` (an `ApiError`) and `refetch`.
 */
export function useNotificationDetail(id: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.userId || user?._id || "";
  const markRead = useMarkNotificationRead();
  const markedId = useRef<string | null>(null);

  const query = useQuery({
    queryKey: queryKeys.notifications.detail(id),
    queryFn: async (): Promise<TeacherNotification> => normalizeSystemNotification(await getNotification(id), userId),
    enabled: Boolean(id && userId),
    staleTime: staleTimes.list,
    initialData: () =>
      queryClient
        .getQueryData<InboxData>(inboxKey(userId))
        ?.pages.flatMap((page) => page.items)
        .find((item) => item.id === `notification:${id}`),
    initialDataUpdatedAt: () => queryClient.getQueryState(inboxKey(userId))?.dataUpdatedAt,
  });

  const notification = query.data ?? null;
  const { mutate } = markRead;

  useEffect(() => {
    if (!notification?.unread || markedId.current === notification.id) return;
    markedId.current = notification.id;
    queryClient.setQueryData<TeacherNotification>(queryKeys.notifications.detail(id), (current) => (current ? { ...current, unread: false } : current));
    mutate(notification);
  }, [id, mutate, notification, queryClient]);

  return {
    notification,
    isPending: query.isPending,
    error: query.error,
    refetch: query.refetch,
  };
}
