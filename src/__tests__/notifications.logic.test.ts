import { buildInbox, normalizeSystemNotification, type TeacherNotification } from "@/app/lib/notifications/inbox";
import {
  attachmentBadge,
  categoryChip,
  countsAfterRead,
  countsAfterReadAll,
  countsAfterUnread,
  countsFromItems,
  defaultActionLabel,
  detailMeta,
  feedHasMore,
  filterByTab,
  matchesTab,
  mergeInboxPages,
  NOTIFICATION_TABS,
  notificationAction,
  notificationClock,
  notificationDay,
  notificationTabHref,
  parseNotificationTab,
  rowStamp,
  tabCounts,
  tabOfCategory,
} from "@/hooks/notifications/notifications.logic";
import {
  listAnnouncementsFixture,
  listNotificationsFixture,
  makeNotificationCountsFixture,
  resetInboxFixtureStore,
} from "@/lib/fixtures/inbox.fixture";
import type { NotificationRecord } from "@/app/services/notifications.service";
import type { NotificationCountsBody } from "@/types/inboxSettings";

const USER = "u-teacher-seyi";

/**
 * The fixture inbox, normalised.
 *
 * @returns The design's notifications, newest first.
 */
function fixtureInbox(): TeacherNotification[] {
  return buildInbox(listAnnouncementsFixture(1, 20).data, listNotificationsFixture(1, 20).data, USER);
}

/**
 * A normalised notification with the given metadata.
 *
 * @param extra - Fields of the server record.
 * @returns The inbox item.
 */
function item(extra: Partial<NotificationRecord> = {}): TeacherNotification {
  return normalizeSystemNotification({ _id: "x", title: "T", message: "M", createdAt: "2026-09-25T08:00:00.000Z", ...extra }, USER);
}

beforeEach(() => resetInboxFixtureStore());

describe("tabs", () => {
  it("has All, Unread, Academics, Attendance, Announcements and Support, and no Messages tab", () => {
    expect(NOTIFICATION_TABS.map((tab) => tab.label)).toEqual(["All", "Unread", "Academics", "Attendance", "Announcements", "Support"]);
    expect(NOTIFICATION_TABS.some((tab) => /message/i.test(tab.label))).toBe(false);
  });

  it("reads ?tab= and writes it back, with All as the plain URL", () => {
    expect(parseNotificationTab("announcements")).toBe("announcements");
    expect(parseNotificationTab("ACADEMICS")).toBe("academics");
    expect(parseNotificationTab("messages")).toBe("all");
    expect(parseNotificationTab(null)).toBe("all");
    expect(notificationTabHref("all")).toBe("/notifications");
    expect(notificationTabHref("unread")).toBe("/notifications?tab=unread");
  });

  it("maps categories onto tabs: academics, grading and resources are Academics; messages, account and other have none", () => {
    expect(tabOfCategory("academics")).toBe("academics");
    expect(tabOfCategory("grading")).toBe("academics");
    expect(tabOfCategory("resources")).toBe("academics");
    expect(tabOfCategory("attendance")).toBe("attendance");
    expect(tabOfCategory("announcement")).toBe("announcements");
    expect(tabOfCategory("support")).toBe("support");
    expect(matchesTab({ category: "support", unread: false }, "support")).toBe(true);
    expect(matchesTab({ category: "grading", unread: false }, "support")).toBe(false);
    expect(tabOfCategory("messages")).toBeNull();
    expect(tabOfCategory("account")).toBeNull();
    expect(tabOfCategory("other")).toBeNull();

    expect(matchesTab({ category: "other", unread: true }, "all")).toBe(true);
    expect(matchesTab({ category: "other", unread: true }, "unread")).toBe(true);
    expect(matchesTab({ category: "other", unread: true }, "academics")).toBe(false);
    expect(matchesTab({ category: "grading", unread: false }, "unread")).toBe(false);
  });

  it("lists leave under Attendance, and payments under All and Unread only (B11)", () => {
    expect(tabOfCategory("leave")).toBe("attendance");
    expect(tabOfCategory("payments")).toBeNull();
    expect(matchesTab({ category: "leave", unread: false }, "attendance")).toBe(true);
    expect(matchesTab({ category: "payments", unread: true }, "all")).toBe(true);
    expect(matchesTab({ category: "payments", unread: true }, "unread")).toBe(true);
    expect(NOTIFICATION_TABS.every((tab) => !matchesTab({ category: "payments", unread: false }, tab.id) || tab.id === "all")).toBe(true);

    const inbox = [
      item({ _id: "l1", category: "leave", type: "leave_request_update", createdAt: "2026-10-02T08:00:00.000Z" }),
      item({ _id: "p1", category: "payments", type: "payment_receipt_issued", createdAt: "2026-10-01T08:00:00.000Z" }),
    ];
    expect(filterByTab(inbox, "attendance").map((n) => n.rawId)).toEqual(["l1"]);
    expect(filterByTab(inbox, "academics")).toEqual([]);
    expect(filterByTab(inbox, "all").map((n) => n.rawId)).toEqual(["l1", "p1"]);
  });

  it("filters the fixture inbox per tab, and keeps a just-read one on the Unread tab", () => {
    const inbox = fixtureInbox();
    const ids = (tab: Parameters<typeof filterByTab>[1], keep?: Set<string>) => filterByTab(inbox, tab, keep).map((n) => n.rawId);
    expect(ids("all")).toEqual(["n2", "n1", "n3", "n6", "n5", "n7"]);
    expect(ids("unread")).toEqual(["n2", "n1", "n3"]);
    expect(ids("academics")).toEqual(["n1", "n5"]);
    expect(ids("attendance")).toEqual(["n2"]);
    expect(ids("announcements")).toEqual(["n3", "n6"]);
    expect(ids("unread", new Set(["notification:n5"]))).toEqual(["n2", "n1", "n3", "n5"]);
  });
});

describe("counts", () => {
  it("turns GET /notifications/counts into tab counts, Academics summing three categories", () => {
    const counts: NotificationCountsBody = {
      all: 12,
      unread: 5,
      byCategory: {
        academics: { all: 2, unread: 1 },
        grading: { all: 3, unread: 1 },
        resources: { all: 1, unread: 0 },
        attendance: { all: 4, unread: 2 },
        announcement: { all: 1, unread: 1 },
        messages: { all: 1, unread: 0 },
      },
    };
    expect(tabCounts(counts)).toEqual({ all: 12, unread: 5, academics: 6, attendance: 4, announcements: 1, support: 0 });
    expect(tabCounts({ all: 0, unread: 0, byCategory: {} })).toEqual({ all: 0, unread: 0, academics: 0, attendance: 0, announcements: 0, support: 0 });
    expect(tabCounts({ all: 2, unread: 1, byCategory: { support: { all: 2, unread: 1 } } }).support).toBe(2);
  });

  it("counts leave on the Attendance tab and payments on no category tab", () => {
    const counts: NotificationCountsBody = {
      all: 9,
      unread: 6,
      byCategory: {
        attendance: { all: 2, unread: 1 },
        leave: { all: 4, unread: 4 },
        payments: { all: 3, unread: 1 },
      },
    };
    expect(tabCounts(counts)).toEqual({ all: 9, unread: 6, academics: 0, attendance: 6, announcements: 0, support: 0 });
    expect(countsAfterRead(counts, "leave").byCategory.leave).toEqual({ all: 4, unread: 3 });
  });

  it("counts the loaded items the way the server counts both feeds", () => {
    expect(countsFromItems(fixtureInbox())).toEqual(makeNotificationCountsFixture());
    expect(tabCounts(makeNotificationCountsFixture())).toEqual({ all: 6, unread: 3, academics: 2, attendance: 1, announcements: 2, support: 0 });
  });

  it("lowers the unread counts on a read, restores them on a refusal, and zeroes them on read-all", () => {
    const before = makeNotificationCountsFixture();
    const after = countsAfterRead(before, "attendance");
    expect(after.unread).toBe(2);
    expect(after.byCategory.attendance).toEqual({ all: 1, unread: 0 });
    expect(after.all).toBe(6);
    expect(countsAfterUnread(after, "attendance")).toEqual(before);
    expect(countsAfterRead({ all: 1, unread: 0, byCategory: {} }, "other").unread).toBe(0);

    const none = countsAfterReadAll(before);
    expect(none.unread).toBe(0);
    expect(Object.values(none.byCategory).every((entry) => entry?.unread === 0)).toBe(true);
    expect(none.byCategory.announcement?.all).toBe(2);
  });
});

describe("paging", () => {
  it("knows when a feed has another page, from meta.total or a full page", () => {
    expect(feedHasMore({ data: [], meta: { total: 45 } }, 2, 20)).toBe(true);
    expect(feedHasMore({ data: [], meta: { total: 40 } }, 2, 20)).toBe(false);
    expect(feedHasMore(new Array(20).fill({ _id: "a" }), 1, 20)).toBe(true);
    expect(feedHasMore([{ _id: "a" }], 1, 20)).toBe(false);
    expect(feedHasMore(null, 1, 20)).toBe(false);
  });

  it("merges pages newest first with each id once", () => {
    const a = item({ _id: "a", createdAt: "2026-09-20T08:00:00.000Z" });
    const b = item({ _id: "b", createdAt: "2026-09-22T08:00:00.000Z" });
    const aRead = { ...a, unread: false };
    const merged = mergeInboxPages([{ items: [b, a] }, { items: [aRead] }]);
    expect(merged.map((n) => n.rawId)).toEqual(["b", "a"]);
    expect(merged[1].unread).toBe(false);
  });
});

describe("chips", () => {
  it("labels and colours the categories", () => {
    expect(categoryChip("grading")).toEqual({ label: "Academics", tone: "info" });
    expect(categoryChip("resources")).toEqual({ label: "Academics", tone: "info" });
    expect(categoryChip("attendance")).toEqual({ label: "Attendance", tone: "warning" });
    expect(categoryChip("announcement")).toEqual({ label: "Announcement", tone: "accent" });
    expect(categoryChip("messages")).toEqual({ label: "Messages", tone: "muted" });
    expect(categoryChip("account").label).toBe("Account");
    expect(categoryChip("other").label).toBe("Other");
    expect(categoryChip("leave")).toEqual({ label: "Leave", tone: "warning" });
    expect(categoryChip("payments")).toEqual({ label: "Payments", tone: "muted" });
    expect(categoryChip("support")).toEqual({ label: "Support", tone: "success" });
  });

  it("names each attachment kind for what it is", () => {
    expect(attachmentBadge("pdf")).toEqual({ label: "PDF", tone: "danger" });
    expect(attachmentBadge("image")).toEqual({ label: "Image", tone: "accent" });
    expect(attachmentBadge("doc")).toEqual({ label: "DOC", tone: "info" });
    expect(attachmentBadge("slides")).toEqual({ label: "Slides", tone: "warning" });
    expect(attachmentBadge("video")).toEqual({ label: "Video", tone: "success" });
    expect(attachmentBadge("other")).toEqual({ label: "File", tone: "muted" });
  });
});

describe("notificationAction", () => {
  it("opens a support ticket's thread under Settings → Help (v1.5 deep link)", () => {
    expect(notificationAction(item({ metadata: { target: { page: "support", ticketId: "tk-open" } } }))).toEqual({
      href: "/settings?tab=help&ticket=tk-open",
      label: "Open ticket",
    });
    expect(notificationAction(item({ metadata: { target: { page: "support", ticketId: "tk 9/1" }, actionLabel: "View reply" } }))).toEqual({
      href: "/settings?tab=help&ticket=tk%209%2F1",
      label: "View reply",
    });
  });

  it("routes a target through the shared mapper, with the producer's label", () => {
    expect(notificationAction(item({ metadata: { target: { page: "grading", courseId: "k1", assessmentId: "a1" }, actionLabel: "Open grading" } }))).toEqual({
      href: "/grading?courseId=k1&assessmentId=a1",
      label: "Open grading",
    });
    expect(notificationAction(item({ metadata: { target: { page: "attendance", classId: "c1", date: "2026-09-25" }, actionLabel: "Take register" } }))).toEqual({
      href: "/attendance/class/c1?date=2026-09-25",
      label: "Take register",
    });
  });

  it("falls back to a default label per page", () => {
    expect(notificationAction(item({ metadata: { target: { page: "announcements" } } }))).toEqual({
      href: "/notifications?tab=announcements",
      label: "Open announcements",
    });
    expect(notificationAction(item({ metadata: { target: { page: "timetable" } } }))).toEqual({ href: "/timetable", label: "Open timetable" });
    expect(notificationAction(item({ metadata: { target: { page: "messages", roomId: "room-obi" } } }))).toEqual({
      href: "/messages?room=room-obi",
      label: "Open message",
    });
    expect(notificationAction(item({ metadata: { target: { page: "attendance" }, actionLabel: "  " } }))?.label).toBe("Take register");
    expect(defaultActionLabel("grading")).toBe("Open grading");
    expect(defaultActionLabel("subjects")).toBe("Open subjects");
    expect(defaultActionLabel("settings")).toBe("Open settings");
    expect(defaultActionLabel("somewhere-new")).toBe("Open");
  });

  it("opens the register for a leave request, and gives a payments target no action", () => {
    const leave = item({
      category: "leave",
      metadata: { target: { page: "leave", classId: "c1", date: "2026-10-20" }, actionLabel: "Review request" },
    });
    expect(notificationAction(leave)).toEqual({ href: "/attendance/class/c1?date=2026-10-20", label: "Review request" });
    expect(notificationAction(item({ metadata: { target: { page: "leave" } } }))).toEqual({ href: "/attendance", label: "Open register" });

    const payments = item({ category: "payments", metadata: { target: { page: "payments" as never } } });
    expect(notificationAction(payments)).toBeNull();
    // A legacy internal link still works beside a target this app cannot route.
    expect(notificationAction(item({ metadata: { target: { page: "payments" as never }, href: "/settings" } }))).toEqual({ href: "/settings", label: "Open" });
  });

  it("links a legacy internal href or url as Open, and nothing else", () => {
    expect(notificationAction(item({ metadata: { href: "/grading" } }))).toEqual({ href: "/grading", label: "Open" });
    expect(notificationAction(item({ metadata: { url: "/subjects?courseId=k1" } }))).toEqual({ href: "/subjects?courseId=k1", label: "Open" });
    expect(notificationAction(item({ metadata: { href: "https://evil.example/x" } }))).toBeNull();
    expect(notificationAction(item({ metadata: { href: "//evil.example/x" } }))).toBeNull();
    expect(notificationAction(item({ metadata: { url: "/notifications" } }))).toBeNull();
    expect(notificationAction(item({}))).toBeNull();
  });
});

describe("time", () => {
  const now = new Date(2026, 8, 25, 12, 0, 0);

  it("says Today, Yesterday, a short date, and the year only when it differs", () => {
    expect(notificationDay(new Date(2026, 8, 25, 8, 0).toISOString(), now)).toBe("Today");
    expect(notificationDay(new Date(2026, 8, 24, 23, 59).toISOString(), now)).toBe("Yesterday");
    expect(notificationDay(new Date(2026, 8, 18, 14, 29).toISOString(), now)).toBe("18 Sep");
    expect(notificationDay(new Date(2025, 11, 3, 9, 0).toISOString(), now)).toBe("3 Dec 2025");
    expect(notificationDay("not a date", now)).toBe("");
  });

  it("writes the time the design's way", () => {
    expect(notificationClock(new Date(2026, 8, 25, 8, 0).toISOString())).toBe("8:00am");
    expect(notificationClock(new Date(2026, 8, 25, 14, 29).toISOString())).toBe("2:29pm");
    expect(notificationClock(new Date(2026, 8, 25, 0, 5).toISOString())).toBe("12:05am");
    expect(notificationClock(new Date(2026, 8, 25, 12, 0).toISOString())).toBe("12:00pm");
  });

  it("builds the row stamp and the detail meta line", () => {
    const at = new Date(2026, 8, 25, 8, 0).toISOString();
    expect(rowStamp(at, now)).toBe("Today · 8:00am");
    expect(detailMeta("Academic office", at, now)).toBe("Academic office · Today, 8:00am");
  });
});
