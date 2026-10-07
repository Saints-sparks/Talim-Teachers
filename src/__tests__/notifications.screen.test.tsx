/**
 * @jest-environment jsdom
 */
import React from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@/test-utils/render";
import { mockTeacher } from "@/test-utils/render";
import { NotificationsScreen } from "@/components/notifications/NotificationsScreen";
import { NotificationDetailScreen } from "@/components/notifications/NotificationDetailScreen";
import * as service from "@/app/services/notifications.service";
import { toast } from "@/components/CustomToast";
import { ApiError } from "@/lib/apiError";
import {
  listAnnouncementsFixture,
  listNotificationsFixture,
  makeNotificationCountsFixture,
  markAllReadFixture,
  markReadFixture,
  resetInboxFixtureStore,
} from "@/lib/fixtures/inbox.fixture";

const push = jest.fn();
const replace = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace }),
  usePathname: () => "/notifications",
  useSearchParams: () => new URLSearchParams(),
}));
jest.mock("@/components/CustomToast", () => ({ toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }));
jest.mock("@/app/services/notifications.service", () => ({
  ...jest.requireActual("@/app/services/notifications.service"),
  listAnnouncements: jest.fn(),
  listNotifications: jest.fn(),
  getNotificationCounts: jest.fn(),
  getNotification: jest.fn(),
  markAllNotificationsRead: jest.fn(),
  markAnnouncementRead: jest.fn(),
  markNotificationRead: jest.fn(),
}));

const mocked = service as jest.Mocked<typeof service>;
const toastMock = toast as jest.Mocked<typeof toast>;
const originalMatchMedia = window.matchMedia;

/**
 * The row button of a notification.
 *
 * @param title - Its title.
 * @returns The button.
 */
async function row(title: string | RegExp): Promise<HTMLElement> {
  const list = await screen.findByRole("list", { name: "Notifications" });
  return within(list).getByRole("button", { name: title });
}

/**
 * A tab by its label.
 *
 * @param label - "All", "Unread", …
 * @returns The tab.
 */
function tab(label: string): HTMLElement {
  return screen.getByRole("tab", { name: new RegExp(`^${label}`) });
}

/**
 * The titles of the listed rows, in order.
 *
 * @returns The titles.
 */
function rowTitles(): string[] {
  const list = screen.getByRole("list", { name: "Notifications" });
  return within(list)
    .getAllByRole("button")
    .map((button) => button.querySelector(".text-\\[15px\\]")?.textContent?.replace(/^Unread: /, "") ?? "");
}

beforeEach(() => {
  jest.clearAllMocks();
  resetInboxFixtureStore();
  window.matchMedia = originalMatchMedia;
  mocked.listNotifications.mockImplementation(async (_user, paging) => listNotificationsFixture(paging?.page, paging?.limit, paging?.unread));
  mocked.listAnnouncements.mockImplementation(async (_user, paging) => listAnnouncementsFixture(paging?.page, paging?.limit));
  mocked.getNotificationCounts.mockImplementation(async () => makeNotificationCountsFixture());
  mocked.markNotificationRead.mockImplementation(async (id) => markReadFixture(id) ?? { _id: id });
  mocked.markAnnouncementRead.mockImplementation(async (id) => markReadFixture(id) ?? { _id: id });
  mocked.markAllNotificationsRead.mockImplementation(async () => markAllReadFixture());
});

describe("NotificationsScreen", () => {
  it("renders the header, the tabs with their counts (no Messages tab), the list and the first item, with every guide target", async () => {
    const { container } = render(<NotificationsScreen />);

    expect(screen.getByRole("heading", { level: 1, name: "Notifications" })).toBeInTheDocument();
    expect(screen.getByText("School announcements, deadlines and Talim updates.")).toBeInTheDocument();
    const settings = screen.getByRole("link", { name: "Alert settings" });
    expect(settings).toHaveAttribute("href", "/settings?tab=notifications");
    expect(settings).toHaveAttribute("title", "Choose which alerts reach you");

    await waitFor(() => expect(tab("Unread")).toHaveTextContent("Unread3"));
    const tabs = within(screen.getByRole("tablist")).getAllByRole("tab");
    expect(tabs.map((t) => t.textContent)).toEqual(["All6", "Unread3", "Academics2", "Attendance1", "Announcements2", "Support0"]);
    expect(tab("All")).toHaveAttribute("aria-selected", "true");
    expect(tab("All")).toHaveAttribute("aria-controls", "notifications-panel");

    expect(await row(/1st CA closes in 7 days/)).toBeInTheDocument();
    expect(rowTitles()).toEqual([
      "Register not yet submitted: JSS1 A",
      "1st CA closes in 7 days",
      "Inter-house sports on Friday 9 October",
      "Staff meeting moved to Wednesday",
      "Scores published: 1st CA Mathematics · JSS2 B",
      "New in Talim: period-by-period timetable",
    ]);

    // The first item is open, but opening by default does not mark it read.
    expect(screen.getByRole("heading", { level: 2, name: "Register not yet submitted: JSS1 A" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Take register" })).toHaveAttribute("href", "/attendance/class/c1?date=2026-09-25");
    expect(mocked.markNotificationRead).not.toHaveBeenCalled();

    for (const target of ["notifications-mark-all", "notifications-tabs", "notifications-list", "notifications-detail"]) {
      expect(container.querySelector(`[data-guide="${target}"]`)).not.toBeNull();
    }
    expect(screen.getByRole("button", { name: "Mark all as read" })).toHaveAttribute("title", "Clear every unread marker");
  });

  it("filters by tab, writes the tab to the URL, and moves between tabs with the arrow keys", async () => {
    render(<NotificationsScreen />);
    await row(/1st CA closes/);

    fireEvent.click(tab("Academics"));
    expect(replace).toHaveBeenCalledWith("/notifications?tab=academics", { scroll: false });
    expect(tab("Academics")).toHaveAttribute("aria-selected", "true");
    expect(rowTitles()).toEqual(["1st CA closes in 7 days", "Scores published: 1st CA Mathematics · JSS2 B"]);
    expect(screen.getByRole("heading", { level: 2, name: "1st CA closes in 7 days" })).toBeInTheDocument();

    fireEvent.keyDown(tab("Academics"), { key: "ArrowRight" });
    expect(tab("Attendance")).toHaveAttribute("aria-selected", "true");
    expect(tab("Attendance")).toHaveFocus();
    expect(rowTitles()).toEqual(["Register not yet submitted: JSS1 A"]);

    fireEvent.keyDown(tab("Attendance"), { key: "ArrowRight" });
    expect(tab("Announcements")).toHaveAttribute("aria-selected", "true");
    expect(rowTitles()).toEqual(["Inter-house sports on Friday 9 October", "Staff meeting moved to Wednesday"]);

    fireEvent.keyDown(tab("Announcements"), { key: "End" });
    expect(tab("Support")).toHaveAttribute("aria-selected", "true");
    expect(screen.queryByRole("list", { name: "Notifications" })).not.toBeInTheDocument();

    fireEvent.click(tab("All"));
    expect(replace).toHaveBeenLastCalledWith("/notifications", { scroll: false });
    expect(rowTitles()).toHaveLength(6);
  });

  it("opens on the tab from ?tab=", async () => {
    render(<NotificationsScreen initialTab="unread" />);
    await row(/1st CA closes/);
    expect(tab("Unread")).toHaveAttribute("aria-selected", "true");
    expect(rowTitles()).toEqual(["Register not yet submitted: JSS1 A", "1st CA closes in 7 days", "Inter-house sports on Friday 9 October"]);
  });

  it("marks a row read when it is selected: one call, the dot goes, the counts go down, and it stays on the Unread tab", async () => {
    render(<NotificationsScreen initialTab="unread" />);
    const n1 = await row(/1st CA closes in 7 days/);
    await waitFor(() => expect(tab("Unread")).toHaveTextContent("Unread3"));
    expect(n1.querySelector('[data-unread-dot="true"]')).not.toBeNull();
    expect(within(n1).getByText("Unread:")).toBeInTheDocument();

    fireEvent.click(n1);

    await waitFor(() => expect(tab("Unread")).toHaveTextContent("Unread2"));
    const after = await row(/1st CA closes in 7 days/);
    expect(after.querySelector('[data-unread-dot="true"]')).toBeNull();
    expect(within(after).queryByText("Unread:")).not.toBeInTheDocument();
    expect(after).toHaveAttribute("aria-current", "true");
    expect(mocked.markNotificationRead).toHaveBeenCalledTimes(1);
    expect(mocked.markNotificationRead).toHaveBeenCalledWith("n1");
    expect(screen.getByRole("heading", { level: 2, name: "1st CA closes in 7 days" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open grading" })).toHaveAttribute("href", "/grading?courseId=k1&assessmentId=a1");

    // Selecting it again (already read) does not call the server again.
    fireEvent.click(after);
    expect(mocked.markNotificationRead).toHaveBeenCalledTimes(1);
  });

  it("shows attachments with their real kind, size and a Download link, and the announcement's action", async () => {
    render(<NotificationsScreen />);
    fireEvent.click(await row(/Inter-house sports/));

    await waitFor(() => expect(mocked.markAnnouncementRead).toHaveBeenCalledWith("n3"));
    const files = within(screen.getByRole("list", { name: "Attachments" })).getAllByRole("listitem");
    expect(files).toHaveLength(2);
    expect(files[0]).toHaveTextContent("PDF");
    expect(files[0]).toHaveTextContent("Sports day schedule.pdf");
    expect(files[0]).toHaveTextContent("178 KB");
    expect(files[1]).toHaveTextContent("DOC");
    expect(files[1]).toHaveTextContent("Consent form.docx");
    const download = within(files[0]).getByRole("link", { name: "Download Sports day schedule.pdf" });
    expect(download).toHaveAttribute("href", "https://res.cloudinary.com/talim-fixture/raw/upload/Sports%20day%20schedule.pdf");
    expect(download).toHaveAttribute("download");
    expect(download).toHaveAttribute("target", "_blank");
    expect(download).toHaveAttribute("rel", "noopener noreferrer");
    expect(screen.getByRole("link", { name: "Open announcements" })).toHaveAttribute("href", "/notifications?tab=announcements");
    expect(screen.getByText(/^School admin · /)).toBeInTheDocument();
  });

  it("derives attachments for older records and links a legacy internal href as Open", async () => {
    mocked.listAnnouncements.mockResolvedValue({ data: [], meta: { total: 0 } });
    mocked.listNotifications.mockResolvedValue({
      data: [
        {
          _id: "old1",
          title: "Old notice",
          message: "Line one\nLine two",
          type: "system_notice",
          createdAt: "2026-09-20T09:00:00.000Z",
          isRead: true,
          attachments: ["https://files.example/uploads/Term%20plan.pptx", "https://files.example/uploads/photo.png"],
          metadata: { href: "/subjects" },
        },
      ],
      meta: { total: 1 },
    });
    render(<NotificationsScreen />);

    await screen.findByRole("heading", { level: 2, name: "Old notice" });
    const files = within(screen.getByRole("list", { name: "Attachments" })).getAllByRole("listitem");
    expect(files[0]).toHaveTextContent("Slides");
    expect(files[0]).toHaveTextContent("Term plan.pptx");
    expect(files[1]).toHaveTextContent("Image");
    expect(within(files[1]).getByRole("link", { name: "Download photo.png" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open" })).toHaveAttribute("href", "/subjects");
    const detail = screen.getByRole("article", { name: "Old notice" });
    expect(within(detail).getByText(/Line one\s+Line two/)).toHaveClass("whitespace-pre-line");
  });

  it("marks everything read with ONE read-all call and says so", async () => {
    render(<NotificationsScreen />);
    await row(/1st CA closes/);
    const button = screen.getByRole("button", { name: "Mark all as read" });
    await waitFor(() => expect(button).toBeEnabled());

    fireEvent.click(button);

    await waitFor(() => expect(toastMock.success).toHaveBeenCalledWith("All notifications marked as read."));
    expect(mocked.markAllNotificationsRead).toHaveBeenCalledTimes(1);
    expect(mocked.markNotificationRead).not.toHaveBeenCalled();
    expect(mocked.markAnnouncementRead).not.toHaveBeenCalled();
    await waitFor(() => expect(tab("Unread")).toHaveTextContent("Unread0"));
    expect(document.querySelector('[data-unread-dot="true"]')).toBeNull();
    expect(button).toBeDisabled();
  });

  it("puts the unread markers back when read-all is refused", async () => {
    mocked.markAllNotificationsRead.mockRejectedValue(ApiError.unreachable());
    render(<NotificationsScreen />);
    await row(/1st CA closes/);
    await waitFor(() => expect(tab("Unread")).toHaveTextContent("Unread3"));

    fireEvent.click(screen.getByRole("button", { name: "Mark all as read" }));

    await waitFor(() => expect(toastMock.error).toHaveBeenCalled());
    expect(toastMock.success).not.toHaveBeenCalled();
    await waitFor(() => expect(document.querySelectorAll('[data-unread-dot="true"]')).toHaveLength(3));
    expect(tab("Unread")).toHaveTextContent("Unread3");
  });

  it("loads the next page with Load more", async () => {
    const make = (from: number, n: number) =>
      Array.from({ length: n }, (_, i) => ({
        _id: `p${from + i}`,
        title: `Paged notice ${from + i}`,
        message: "Body",
        type: "system_notice",
        createdAt: new Date(Date.UTC(2026, 8, 25) - (from + i) * 3_600_000).toISOString(),
        isRead: true,
      }));
    let releasePage2: () => void = () => undefined;
    mocked.listAnnouncements.mockResolvedValue({ data: [], meta: { total: 0 } });
    mocked.listNotifications.mockImplementation((_user, paging) =>
      paging?.page === 2
        ? new Promise((resolve) => {
            releasePage2 = () => resolve({ data: make(20, 3), meta: { total: 23 } });
          })
        : Promise.resolve({ data: make(0, 20), meta: { total: 23 } }),
    );
    render(<NotificationsScreen />);
    await row(/^Paged notice 0 /);
    expect(rowTitles()).toHaveLength(20);

    fireEvent.click(screen.getByRole("button", { name: "Load more" }));

    expect(await screen.findByRole("button", { name: "Loading…" })).toBeDisabled();
    expect(mocked.listNotifications).toHaveBeenLastCalledWith(mockTeacher.userId, { page: 2, limit: 20 });
    await act(async () => releasePage2());
    await waitFor(() => expect(rowTitles()).toHaveLength(23));
    expect(screen.queryByRole("button", { name: "Load more" })).not.toBeInTheDocument();
  });

  it("says Nothing here. for an empty tab and something friendlier for an empty inbox", async () => {
    mocked.listNotifications.mockResolvedValue({ data: [], meta: { total: 0 } });
    const { unmount } = render(<NotificationsScreen initialTab="attendance" />);
    expect(await screen.findByText("Nothing here.")).toBeInTheDocument();
    expect(screen.getByText("Nothing to open in this tab. Try another tab.")).toBeInTheDocument();
    unmount();

    mocked.listAnnouncements.mockResolvedValue({ data: [], meta: { total: 0 } });
    render(<NotificationsScreen />);
    expect(await screen.findByText(/You're all caught up/)).toBeInTheDocument();
  });

  it("shows a skeleton while loading", () => {
    mocked.listNotifications.mockReturnValue(new Promise(() => undefined));
    render(<NotificationsScreen />);
    expect(screen.getByRole("status", { name: "Loading notifications" })).toBeInTheDocument();
  });

  it("shows an error with a retry when both feeds fail", async () => {
    mocked.listNotifications.mockRejectedValue(ApiError.offline());
    mocked.listAnnouncements.mockRejectedValue(ApiError.offline());
    render(<NotificationsScreen />);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("We could not load your notifications");
    expect(alert).toHaveTextContent("You're offline");

    mocked.listNotifications.mockImplementation(async (_user, paging) => listNotificationsFixture(paging?.page, paging?.limit));
    mocked.listAnnouncements.mockImplementation(async (_user, paging) => listAnnouncementsFixture(paging?.page, paging?.limit));
    fireEvent.click(within(alert).getByRole("button", { name: "Try again" }));
    expect(await row(/1st CA closes/)).toBeInTheDocument();
  });

  it("warns when only one feed loaded, and counts the loaded items when the counts fail", async () => {
    mocked.listAnnouncements.mockRejectedValue(ApiError.unreachable());
    mocked.getNotificationCounts.mockRejectedValue(ApiError.unreachable());
    render(<NotificationsScreen />);

    expect(await screen.findByRole("alert")).toHaveTextContent("School announcements couldn't be loaded");
    expect(rowTitles()).toHaveLength(4);
    await waitFor(() => expect(tab("All")).toHaveTextContent("All4"));
    expect(tab("Unread")).toHaveTextContent("Unread2");
    expect(tab("Announcements")).toHaveTextContent("Announcements0");
  });

  it("on small screens shows the detail alone, focuses its title, and returns focus to the row on Back", async () => {
    render(<NotificationsScreen />);
    const n5 = await row(/Scores published/);

    fireEvent.click(n5);

    const heading = screen.getByRole("heading", { level: 2, name: "Scores published: 1st CA Mathematics · JSS2 B" });
    await waitFor(() => expect(heading).toHaveFocus());
    expect(screen.getByRole("tabpanel")).toHaveClass("hidden");

    fireEvent.click(screen.getByRole("button", { name: "Back to notifications" }));

    await waitFor(() => expect(n5).toHaveFocus());
    expect(screen.getByRole("tabpanel")).not.toHaveClass("hidden");
  });

  it("keeps focus in the list on wide screens", async () => {
    window.matchMedia = ((query: string) => ({ ...originalMatchMedia(query), matches: true })) as typeof window.matchMedia;
    render(<NotificationsScreen />);
    const n5 = await row(/Scores published/);
    n5.focus();

    fireEvent.click(n5);

    expect(screen.getByRole("heading", { level: 2, name: /Scores published/ })).toBeInTheDocument();
    expect(n5).toHaveFocus();
    expect(screen.getByRole("tabpanel")).not.toHaveClass("hidden");
  });
});

describe("NotificationDetailScreen (/notifications/[id])", () => {
  it("shows the notification with a way back, and marks it read once on open", async () => {
    mocked.getNotification.mockResolvedValue({
      _id: "n9",
      title: "Term results returned",
      message: "The office returned JSS1 A's term results with a note.",
      type: "result_published",
      category: "grading",
      senderName: "School office",
      createdAt: "2026-09-25T09:00:00.000Z",
      isRead: false,
      metadata: { target: { page: "grading", classId: "c1" }, actionLabel: "Open term results" },
    });
    render(<NotificationDetailScreen id="n9" />);

    expect(await screen.findByRole("heading", { level: 2, name: "Term results returned" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to notifications" })).toHaveAttribute("href", "/notifications");
    expect(screen.getByRole("link", { name: "Open term results" })).toHaveAttribute("href", "/grading?classId=c1");
    await waitFor(() => expect(mocked.markNotificationRead).toHaveBeenCalledWith("n9"));
    expect(mocked.markNotificationRead).toHaveBeenCalledTimes(1);
  });

  it("says when the notification is not available", async () => {
    mocked.getNotification.mockRejectedValue(new ApiError("NOT_FOUND", "Notification not found", 404));
    render(<NotificationDetailScreen id="gone" />);
    expect(await screen.findByRole("alert")).toHaveTextContent("This notification is not available");
    expect(screen.queryByRole("button", { name: "Try again" })).not.toBeInTheDocument();
    expect(mocked.markNotificationRead).not.toHaveBeenCalled();
  });
});
