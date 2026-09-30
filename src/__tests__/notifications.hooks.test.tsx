/**
 * @jest-environment jsdom
 */
import React from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthContext } from "@/app/context/AuthContext";
import { makeMockAuthValue, mockTeacher } from "@/test-utils/render";
import { ApiError } from "@/lib/apiError";
import { queryKeys } from "@/lib/queryKeys";
import type { NotificationData } from "@/app/hooks/useWebSocket";
import * as service from "@/app/services/notifications.service";
import {
  INBOX_FEED_PAGE_SIZE,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotificationCounts,
  useNotificationInbox,
} from "@/hooks/notifications/useNotificationInbox";
import {
  listAnnouncementsFixture,
  listNotificationsFixture,
  makeNotificationCountsFixture,
  markAllReadFixture,
  markReadFixture,
  resetInboxFixtureStore,
} from "@/lib/fixtures/inbox.fixture";

jest.mock("@/components/CustomToast", () => ({ toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }));
jest.mock("@/app/services/notifications.service", () => ({
  ...jest.requireActual("@/app/services/notifications.service"),
  listAnnouncements: jest.fn(),
  listNotifications: jest.fn(),
  getNotificationCounts: jest.fn(),
  markAllNotificationsRead: jest.fn(),
  markAnnouncementRead: jest.fn(),
  markNotificationRead: jest.fn(),
}));

/** Socket callbacks the hooks registered, so tests can fire live events. */
const socket: { notification: Array<(n: NotificationData) => void>; connect: Array<() => void> } = { notification: [], connect: [] };
jest.mock("@/app/context/WebSocketContext", () => ({
  useWebSocketContextSafe: () => ({
    onNotification: (cb: (n: NotificationData) => void) => {
      socket.notification.push(cb);
      return () => {
        socket.notification = socket.notification.filter((fn) => fn !== cb);
      };
    },
    onConnect: (cb: () => void) => {
      socket.connect.push(cb);
      return () => {
        socket.connect = socket.connect.filter((fn) => fn !== cb);
      };
    },
  }),
}));

const mocked = service as jest.Mocked<typeof service>;
const { toast } = jest.requireMock("@/components/CustomToast") as { toast: { error: jest.Mock; success: jest.Mock } };
const USER = mockTeacher.userId;

/**
 * Renders the inbox hooks together under a fresh client and a signed-in teacher.
 *
 * @returns The hook results and the client.
 */
function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } } });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>
      <AuthContext.Provider value={makeMockAuthValue(mockTeacher)}>{children}</AuthContext.Provider>
    </QueryClientProvider>
  );
  const hook = renderHook(
    () => ({ inbox: useNotificationInbox(), counts: useNotificationCounts(), read: useMarkNotificationRead(), readAll: useMarkAllNotificationsRead() }),
    { wrapper },
  );
  return { client, ...hook };
}

/**
 * A page of a feed with `n` records starting at `from`, and the feed's total.
 *
 * @param prefix - Id prefix.
 * @param from - First index.
 * @param n - How many.
 * @param total - The feed's total.
 * @returns The list body.
 */
function page(prefix: string, from: number, n: number, total: number): service.NotificationListBody {
  return {
    data: Array.from({ length: n }, (_, i) => ({
      _id: `${prefix}${from + i}`,
      title: `${prefix} ${from + i}`,
      message: "Body",
      type: "attendance_alert",
      createdAt: new Date(Date.UTC(2026, 8, 25) - (from + i) * 3_600_000).toISOString(),
      isRead: false,
    })),
    meta: { total },
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  resetInboxFixtureStore();
  socket.notification = [];
  socket.connect = [];
  mocked.listNotifications.mockImplementation(async (_user, paging) => listNotificationsFixture(paging?.page, paging?.limit, paging?.unread));
  mocked.listAnnouncements.mockImplementation(async (_user, paging) => listAnnouncementsFixture(paging?.page, paging?.limit));
  mocked.getNotificationCounts.mockImplementation(async () => makeNotificationCountsFixture());
  mocked.markNotificationRead.mockImplementation(async (id) => markReadFixture(id) ?? { _id: id });
  mocked.markAnnouncementRead.mockImplementation(async (id) => markReadFixture(id) ?? { _id: id });
  mocked.markAllNotificationsRead.mockImplementation(async () => markAllReadFixture());
});

describe("useNotificationInbox", () => {
  it("loads page 1 of both feeds for the signed-in teacher and merges them newest first", async () => {
    const { result } = setup();
    expect(result.current.inbox.isPending).toBe(true);

    await waitFor(() => expect(result.current.inbox.hasData).toBe(true));

    expect(mocked.listNotifications).toHaveBeenCalledWith(USER, { page: 1, limit: INBOX_FEED_PAGE_SIZE });
    expect(mocked.listAnnouncements).toHaveBeenCalledWith(USER, { page: 1, limit: INBOX_FEED_PAGE_SIZE });
    expect(mocked.listNotifications).toHaveBeenCalledTimes(1);
    expect(result.current.inbox.items.map((n) => n.rawId)).toEqual(["n2", "n1", "n3", "n6", "n5", "n7"]);
    expect(result.current.inbox.items.find((n) => n.rawId === "n3")?.attachmentFiles).toHaveLength(2);
    expect(result.current.inbox.failedFeeds).toEqual([]);
    expect(result.current.inbox.hasNextPage).toBe(false);
  });

  it("keeps the feed that loaded when the other fails, and names the one that failed", async () => {
    mocked.listAnnouncements.mockRejectedValue(ApiError.unreachable());
    const { result } = setup();

    await waitFor(() => expect(result.current.inbox.hasData).toBe(true));

    expect(result.current.inbox.items.map((n) => n.rawId)).toEqual(["n2", "n1", "n5", "n7"]);
    expect(result.current.inbox.failedFeeds).toEqual(["announcements"]);
    expect(result.current.inbox.error).toBeNull();
  });

  it("exposes an ApiError, not a string, when both feeds fail", async () => {
    mocked.listAnnouncements.mockRejectedValue(ApiError.offline());
    mocked.listNotifications.mockRejectedValue(ApiError.offline());
    const { result } = setup();

    await waitFor(() => expect(result.current.inbox.error).not.toBeNull());

    expect(result.current.inbox.error).toBeInstanceOf(ApiError);
    expect((result.current.inbox.error as ApiError).code).toBe("NETWORK_OFFLINE");
    expect(result.current.inbox.isPending).toBe(false);
  });

  it("loads the next page only of the feed that has more", async () => {
    mocked.listNotifications.mockImplementation(async (_user, paging) =>
      paging?.page === 2 ? page("n", 20, 5, 25) : page("n", 0, 20, 25),
    );
    mocked.listAnnouncements.mockImplementation(async () => page("a", 100, 2, 2));
    const { result } = setup();
    await waitFor(() => expect(result.current.inbox.hasData).toBe(true));
    expect(result.current.inbox.items).toHaveLength(22);
    expect(result.current.inbox.hasNextPage).toBe(true);

    await act(async () => {
      await result.current.inbox.fetchNextPage();
    });

    await waitFor(() => expect(result.current.inbox.items).toHaveLength(27));
    expect(mocked.listNotifications).toHaveBeenLastCalledWith(USER, { page: 2, limit: INBOX_FEED_PAGE_SIZE });
    expect(mocked.listAnnouncements).toHaveBeenCalledTimes(1);
    expect(result.current.inbox.hasNextPage).toBe(false);
  });

  it("refetches the list and the counts when the socket delivers a notification, and ignores chat messages", async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.inbox.hasData).toBe(true));
    await waitFor(() => expect(result.current.counts.data).toBeDefined());
    expect(mocked.listNotifications).toHaveBeenCalledTimes(1);
    expect(mocked.getNotificationCounts).toHaveBeenCalledTimes(1);

    act(() => socket.notification.forEach((fn) => fn({ _id: "x", title: "Chat", type: "chat_message", createdAt: "" })));
    expect(mocked.listNotifications).toHaveBeenCalledTimes(1);

    act(() => socket.notification.forEach((fn) => fn({ _id: "n8", title: "New", type: "attendance_alert", createdAt: "" })));

    await waitFor(() => expect(mocked.listNotifications).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(mocked.getNotificationCounts).toHaveBeenCalledTimes(2));
  });

  it("does not refetch on a socket connect while the data is fresh", async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.inbox.hasData).toBe(true));
    await waitFor(() => expect(result.current.counts.data).toBeDefined());

    act(() => socket.connect.forEach((fn) => fn()));

    expect(mocked.listNotifications).toHaveBeenCalledTimes(1);
    expect(mocked.getNotificationCounts).toHaveBeenCalledTimes(1);
  });

  it("keys the cache per user so one account never reads another's inbox", async () => {
    const { client, result } = setup();
    await waitFor(() => expect(result.current.inbox.hasData).toBe(true));

    expect(client.getQueryData(queryKeys.notifications.list(USER, { view: "inbox" }))).toBeDefined();
    expect(client.getQueryData(queryKeys.notifications.list("someone-else", { view: "inbox" }))).toBeUndefined();
    expect(client.getQueryData(queryKeys.notifications.counts(USER))).toBeDefined();
  });
});

describe("reading", () => {
  it("marks one read at once with its feed's endpoint, and lowers the counts", async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.counts.data?.unread).toBe(3));
    await waitFor(() => expect(result.current.inbox.hasData).toBe(true));
    const n3 = result.current.inbox.items.find((n) => n.rawId === "n3")!;

    act(() => result.current.read.mutate(n3));

    await waitFor(() => expect(result.current.inbox.items.find((n) => n.rawId === "n3")?.unread).toBe(false));
    expect(result.current.counts.data?.unread).toBe(2);
    expect(result.current.counts.data?.byCategory.announcement?.unread).toBe(0);
    await waitFor(() => expect(mocked.markAnnouncementRead).toHaveBeenCalledWith("n3"));
    expect(mocked.markAnnouncementRead).toHaveBeenCalledTimes(1);
    expect(mocked.markNotificationRead).not.toHaveBeenCalled();
  });

  it("puts it back and says so when the server refuses", async () => {
    mocked.markNotificationRead.mockRejectedValue(ApiError.unreachable());
    const { result } = setup();
    await waitFor(() => expect(result.current.counts.data?.unread).toBe(3));
    await waitFor(() => expect(result.current.inbox.hasData).toBe(true));
    const n2 = result.current.inbox.items.find((n) => n.rawId === "n2")!;

    await act(async () => {
      await result.current.read.mutateAsync(n2).catch(() => undefined);
    });

    expect(toast.error).toHaveBeenCalled();
    expect(result.current.inbox.items.find((n) => n.rawId === "n2")?.unread).toBe(true);
    await waitFor(() => expect(result.current.counts.data?.unread).toBe(3));
  });

  it("marks everything read with ONE read-all call, and restores it all on a refusal", async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.counts.data?.unread).toBe(3));
    await waitFor(() => expect(result.current.inbox.hasData).toBe(true));

    await act(async () => {
      await result.current.readAll.mutateAsync();
    });

    await waitFor(() => expect(result.current.inbox.items.some((n) => n.unread)).toBe(false));
    expect(mocked.markAllNotificationsRead).toHaveBeenCalledTimes(1);
    expect(mocked.markNotificationRead).not.toHaveBeenCalled();
    expect(mocked.markAnnouncementRead).not.toHaveBeenCalled();
    await waitFor(() => expect(result.current.counts.data?.unread).toBe(0));

    resetInboxFixtureStore();
    mocked.markAllNotificationsRead.mockRejectedValue(ApiError.unreachable());
    await act(async () => {
      await result.current.inbox.refetch();
      await result.current.counts.refetch();
    });
    await waitFor(() => expect(result.current.counts.data?.unread).toBe(3));
    await waitFor(() => expect(result.current.inbox.items.filter((n) => n.unread)).toHaveLength(3));

    await act(async () => {
      await result.current.readAll.mutateAsync().catch(() => undefined);
    });

    expect(toast.error).toHaveBeenCalled();
    expect(mocked.markAllNotificationsRead).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(result.current.inbox.items.filter((n) => n.unread)).toHaveLength(3));
    expect(result.current.counts.data?.unread).toBe(3);
  });
});
