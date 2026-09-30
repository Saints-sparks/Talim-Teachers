"use client";

/**
 * The Notifications page's data (§30 of
 * `talimBE-V2/docs/redesign-teachers-round4-inbox-settings.md`):
 *
 * - {@link useNotificationCounts}: `GET /notifications/counts`, for the tabs,
 *   the top bar's bell and the sidebar badge. It also keeps the inbox live:
 *   a socket notification (not a chat message) invalidates the list and the
 *   counts, and a reconnect does so only when they are stale.
 * - {@link useNotificationInbox}: both feeds (`GET /notifications` and the
 *   announcements list), page by page, merged newest first.
 * - {@link useMarkNotificationRead} and {@link useMarkAllNotificationsRead}:
 *   optimistic reads that roll back when the server refuses.
 *
 * Keys: `queryKeys.notifications.list(userId, { view: "inbox" })` and
 * `queryKeys.notifications.counts(userId)`.
 */
import { useCallback, useEffect, useMemo } from "react";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type InfiniteData, type QueryClient } from "@tanstack/react-query";
import { useAuth } from "@/app/context/AuthContext";
import { useWebSocketContextSafe } from "@/app/context/WebSocketContext";
import { toast } from "@/components/CustomToast";
import { getErrorMessage } from "@/lib/apiError";
import { listPrefix, queryKeys, staleTimes } from "@/lib/queryKeys";
import {
  extractRecords,
  getNotificationCounts,
  listAnnouncements,
  listNotifications,
  markAllNotificationsRead,
  markAnnouncementRead,
  markNotificationRead,
  type NotificationListBody,
} from "@/app/services/notifications.service";
import { buildInbox, type TeacherNotification } from "@/app/lib/notifications/inbox";
import { countsAfterRead, countsAfterReadAll, countsAfterUnread, feedHasMore, mergeInboxPages } from "@/hooks/notifications/notifications.logic";
import type { NotificationCountsBody, ReadAllResult } from "@/types/inboxSettings";

/** How many of each feed one page reads. */
export const INBOX_FEED_PAGE_SIZE = 20;

/** How long the inbox and the counts stay fresh; live events invalidate them sooner. */
const INBOX_STALE_MS = staleTimes.list * 2;

/** The two server lists the inbox merges. */
export type InboxFeed = "notifications" | "announcements";

/** Which page to read, and which feeds still have one. */
export interface InboxPageParam {
  page: number;
  notifications: boolean;
  announcements: boolean;
}

/** One loaded page of the inbox. */
export interface InboxPage {
  page: number;
  /** This page's records of both feeds, normalised and merged. */
  items: TeacherNotification[];
  moreNotifications: boolean;
  moreAnnouncements: boolean;
  /** Feeds that were asked for and failed (the others still loaded). */
  failed: InboxFeed[];
}

/** The inbox query's cached value. */
export type InboxData = InfiniteData<InboxPage, InboxPageParam>;

const FIRST_PAGE: InboxPageParam = { page: 1, notifications: true, announcements: true };

/**
 * The signed-in user's id, as the notification keys use it.
 *
 * @returns The id, or an empty string when signed out.
 */
function useNotificationUserId(): string {
  const { user } = useAuth();
  return user?.userId || user?._id || "";
}

/**
 * The inbox query's key.
 *
 * @param userId - The signed-in user.
 * @returns `queryKeys.notifications.list(userId, { view: "inbox" })`.
 */
export function inboxKey(userId: string) {
  return queryKeys.notifications.list(userId, { view: "inbox" });
}

/**
 * Reads one page of each feed that still has one and merges them. One feed
 * failing does not hide the other; every feed asked for failing throws the
 * first error so the page can show it.
 *
 * @param userId - The signed-in user.
 * @param param - The page and the feeds to read.
 * @returns The page.
 * @throws ApiError when every feed asked for failed.
 */
export async function loadInboxPage(userId: string, param: InboxPageParam): Promise<InboxPage> {
  const paging = { page: param.page, limit: INBOX_FEED_PAGE_SIZE };
  const [announcements, notifications] = await Promise.allSettled([
    param.announcements ? listAnnouncements(userId, paging) : Promise.resolve<NotificationListBody | null>(null),
    param.notifications ? listNotifications(userId, paging) : Promise.resolve<NotificationListBody | null>(null),
  ]);
  const failed: InboxFeed[] = [];
  if (param.announcements && announcements.status === "rejected") failed.push("announcements");
  if (param.notifications && notifications.status === "rejected") failed.push("notifications");
  const asked = Number(param.announcements) + Number(param.notifications);
  if (asked > 0 && failed.length === asked) {
    throw announcements.status === "rejected" ? announcements.reason : (notifications as PromiseRejectedResult).reason;
  }
  const announcementBody = announcements.status === "fulfilled" ? announcements.value : null;
  const notificationBody = notifications.status === "fulfilled" ? notifications.value : null;
  return {
    page: param.page,
    items: buildInbox(
      announcementBody ? extractRecords(announcementBody) : null,
      notificationBody ? extractRecords(notificationBody) : null,
      userId,
    ),
    // A failed feed is not asked again on later pages; a refetch retries it from page 1.
    moreAnnouncements: announcementBody ? feedHasMore(announcementBody, param.page, INBOX_FEED_PAGE_SIZE) : false,
    moreNotifications: notificationBody ? feedHasMore(notificationBody, param.page, INBOX_FEED_PAGE_SIZE) : false,
    failed,
  };
}

/**
 * The page after the last one, while either feed has more.
 *
 * @param last - The last loaded page.
 * @returns The next page's param, or undefined when both feeds are done.
 */
function nextPageParam(last: InboxPage): InboxPageParam | undefined {
  if (!last.moreNotifications && !last.moreAnnouncements) return undefined;
  return { page: last.page + 1, notifications: last.moreNotifications, announcements: last.moreAnnouncements };
}

/**
 * Subscribes the inbox to the socket: a notification (not a chat message)
 * invalidates the list and the counts; a reconnect invalidates them only when
 * they are stale, so the first connect costs nothing. Several components
 * mount this, so a refetch already in flight is never cancelled.
 *
 * @param userId - The signed-in user.
 */
function useNotificationLiveUpdates(userId: string): void {
  const queryClient = useQueryClient();
  const webSocket = useWebSocketContextSafe();
  const onNotification = webSocket?.onNotification;
  const onConnect = webSocket?.onConnect;

  const invalidate = useCallback(
    (staleOnly: boolean) => {
      for (const queryKey of [listPrefix(inboxKey(userId)), queryKeys.notifications.counts(userId)]) {
        void queryClient.invalidateQueries({ queryKey, refetchType: "active", ...(staleOnly ? { stale: true } : {}) }, { cancelRefetch: false });
      }
    },
    [queryClient, userId],
  );

  useEffect(() => {
    if (!userId || !onNotification) return;
    return onNotification((incoming) => {
      // Chat messages surface through the Messages badge, not the inbox.
      if (incoming?.type === "chat_message") return;
      invalidate(false);
    });
  }, [invalidate, onNotification, userId]);

  useEffect(() => {
    if (!userId || !onConnect) return;
    return onConnect(() => invalidate(true));
  }, [invalidate, onConnect, userId]);
}

/**
 * `GET /notifications/counts` for the signed-in teacher: `{ all, unread,
 * byCategory }` over both feeds. Mounting it also keeps the inbox live (see
 * the module comment), so the top bar's bell updates on every page.
 *
 * @returns The query.
 */
export function useNotificationCounts() {
  const userId = useNotificationUserId();
  useNotificationLiveUpdates(userId);
  return useQuery({
    queryKey: queryKeys.notifications.counts(userId),
    queryFn: getNotificationCounts,
    enabled: Boolean(userId),
    staleTime: INBOX_STALE_MS,
  });
}

/**
 * The signed-in teacher's inbox, page by page: page N of both feeds
 * ({@link INBOX_FEED_PAGE_SIZE} each) merged newest first, each id once, with
 * a next page while either feed has more.
 *
 * @returns `items` (all loaded pages merged), the first-load state
 * (`isPending`, `error` — an `ApiError` — and `hasData`), `failedFeeds` when
 * one feed failed, whether a refresh failed (`isRefetchError`), paging
 * (`hasNextPage`, `fetchNextPage`, `isFetchingNextPage`,
 * `isFetchNextPageError`) and `refetch`.
 */
export function useNotificationInbox() {
  const userId = useNotificationUserId();
  const query = useInfiniteQuery({
    queryKey: inboxKey(userId),
    queryFn: ({ pageParam }) => loadInboxPage(userId, pageParam),
    initialPageParam: FIRST_PAGE,
    getNextPageParam: nextPageParam,
    enabled: Boolean(userId),
    staleTime: INBOX_STALE_MS,
  });

  const pages = query.data?.pages;
  const items = useMemo(() => (pages ? mergeInboxPages(pages) : []), [pages]);
  const failedFeeds = useMemo(() => [...new Set((pages ?? []).flatMap((page) => page.failed))], [pages]);

  return {
    items,
    isPending: query.isPending,
    hasData: Boolean(query.data),
    error: query.error,
    failedFeeds,
    isRefetchError: query.isRefetchError,
    hasNextPage: query.hasNextPage,
    fetchNextPage: query.fetchNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    isFetchNextPageError: query.isFetchNextPageError,
    refetch: query.refetch,
  };
}

/**
 * Applies a change to every loaded inbox item.
 *
 * @param queryClient - The client.
 * @param userId - The signed-in user.
 * @param update - Maps an item to its new value.
 */
function patchInboxItems(queryClient: QueryClient, userId: string, update: (item: TeacherNotification) => TeacherNotification): void {
  queryClient.setQueryData<InboxData>(inboxKey(userId), (data) =>
    data ? { ...data, pages: data.pages.map((page) => ({ ...page, items: page.items.map(update) })) } : data,
  );
}

/**
 * Applies a change to the cached counts, when they are loaded.
 *
 * @param queryClient - The client.
 * @param userId - The signed-in user.
 * @param update - Maps the counts to the new ones.
 */
function patchCounts(queryClient: QueryClient, userId: string, update: (counts: NotificationCountsBody) => NotificationCountsBody): void {
  queryClient.setQueryData<NotificationCountsBody>(queryKeys.notifications.counts(userId), (counts) => (counts ? update(counts) : counts));
}

/**
 * Marks one notification or announcement read (`PUT …/:id/read`, the endpoint
 * its feed uses): the item and the counts change at once, and change back
 * with a toast when the server refuses. The counts are refetched afterwards.
 *
 * @returns The mutation; `mutate(item)` with an unread inbox item.
 */
export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  const userId = useNotificationUserId();
  return useMutation({
    mutationFn: (item: TeacherNotification) => (item.endpoint === "announcement" ? markAnnouncementRead(item.rawId) : markNotificationRead(item.rawId)),
    onMutate: async (item: TeacherNotification) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: inboxKey(userId) }),
        queryClient.cancelQueries({ queryKey: queryKeys.notifications.counts(userId) }),
      ]);
      patchInboxItems(queryClient, userId, (n) => (n.id === item.id ? { ...n, unread: false } : n));
      patchCounts(queryClient, userId, (counts) => countsAfterRead(counts, item.category));
    },
    onError: (err, item) => {
      // Undo only this one read, so another read that succeeded meanwhile stays.
      patchInboxItems(queryClient, userId, (n) => (n.id === item.id ? { ...n, unread: true } : n));
      patchCounts(queryClient, userId, (counts) => countsAfterUnread(counts, item.category));
      toast.error(getErrorMessage(err, "We couldn't mark that notification as read. Please try again."));
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.notifications.counts(userId) }),
  });
}

/** What {@link useMarkAllNotificationsRead} restores when the server refuses. */
interface ReadAllSnapshot {
  inbox?: InboxData;
  counts?: NotificationCountsBody;
}

/**
 * "Mark all as read": one `PATCH /notifications/read-all` (both feeds). Every
 * loaded item turns read and every unread count goes to zero at once; on a
 * refusal both are restored and a toast says so. The caller shows the
 * success message (`mutate(undefined, { onSuccess })`).
 *
 * @returns The mutation.
 */
export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  const userId = useNotificationUserId();
  return useMutation<ReadAllResult, unknown, void, ReadAllSnapshot>({
    mutationFn: () => markAllNotificationsRead(),
    onMutate: async () => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: inboxKey(userId) }),
        queryClient.cancelQueries({ queryKey: queryKeys.notifications.counts(userId) }),
      ]);
      const snapshot: ReadAllSnapshot = {
        inbox: queryClient.getQueryData<InboxData>(inboxKey(userId)),
        counts: queryClient.getQueryData<NotificationCountsBody>(queryKeys.notifications.counts(userId)),
      };
      patchInboxItems(queryClient, userId, (n) => (n.unread ? { ...n, unread: false } : n));
      patchCounts(queryClient, userId, countsAfterReadAll);
      return snapshot;
    },
    onError: (err, _vars, snapshot) => {
      if (snapshot?.inbox) queryClient.setQueryData(inboxKey(userId), snapshot.inbox);
      if (snapshot?.counts) queryClient.setQueryData(queryKeys.notifications.counts(userId), snapshot.counts);
      toast.error(getErrorMessage(err, "We couldn't mark your notifications as read. Please try again."));
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.notifications.counts(userId) }),
  });
}
