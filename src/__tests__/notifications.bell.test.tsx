/**
 * @jest-environment jsdom
 *
 * The shell's notification badges: the top bar's bell and the sidebar's
 * Notifications item read `GET /notifications/counts`, fall back to Today's
 * count, and never load the inbox on every page.
 */
import React from "react";
import { render, screen, waitFor, within } from "@/test-utils/render";
import Layout from "@/components/Layout";
import * as service from "@/app/services/notifications.service";
import { ApiError } from "@/lib/apiError";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  usePathname: () => "/dashboard",
  useSearchParams: () => new URLSearchParams(),
}));
jest.mock("@/app/context/ChatContext", () => ({ useChat: () => ({ totalUnread: 2 }) }));
jest.mock("@/hooks/today/useTeacherToday", () => ({
  useTeacherToday: () => ({
    data: { now: "2026-09-25T09:00:00.000Z", timezone: "Africa/Lagos", counts: { pendingRegisters: 1, unreadMessages: 4, unreadNotifications: 5 } },
    dataUpdatedAt: Date.now(),
  }),
  useSchoolNow: () => Date.parse("2026-09-25T09:00:00.000Z"),
}));
jest.mock("@/components/onboarding/AppGuide", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/tour/TourProvider", () => ({ TourProvider: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
jest.mock("@/app/services/notifications.service", () => ({
  ...jest.requireActual("@/app/services/notifications.service"),
  listAnnouncements: jest.fn(),
  listNotifications: jest.fn(),
  getNotificationCounts: jest.fn(),
}));

const mocked = service as jest.Mocked<typeof service>;

/**
 * The sidebar's Notifications link.
 *
 * @returns The link.
 */
function sidebarNotifications(): HTMLElement {
  return within(document.getElementById("app-sidebar") as HTMLElement).getByRole("link", { name: /^Notifications/ });
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("Layout notification badges", () => {
  it("shows the unread count from GET /notifications/counts on the bell and in the sidebar, without loading the inbox", async () => {
    mocked.getNotificationCounts.mockResolvedValue({ all: 9, unread: 3, byCategory: {} });
    render(
      <Layout>
        <p>Page</p>
      </Layout>,
    );

    expect(await screen.findByRole("link", { name: "Notifications, 3 unread" })).toHaveAttribute("href", "/notifications");
    expect(within(sidebarNotifications()).getByLabelText("3 unread")).toHaveTextContent("3");
    expect(mocked.getNotificationCounts).toHaveBeenCalledTimes(1);
    expect(mocked.listNotifications).not.toHaveBeenCalled();
    expect(mocked.listAnnouncements).not.toHaveBeenCalled();
    // The Messages badge still follows the live chat.
    expect(within(document.getElementById("app-sidebar") as HTMLElement).getByLabelText("2 unread")).toBeInTheDocument();
  });

  it("falls back to Today's count while the counts are unavailable", async () => {
    mocked.getNotificationCounts.mockRejectedValue(ApiError.unreachable());
    render(
      <Layout>
        <p>Page</p>
      </Layout>,
    );

    await waitFor(() => expect(mocked.getNotificationCounts).toHaveBeenCalled());
    expect(screen.getByRole("link", { name: "Notifications, 5 unread" })).toBeInTheDocument();
    expect(within(sidebarNotifications()).getByLabelText("5 unread")).toBeInTheDocument();
  });
});
