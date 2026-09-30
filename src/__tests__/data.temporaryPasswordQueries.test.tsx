/**
 * @jest-environment jsdom
 */
import React from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthContext } from "@/app/context/AuthContext";
import { makeMockAuthValue, mockTeacher, mockTeacherMustChangePassword } from "@/test-utils/render";
import type { User } from "@/types/auth";
import { api } from "@/lib/apiClient";
import * as service from "@/app/services/notifications.service";
import { useNotificationCounts, useNotificationInbox } from "@/hooks/notifications/useNotificationInbox";
import { useTeacherSettings } from "@/hooks/settings/useTeacherSettings";

jest.mock("@/lib/apiClient", () => ({ api: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), put: jest.fn(), delete: jest.fn() } }));
jest.mock("@/app/services/notifications.service", () => ({
  ...jest.requireActual("@/app/services/notifications.service"),
  listAnnouncements: jest.fn(),
  listNotifications: jest.fn(),
  getNotificationCounts: jest.fn(),
}));
jest.mock("@/app/context/WebSocketContext", () => ({
  useWebSocketContextSafe: () => ({ onNotification: () => () => undefined, onConnect: () => () => undefined }),
}));

const get = api.get as jest.Mock;
const mocked = service as jest.Mocked<typeof service>;

/**
 * Mounts the shell's always-on queries (settings, the bell's counts, the inbox) for `user`.
 *
 * @param user - The signed-in user.
 * @returns The rendered hooks.
 */
function mount(user: User) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>
      <AuthContext.Provider value={makeMockAuthValue(user)}>{children}</AuthContext.Provider>
    </QueryClientProvider>
  );
  return renderHook(() => ({ settings: useTeacherSettings(), counts: useNotificationCounts(), inbox: useNotificationInbox() }), { wrapper });
}

beforeEach(() => {
  jest.clearAllMocks();
  get.mockResolvedValue({ preferences: {} });
  mocked.getNotificationCounts.mockResolvedValue({ all: 0, unread: 0, byCategory: {} } as never);
  mocked.listNotifications.mockResolvedValue({ data: [], meta: { total: 0 } } as never);
  mocked.listAnnouncements.mockResolvedValue({ data: [], meta: { total: 0 } } as never);
});

describe("queries the shell mounts on every page", () => {
  it("ask for nothing while the teacher is still on a temporary password (the API answers 403)", async () => {
    const { result } = mount(mockTeacherMustChangePassword);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(get).not.toHaveBeenCalled();
    expect(mocked.getNotificationCounts).not.toHaveBeenCalled();
    expect(mocked.listNotifications).not.toHaveBeenCalled();
    expect(mocked.listAnnouncements).not.toHaveBeenCalled();
    expect(result.current.settings.fetchStatus).toBe("idle");
    expect(result.current.counts.fetchStatus).toBe("idle");
  });

  it("load once the password has been replaced", async () => {
    mount(mockTeacher);
    await waitFor(() => expect(get).toHaveBeenCalledWith("/teacher/settings"));
    await waitFor(() => expect(mocked.getNotificationCounts).toHaveBeenCalled());
    await waitFor(() => expect(mocked.listNotifications).toHaveBeenCalled());
  });
});
