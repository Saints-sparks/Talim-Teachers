"use client";

/**
 * The teacher's notification inbox as one cached query.
 *
 * The sidebar, the header bell, the settings page and the notifications page
 * all call this hook; they share one query keyed by user
 * (`queryKeys.notifications.list`), so the two list requests happen once no
 * matter how many components ask. Nothing polls: the inbox is refetched when
 * the socket delivers a notification, when the socket reconnects after the
 * data went stale, and when a read mutation settles.
 */
import { useCallback, useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import { useWebSocketContextSafe } from "../context/WebSocketContext";
import { toast } from "@/components/CustomToast";
import { getErrorMessage } from "@/lib/apiError";
import { queryKeys, staleTimes } from "@/lib/queryKeys";
import {
  extractRecords,
  listAnnouncements,
  listNotifications,
  markAnnouncementRead,
  markNotificationRead,
} from "../services/notifications.service";
import {
  buildInbox,
  countNotifications,
  type NotificationCategory,
  type NotificationCounts,
  type NotificationSource,
  type TeacherNotification,
} from "../lib/notifications/inbox";

export type { NotificationCategory, NotificationSource, TeacherNotification };

/** What the inbox query holds. */
interface InboxData {
  items: TeacherNotification[];
  /** True when one of the two server lists failed but the other loaded. */
  partial: boolean;
}

/** How long the inbox stays fresh; live events invalidate it sooner. */
const INBOX_STALE_MS = staleTimes.list * 2;

/**
 * Loads both server lists and merges them. One failing list does not hide the
 * other; both failing throws the first error so the page can show it.
 *
 * @param userId - The signed-in user's id.
 * @returns The merged inbox and whether it is partial.
 */
async function loadInbox(userId: string): Promise<InboxData> {
  const [announcements, notifications] = await Promise.allSettled([listAnnouncements(userId), listNotifications(userId)]);
  if (announcements.status === "rejected" && notifications.status === "rejected") throw announcements.reason;
  return {
    items: buildInbox(
      announcements.status === "fulfilled" ? extractRecords(announcements.value) : null,
      notifications.status === "fulfilled" ? extractRecords(notifications.value) : null,
      userId,
    ),
    partial: announcements.status === "rejected" || notifications.status === "rejected",
  };
}

/**
 * Marks the given inbox items read on the server.
 *
 * @param targets - The unread items to mark.
 * @returns How many calls failed.
 */
async function markRead(targets: TeacherNotification[]): Promise<number> {
  const results = await Promise.allSettled(
    targets.map((target) => (target.endpoint === "announcement" ? markAnnouncementRead(target.rawId) : markNotificationRead(target.rawId))),
  );
  return results.filter((result) => result.status === "rejected").length;
}

/**
 * The signed-in teacher's notifications, counts and read actions.
 *
 * @returns `notifications` (newest first), first-load `loading`, `isRefreshing`,
 * the query `error` (an `ApiError` when the request failed), `isPartial`,
 * tab `counts`, `refetch`, and `markAsRead` / `markAllAsRead`, which update
 * the list at once and roll back if the server refuses.
 */
export default function useNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const webSocket = useWebSocketContextSafe();
  const userId = user?.userId || user?._id || "";
  const queryKey = useMemo(() => queryKeys.notifications.list(userId, { view: "inbox" }), [userId]);

  const query = useQuery({
    queryKey,
    queryFn: () => loadInbox(userId),
    enabled: Boolean(userId),
    staleTime: INBOX_STALE_MS,
  });

  // The inbox used to be mirrored into localStorage; nothing reads that copy any more.
  useEffect(() => {
    if (!userId) return;
    try {
      localStorage.removeItem(`teacher-notifications:${userId}`);
    } catch {
      /* storage can be unavailable */
    }
  }, [userId]);

  // A live notification means the inbox changed. Several components mount this
  // hook, so refetch without cancelling a request that is already in flight.
  const onNotification = webSocket?.onNotification;
  const onConnect = webSocket?.onConnect;
  useEffect(() => {
    if (!userId || !onNotification) return;
    return onNotification((incoming) => {
      // Chat messages surface through the messages badge, not the inbox.
      if (incoming?.type === "chat_message") return;
      void queryClient.invalidateQueries({ queryKey, refetchType: "active" }, { cancelRefetch: false });
    });
  }, [onNotification, queryClient, queryKey, userId]);

  // Anything sent while the socket was down is missed: catch up on reconnect,
  // but only when the data is actually old, so the first connect costs nothing.
  useEffect(() => {
    if (!userId || !onConnect) return;
    return onConnect(() => {
      void queryClient.invalidateQueries({ queryKey, stale: true, refetchType: "active" }, { cancelRefetch: false });
    });
  }, [onConnect, queryClient, queryKey, userId]);

  const notifications = useMemo(() => query.data?.items ?? [], [query.data]);
  const counts: NotificationCounts = useMemo(() => countNotifications(notifications), [notifications]);

  /**
   * Applies a change to the cached inbox and returns what to restore on failure.
   *
   * @param update - Maps the current items to the new ones.
   * @returns The previous cache value.
   */
  const patchCache = useCallback(
    async (update: (items: TeacherNotification[]) => TeacherNotification[]): Promise<InboxData | undefined> => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<InboxData>(queryKey);
      if (previous) queryClient.setQueryData<InboxData>(queryKey, { ...previous, items: update(previous.items) });
      return previous;
    },
    [queryClient, queryKey],
  );

  const markMutation = useMutation({
    mutationFn: async (targets: TeacherNotification[]) => {
      const failed = await markRead(targets);
      if (failed > 0) {
        throw new Error(
          targets.length === 1
            ? "Failed to mark notification as read. Please try again."
            : "Some notifications could not be marked as read. Please try again.",
        );
      }
    },
    onMutate: (targets) => {
      const ids = new Set(targets.map((target) => target.id));
      return patchCache((items) => items.map((item) => (ids.has(item.id) ? { ...item, unread: false } : item)));
    },
    onError: (err, _targets, previous) => {
      if (previous) queryClient.setQueryData(queryKey, previous);
      toast.error(getErrorMessage(err, "Failed to mark as read. Please try again."));
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  const markAsRead = useCallback(
    async (notificationId: string): Promise<void> => {
      const target = notifications.find((notification) => notification.id === notificationId);
      if (!target || !target.unread || !userId) return;
      await markMutation.mutateAsync([target]).catch(() => undefined);
    },
    [markMutation, notifications, userId],
  );

  const markAllAsRead = useCallback(async (): Promise<void> => {
    const unread = notifications.filter((notification) => notification.unread);
    if (!unread.length || !userId) return;
    await markMutation.mutateAsync(unread).catch(() => undefined);
  }, [markMutation, notifications, userId]);

  return {
    notifications,
    loading: query.isLoading,
    isRefreshing: query.isFetching,
    error: query.error,
    isPartial: query.data?.partial ?? false,
    counts,
    refetch: query.refetch,
    markAsRead,
    markAllAsRead,
  };
}
