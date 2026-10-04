import {
  attachmentFilesOf,
  attachmentKindOf,
  buildInbox,
  fileNameFromUrl,
  inferCategory,
  isSchoolAnnouncementNotification,
  normalizeAnnouncement,
  normalizeSystemNotification,
} from "@/app/lib/notifications/inbox";
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

  it("trusts the stored category over the type, unless it is the schema's default 'other'", () => {
    expect(inferCategory(record({ category: "resources", type: "assessment_reminder" }), "other")).toBe("resources");
    expect(inferCategory(record({ metadata: { category: "grading" }, type: "custom" }), "other")).toBe("grading");
    expect(inferCategory(record({ category: "other", type: "attendance_alert" }), "other")).toBe("attendance");
  });

  it("falls back to keywords for unknown types, then to the given default", () => {
    expect(inferCategory(record({ type: "custom", title: "Absent students today" }), "other")).toBe("attendance");
    expect(inferCategory(record({ type: "custom", title: "New resource uploaded" }), "other")).toBe("resources");
    expect(inferCategory(record({ type: "custom", title: "Hello", message: "Hi" }), "other")).toBe("other");
  });

  it("files the portals categories: leave and payments (B11)", () => {
    // Stored by the new producers.
    expect(inferCategory(record({ category: "leave", type: "leave_request_update" }), "other")).toBe("leave");
    expect(inferCategory(record({ category: "payments", type: "payment_receipt_issued" }), "other")).toBe("payments");
    // Typed rows stored under the schema's default.
    expect(inferCategory(record({ category: "other", type: "leave_request_update" }), "other")).toBe("leave");
    expect(inferCategory(record({ type: "fee_reminder" }), "other")).toBe("payments");
    expect(inferCategory(record({ type: "manual_payment_recorded" }), "other")).toBe("payments");
    // Older rows keep the category they were stored with.
    expect(inferCategory(record({ category: "attendance", type: "leave_request_update" }), "other")).toBe("attendance");
    expect(inferCategory(record({ category: "account", type: "payment_confirmed" }), "other")).toBe("account");
    // Keywords, last: a leave request is not an attendance alert; "fee" is a whole word only.
    expect(inferCategory(record({ type: "custom", title: "New leave request for Ben" }), "other")).toBe("leave");
    expect(inferCategory(record({ type: "custom", title: "School fees are due" }), "other")).toBe("payments");
    expect(inferCategory(record({ type: "custom", title: "Thanks for the feedback" }), "other")).toBe("other");
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

  it("collects attachments from both fields and keeps the metadata for the action", () => {
    const item = normalizeSystemNotification(
      record({
        attachments: ["https://x/a.pdf"],
        attachment: "https://x/b.pdf",
        metadata: { className: "JSS 1A", href: "/grading", target: { page: "grading", courseId: "k1" }, actionLabel: "Open grading" },
      }),
      USER,
    );
    expect(item.attachments).toEqual(["https://x/a.pdf", "https://x/b.pdf"]);
    expect(item.attachmentFiles.map((file) => [file.name, file.kind])).toEqual([
      ["a.pdf", "pdf"],
      ["b.pdf", "pdf"],
    ]);
    expect(item.metadata?.target).toEqual({ page: "grading", courseId: "k1" });
    expect(item.metadata?.actionLabel).toBe("Open grading");
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

  it("always files an announcement under announcement, as the server counts it", () => {
    expect(normalizeAnnouncement(record({ title: "Attendance policy", message: "Absent students…" }), USER).category).toBe("announcement");
  });

  it("falls back to the school name when the sender is unnamed", () => {
    expect(normalizeAnnouncement(record({ schoolName: "Talim Test School" }), USER).senderName).toBe("Talim Test School");
  });
});

describe("attachment files", () => {
  it("keeps the server's attachmentFiles", () => {
    const files = attachmentFilesOf(
      record({
        attachments: ["https://x/raw/Sports%20day.pdf"],
        attachmentFiles: [{ url: "https://x/raw/Sports%20day.pdf", name: "Sports day.pdf", kind: "pdf", size: 182_000 }],
      }),
    );
    expect(files).toEqual([{ url: "https://x/raw/Sports%20day.pdf", name: "Sports day.pdf", kind: "pdf", size: 182_000 }]);
  });

  it("derives name and kind from older records' attachment URLs", () => {
    const item = normalizeAnnouncement(
      record({ attachments: ["https://x/raw/upload/Consent%20form.docx?v=2", "https://x/image/upload/board.JPG"], attachment: "https://x/a/clip.mp4" }),
      USER,
    );
    expect(item.attachmentFiles).toEqual([
      { url: "https://x/raw/upload/Consent%20form.docx?v=2", name: "Consent form.docx", kind: "doc", size: null },
      { url: "https://x/image/upload/board.JPG", name: "board.JPG", kind: "image", size: null },
      { url: "https://x/a/clip.mp4", name: "clip.mp4", kind: "video", size: null },
    ]);
  });

  it("reads kinds from extensions and survives odd URLs", () => {
    expect(attachmentKindOf("Deck.pptx")).toBe("slides");
    expect(attachmentKindOf("notes.pdf")).toBe("pdf");
    expect(attachmentKindOf("archive.zip")).toBe("other");
    expect(attachmentKindOf("README")).toBe("other");
    expect(fileNameFromUrl("https://x/files/%E0%A4%A.pdf")).toBe("%E0%A4%A.pdf");
    expect(fileNameFromUrl("https://x/")).toBe("Attachment");
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
