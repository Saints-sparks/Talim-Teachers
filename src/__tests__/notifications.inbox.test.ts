import {
  buildInbox,
  countNotifications,
  filterNotifications,
  inferCategory,
  isSchoolAnnouncementNotification,
  normalizeAnnouncement,
  normalizeSystemNotification,
} from "@/app/lib/notifications/inbox";
import { categoryLabel } from "@/components/notifications/categoryMeta";
import { formatDate } from "@/components/notifications/format";
import { extractRecords, extractTotal, type NotificationRecord } from "@/app/services/notifications.service";

const USER = "68c0a1b2c3d4e5f600000001";

/**
 * Builds a notification record with sensible defaults.
 *
 * @param overrides - Fields to change.
 * @returns A server record.
 */
function record(overrides: Partial<NotificationRecord> = {}): NotificationRecord {
  return { _id: "n1", title: "Title", message: "Body", createdAt: "2026-09-10T08:00:00.000Z", ...overrides };
}

describe("inferCategory", () => {
  it("trusts a known notification type over keywords", () => {
    // "translate" contains "late"; the type must win over text matching.
    expect(inferCategory(record({ type: "timetable_update", title: "Please translate the timetable" }), "other")).toBe("academics");
    expect(inferCategory(record({ type: "attendance_alert" }), "other")).toBe("attendance");
    expect(inferCategory(record({ type: "result_published" }), "other")).toBe("grading");
    expect(inferCategory(record({ type: "chat_message" }), "other")).toBe("messages");
  });

  it("falls back to keywords for unknown types, then to the given default", () => {
    expect(inferCategory(record({ type: "custom", title: "Absent students today" }), "other")).toBe("attendance");
    expect(inferCategory(record({ type: "custom", title: "New resource uploaded" }), "other")).toBe("resources");
    expect(inferCategory(record({ type: "custom", title: "Hello", message: "Hi" }), "other")).toBe("other");
  });
});

describe("normalizeSystemNotification", () => {
  it("marks a notification unread until the user appears in readBy", () => {
    expect(normalizeSystemNotification(record({ readBy: [] }), USER).unread).toBe(true);
    expect(normalizeSystemNotification(record({ readBy: [{ _id: USER }] }), USER).unread).toBe(false);
    expect(normalizeSystemNotification(record({ readBy: [USER] }), USER).unread).toBe(false);
  });

  it("prefers the server's isRead flag over readBy", () => {
    expect(normalizeSystemNotification(record({ isRead: true, readBy: [] }), USER).unread).toBe(false);
    expect(normalizeSystemNotification(record({ isRead: false, readBy: [USER] }), USER).unread).toBe(true);
  });

  it("names the sender from the server field, the populated user, then a source-based fallback", () => {
    expect(normalizeSystemNotification(record({ senderName: "Mrs Ade" }), USER).senderName).toBe("Mrs Ade");
    expect(normalizeSystemNotification(record({ senderName: "Unknown Sender", senderId: { firstName: "Ada", lastName: "Bello" } }), USER).senderName).toBe(
      "Ada Bello",
    );
    expect(normalizeSystemNotification(record({ source: "talim" }), USER).senderName).toBe("Talim Admin");
    expect(normalizeSystemNotification(record({}), USER).senderName).toBe("System Notification");
  });

  it("collects attachments and related links from their fields", () => {
    const item = normalizeSystemNotification(
      record({
        attachments: ["https://x/a.pdf"],
        attachment: "https://x/b.pdf",
        metadata: { className: "JSS 1A", resourceTitle: "Notes", resourceUrl: "https://x/notes", href: "/grading" },
      }),
      USER,
    );
    expect(item.attachments).toEqual(["https://x/a.pdf", "https://x/b.pdf"]);
    expect(item.related).toEqual([
      { label: "JSS 1A" },
      { label: "Notes", href: "https://x/notes" },
      { label: "Open related item", href: "/grading" },
    ]);
  });

  it("gives ids a prefix that cannot collide across the two lists", () => {
    expect(normalizeSystemNotification(record({ _id: "abc" }), USER).id).toBe("notification:abc");
    expect(normalizeAnnouncement(record({ _id: "abc" }), USER).id).toBe("announcement:abc");
  });
});

describe("normalizeAnnouncement", () => {
  it("reads content when message is absent and uses publishedAt as the time", () => {
    const item = normalizeAnnouncement(
      record({ message: undefined, content: "School closes early", publishedAt: "2026-09-11T10:00:00.000Z", createdAt: "2026-09-10T08:00:00.000Z" }),
      USER,
    );
    expect(item.message).toBe("School closes early");
    expect(item.createdAt).toBe("2026-09-11T10:00:00.000Z");
    expect(item.category).toBe("announcement");
    expect(item.source).toBe("school");
  });

  it("falls back to the school name when the sender is unnamed", () => {
    expect(normalizeAnnouncement(record({ schoolName: "Talim Test School" }), USER).senderName).toBe("Talim Test School");
  });
});

describe("buildInbox", () => {
  it("merges both lists newest first and drops school announcements duplicated in notifications", () => {
    const announcements = [record({ _id: "a1", createdAt: "2026-09-09T08:00:00.000Z" })];
    const notifications = [
      record({ _id: "n1", createdAt: "2026-09-10T08:00:00.000Z" }),
      record({ _id: "dup", source: "school", type: "announcement", createdAt: "2026-09-12T08:00:00.000Z" }),
    ];
    expect(isSchoolAnnouncementNotification(notifications[1])).toBe(true);

    const inbox = buildInbox(announcements, notifications, USER);
    expect(inbox.map((item) => item.id)).toEqual(["notification:n1", "announcement:a1"]);
  });

  it("still returns the list that loaded when the other one failed", () => {
    expect(buildInbox(null, [record({ _id: "n1" })], USER)).toHaveLength(1);
    expect(buildInbox([record({ _id: "a1" })], null, USER)).toHaveLength(1);
    expect(buildInbox(null, null, USER)).toEqual([]);
  });
});

describe("countNotifications and filterNotifications", () => {
  const inbox = buildInbox(
    [record({ _id: "a1", title: "Sports day", createdAt: "2026-09-09T08:00:00.000Z", readBy: [USER] })],
    [
      record({ _id: "n1", type: "attendance_alert", title: "Class 1A absent", createdAt: "2026-09-10T08:00:00.000Z" }),
      record({ _id: "n2", type: "grade_released", title: "Grades out", createdAt: "2026-09-11T08:00:00.000Z" }),
    ],
    USER,
  );

  it("counts the total, unread and per category", () => {
    const counts = countNotifications(inbox);
    expect(counts.all).toBe(3);
    expect(counts.unread).toBe(2);
    expect(counts.announcement).toBe(1);
    expect(counts.attendance).toBe(1);
    expect(counts.grading).toBe(1);
    expect(counts.other).toBe(0);
  });

  it("filters by tab", () => {
    const ids = (tab: Parameters<typeof filterNotifications>[1]["tab"]) =>
      filterNotifications(inbox, { tab, query: "", sort: "newest" }, categoryLabel).map((item) => item.rawId);
    expect(ids("unread")).toEqual(["n2", "n1"]);
    expect(ids("attendance")).toEqual(["n1"]);
    expect(ids("all")).toEqual(["n2", "n1", "a1"]);
  });

  it("searches title, message, sender, source and the category label the user sees", () => {
    const search = (query: string) =>
      filterNotifications(inbox, { tab: "all", query, sort: "newest" }, categoryLabel).map((item) => item.rawId);
    expect(search("sports")).toEqual(["a1"]);
    expect(search("ATTENDANCE")).toEqual(["n1"]);
    expect(search("nothing like this")).toEqual([]);
  });

  it("sorts oldest first, and unread first within newest-first order", () => {
    const sorted = (sort: Parameters<typeof filterNotifications>[1]["sort"]) =>
      filterNotifications(inbox, { tab: "all", query: "", sort }, categoryLabel).map((item) => item.rawId);
    expect(sorted("oldest")).toEqual(["a1", "n1", "n2"]);
    expect(sorted("unread")).toEqual(["n2", "n1", "a1"]);
  });
});

describe("list body helpers", () => {
  it("reads records from a bare array, data or announcements", () => {
    const item = record();
    expect(extractRecords([item])).toEqual([item]);
    expect(extractRecords({ data: [item] })).toEqual([item]);
    expect(extractRecords({ announcements: [item] })).toEqual([item]);
    expect(extractRecords(null)).toEqual([]);
  });

  it("reports meta.total when present, else the page length", () => {
    expect(extractTotal({ data: [record()], meta: { total: 42 } })).toBe(42);
    expect(extractTotal([record(), record()])).toBe(2);
  });
});

describe("formatDate", () => {
  const now = new Date(2026, 8, 18, 12, 0, 0);

  it("says Today and Yesterday for recent dates and a date otherwise", () => {
    expect(formatDate(new Date(2026, 8, 18, 9, 0, 0).toISOString(), now)).toBe("Today");
    expect(formatDate(new Date(2026, 8, 17, 9, 0, 0).toISOString(), now)).toBe("Yesterday");
    expect(formatDate(new Date(2026, 7, 1, 9, 0, 0).toISOString(), now)).toMatch(/2026/);
  });
});
