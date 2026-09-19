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
import useNotifications from "@/app/hooks/useNotifications";
import type { NotificationData } from "@/app/hooks/useWebSocket";
import * as service from "@/app/services/notifications.service";

jest.mock("@/components/CustomToast", () => ({ toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }));
jest.mock("@/app/services/notifications.service", () => ({
  ...jest.requireActual("@/app/services/notifications.service"),
  listAnnouncements: jest.fn(),
  listNotifications: jest.fn(),
  markAnnouncementRead: jest.fn(),
  markNotificationRead: jest.fn(),
}));

/** Socket callbacks the hook registered, so tests can fire live events. */
const socket: { notification?: (n: NotificationData) => void; connect?: () => void } = {};
jest.mock("@/app/context/WebSocketContext", () => ({
  useWebSocketContextSafe: () => ({
    onNotification: (cb: (n: NotificationData) => void) => {
      socket.notification = cb;
      return () => {
        socket.notification = undefined;
      };
    },
    onConnect: (cb: () => void) => {
      socket.connect = cb;
      return () => {
        socket.connect = undefined;
      };
    },
  }),
}));

const mocked = service as jest.Mocked<typeof service>;
const USER = mockTeacher.userId;

/**
 * A server notification addressed to the test teacher.
 *
 * @param id - Record id.
 * @param extra - Fields to add or change.
 * @returns The record.
 */
const record = (id: string, extra: Partial<service.NotificationRecord> = {}): service.NotificationRecord => ({
  _id: id,
  title: `Notification ${id}`,
  message: "Body",
  type: "attendance_alert",
  createdAt: "2026-09-10T08:00:00.000Z",
  readBy: [],
  ...extra,
});

/**
 * Renders the hook under a fresh QueryClient and a signed-in teacher.
 *
 * @returns The hook result and the client, for cache assertions.
 */
function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } } });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>
      <AuthContext.Provider value={makeMockAuthValue(mockTeacher)}>{children}</AuthContext.Provider>
    </QueryClientProvider>
  );
  return { client, ...renderHook(() => useNotifications(), { wrapper }) };
}

beforeEach(() => {
  jest.clearAllMocks();
  socket.notification = undefined;
  socket.connect = undefined;
  mocked.listAnnouncements.mockResolvedValue({ data: [] });
  mocked.listNotifications.mockResolvedValue({ data: [record("n1"), record("n2", { readBy: [USER] })] });
  mocked.markNotificationRead.mockResolvedValue(record("n1"));
  mocked.markAnnouncementRead.mockResolvedValue(record("a1"));
});

describe("useNotifications", () => {
  it("loads both lists once, for the signed-in user, and counts unread", async () => {
    const { result } = setup();
    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mocked.listAnnouncements).toHaveBeenCalledWith(USER);
    expect(mocked.listNotifications).toHaveBeenCalledWith(USER);
    expect(mocked.listAnnouncements).toHaveBeenCalledTimes(1);
    expect(result.current.notifications).toHaveLength(2);
    expect(result.current.counts.unread).toBe(1);
    expect(result.current.isPartial).toBe(false);
  });

  it("keeps the list that loaded when the other one fails, and says it is partial", async () => {
    mocked.listAnnouncements.mockRejectedValue(ApiError.unreachable());
    const { result } = setup();

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.notifications).toHaveLength(2);
    expect(result.current.isPartial).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it("exposes an ApiError, not a string, when both lists fail", async () => {
    mocked.listAnnouncements.mockRejectedValue(ApiError.offline());
    mocked.listNotifications.mockRejectedValue(ApiError.offline());
    const { result } = setup();

    await waitFor(() => expect(result.current.error).not.toBeNull());

    expect(result.current.error).toBeInstanceOf(ApiError);
    expect((result.current.error as ApiError).code).toBe("NETWORK_OFFLINE");
    expect(result.current.loading).toBe(false);
  });

  it("refetches when the socket delivers a notification, and ignores chat messages", async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mocked.listNotifications).toHaveBeenCalledTimes(1);

    act(() => socket.notification?.({ _id: "x", title: "Chat", type: "chat_message", createdAt: "" }));
    expect(mocked.listNotifications).toHaveBeenCalledTimes(1);

    mocked.listNotifications.mockResolvedValue({ data: [record("n3"), record("n1"), record("n2", { readBy: [USER] })] });
    act(() => socket.notification?.({ _id: "n3", title: "New", type: "attendance_alert", createdAt: "" }));

    await waitFor(() => expect(result.current.notifications).toHaveLength(3));
    expect(mocked.listNotifications).toHaveBeenCalledTimes(2);
  });

  it("does not refetch on the first socket connect while the data is fresh", async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => socket.connect?.());

    expect(mocked.listNotifications).toHaveBeenCalledTimes(1);
  });

  it("marks one notification read at once and confirms with the server", async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.loading).toBe(false));
    // Serve the post-mutation state so the invalidation refetch agrees with the optimistic update.
    mocked.listNotifications.mockResolvedValue({ data: [record("n1", { readBy: [USER] }), record("n2", { readBy: [USER] })] });

    await act(async () => {
      await result.current.markAsRead("notification:n1");
    });

    expect(mocked.markNotificationRead).toHaveBeenCalledWith("n1");
    await waitFor(() => expect(result.current.counts.unread).toBe(0));
  });

  it("rolls the list back and shows a message when the server refuses", async () => {
    const { toast } = jest.requireMock("@/components/CustomToast");
    const { result } = setup();
    await waitFor(() => expect(result.current.loading).toBe(false));
    mocked.markNotificationRead.mockRejectedValue(ApiError.unreachable());

    await act(async () => {
      await result.current.markAsRead("notification:n1");
    });

    expect(toast.error).toHaveBeenCalled();
    await waitFor(() => expect(result.current.counts.unread).toBe(1));
  });

  it("marks every unread notification with the right endpoint per kind", async () => {
    mocked.listAnnouncements.mockResolvedValue({ data: [record("a1", { type: "announcement", source: "school" })] });
    const { result } = setup();
    await waitFor(() => expect(result.current.counts.unread).toBe(2));
    mocked.listAnnouncements.mockResolvedValue({ data: [record("a1", { readBy: [USER] })] });
    mocked.listNotifications.mockResolvedValue({ data: [record("n1", { readBy: [USER] }), record("n2", { readBy: [USER] })] });

    await act(async () => {
      await result.current.markAllAsRead();
    });

    expect(mocked.markAnnouncementRead).toHaveBeenCalledWith("a1");
    expect(mocked.markNotificationRead).toHaveBeenCalledWith("n1");
    expect(mocked.markNotificationRead).toHaveBeenCalledTimes(1);
  });

  it("keys the cache per user so one account never reads another's inbox", async () => {
    const { client, result } = setup();
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(client.getQueryData(queryKeys.notifications.list(USER, { view: "inbox" }))).toBeDefined();
    expect(client.getQueryData(queryKeys.notifications.list("someone-else", { view: "inbox" }))).toBeUndefined();
  });
});
