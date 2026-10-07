/**
 * Pure logic for the teacher's notification inbox: turning the two server
 * lists (announcements and system notifications) into one list of
 * {@link TeacherNotification}, newest first.
 *
 * Categories follow the server's counts (§30 of
 * `talimBE-V2/docs/redesign-teachers-round4-inbox-settings.md`): an
 * announcement is always `announcement`, and a notification's stored
 * `category` wins over its `type`, so the Notifications tabs list what their
 * counts say.
 *
 * Nothing here touches React or the network, so it is unit-tested directly
 * (`src/__tests__/notifications.inbox.test.ts`).
 */
import type {
  NotificationMetadata,
  NotificationPerson,
  NotificationRecord,
  PersonRef,
} from "@/app/services/notifications.service";
import type { components } from "@/types/api";
import type { AttachmentFile, AttachmentFileKind } from "@/types/inboxSettings";

/** One item of `GET /notifications` as the generated contract types it. */
type NotificationItem = components["schemas"]["NotificationItemDto"];

/** Where a notification came from. */
export type NotificationSource = NotificationItem["source"];

/**
 * The categories the inbox groups by: the backend `NotificationCategory`
 * enum, from the generated contract. `payments` and `leave` arrived with the
 * portals backend (B11); older rows keep their old categories (leave under
 * `attendance`, payments under `account`). `support` (a staff reply or a
 * status change on one of the teacher's tickets) is v1.5's (§1
 * Notifications), NOT IN CONTRACT yet in the generated enum.
 */
export type NotificationCategory = NotificationItem["category"] | "support";

/** One inbox item, normalised from either server list. */
export interface TeacherNotification {
  /** Unique across both lists: `announcement:<id>` or `notification:<id>`. */
  id: string;
  /** The server id, for the read call. */
  rawId: string;
  source: NotificationSource;
  sourceLabel: string;
  category: NotificationCategory;
  title: string;
  message: string;
  createdAt: string;
  unread: boolean;
  senderName: string;
  senderEmail?: string;
  attachments: string[];
  /** The attachments with a name, a kind and (when known) a size (§30), derived from `attachments` for older records. */
  attachmentFiles: AttachmentFile[];
  priority?: "low" | "medium" | "high";
  metadata?: NotificationMetadata;
  /** Which read endpoint applies. */
  endpoint: "announcement" | "notification";
}

/**
 * The user id of a person reference.
 *
 * @param person - A populated person, a bare id, or nothing.
 * @returns The id, or an empty string.
 */
export function personId(person: PersonRef | undefined): string {
  if (!person) return "";
  if (typeof person === "string") return person;
  return person.userId || person._id || person.id || "";
}

/**
 * A display name for a person reference.
 *
 * @param person - A populated person, a bare id, or nothing.
 * @param fallback - Used when no name can be built.
 * @returns The person's name, email, or the fallback.
 */
export function personName(person: PersonRef | undefined, fallback = "System Notification"): string {
  if (!person || typeof person === "string") return fallback;
  if (person.name) return person.name;
  const name = [person.firstName, person.lastName].filter(Boolean).join(" ");
  return name || person.email || fallback;
}

/**
 * Whether a sender name is a placeholder the server used for "nobody".
 *
 * @param value - The name to check.
 * @returns True for empty, "unknown" and "unknown sender".
 */
function isMissingSenderName(value?: string): boolean {
  const normalized = String(value || "").trim().toLowerCase();
  return !normalized || normalized === "unknown sender" || normalized === "unknown";
}

/**
 * The sender's name, preferring what the server computed over the populated user.
 *
 * @param item - The server record.
 * @param sender - The populated sender, if any.
 * @param fallback - Used when nothing names the sender.
 * @returns A display name.
 */
function senderNameOf(item: NotificationRecord, sender: PersonRef | undefined, fallback: string): string {
  if (!isMissingSenderName(item.senderName)) return item.senderName as string;
  if (!isMissingSenderName(item.senderDisplay?.name)) return item.senderDisplay?.name as string;
  return personName(sender, fallback);
}

/**
 * The sender's email, if the server gave one.
 *
 * @param item - The server record.
 * @param sender - The populated sender, if any.
 * @returns The email or `undefined`.
 */
function senderEmailOf(item: NotificationRecord, sender: PersonRef | undefined): string | undefined {
  return item.senderEmail || item.senderDisplay?.email || (typeof sender === "object" && sender ? sender.email : undefined);
}

/**
 * Whether a user appears in a record's `readBy` list.
 *
 * @param readBy - The list of readers.
 * @param userId - The user to look for.
 * @returns True when they have read it.
 */
function hasReadByUser(readBy: PersonRef[] | undefined, userId: string): boolean {
  if (!Array.isArray(readBy)) return false;
  return readBy.some((reader) => personId(reader) === userId);
}

// Backend NotificationType values (talimBE-V2 notification.interfaces.ts).
const CATEGORY_BY_TYPE: Record<string, NotificationCategory> = {
  chat_message: "messages",
  chat_message_reminder: "messages",
  announcement: "announcement",
  attendance_alert: "attendance",
  result_published: "grading",
  grade_released: "grading",
  assessment_reminder: "academics",
  assignment_due: "academics",
  timetable_update: "academics",
  class_assigned: "academics",
  class_unassigned: "academics",
  course_assigned: "academics",
  course_unassigned: "academics",
  assignment_or_resource: "resources",
  security_alert: "account",
  login_alert: "account",
  leave_request_update: "leave",
  system_alert: "other",
  system_notice: "other",
  app_update: "other",
  fee_reminder: "payments",
  fee_overdue: "payments",
  payment_confirmed: "payments",
  receipt_generated: "payments",
  payment_receipt_issued: "payments",
  payment_refunded: "payments",
  payment_refund_issued: "payments",
  school_payment_received: "payments",
  manual_payment_recorded: "payments",
};

/**
 * The text of a record that keyword matching looks at.
 *
 * @param item - The server record.
 * @returns Type, title, message and metadata hints, lower-cased.
 */
function textBlob(item: NotificationRecord): string {
  return [item.type, item.title, item.message, item.content, item.metadata?.category, item.metadata?.module]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

/** The categories the backend stores (`NotificationCategory`). */
const KNOWN_CATEGORIES: ReadonlySet<string> = new Set<NotificationCategory>([
  "announcement",
  "attendance",
  "academics",
  "grading",
  "resources",
  "messages",
  "account",
  "payments",
  "leave",
  "support",
  "other",
]);

/**
 * Whether a value is one of the backend's notification categories.
 *
 * @param value - Anything.
 * @returns True for `announcement`, `attendance`, …, `payments`, `leave`, `support`, `other`.
 */
export function isNotificationCategory(value: unknown): value is NotificationCategory {
  return typeof value === "string" && KNOWN_CATEGORIES.has(value);
}

/**
 * Decides a record's category. The stored `category` wins when it is a real
 * one (the server's counts group by it); `other` is the schema's default, so
 * then the notification's `type` decides when it is one the backend defines,
 * and keyword matching is only the last resort ("late" would otherwise match
 * "translate").
 *
 * @param item - The server record.
 * @param fallback - Used when nothing matches.
 * @returns The category.
 */
export function inferCategory(item: NotificationRecord, fallback: NotificationCategory): NotificationCategory {
  const stored = String(item.category || item.metadata?.category || "").toLowerCase();
  if (isNotificationCategory(stored) && stored !== "other") return stored;

  const typed =
    CATEGORY_BY_TYPE[String(item.type || "").toLowerCase()] ??
    CATEGORY_BY_TYPE[String(item.category || item.metadata?.category || "").toLowerCase()];
  if (typed) return typed;

  const explicit = String(item.category || item.type || item.metadata?.category || item.metadata?.module || "").toLowerCase();
  const text = `${explicit} ${textBlob(item)}`;

  if (/leave request|leave_request/.test(text)) return "leave";
  if (/attendance|absence|absent|late/.test(text)) return "attendance";
  if (/grade|grading|result|report/.test(text)) return "grading";
  if (/assessment|assignment|curriculum|academic/.test(text)) return "academics";
  if (/resource|material|pdf|e-library/.test(text)) return "resources";
  if (/chat|message/.test(text)) return "messages";
  if (/account|password|login|security/.test(text)) return "account";
  if (/\bpayments?\b|\bfees?\b|\breceipts?\b/.test(text)) return "payments";
  if (text.includes("announcement")) return "announcement";
  return fallback;
}

/**
 * Every attachment URL on a record, from either field the server uses.
 *
 * @param item - The server record.
 * @returns The non-empty attachment URLs.
 */
function attachmentsOf(item: NotificationRecord): string[] {
  const attachments = [...(Array.isArray(item.attachments) ? item.attachments : []), ...(item.attachment ? [item.attachment] : [])];
  return attachments.filter(Boolean);
}

const KIND_BY_EXTENSION: Record<string, AttachmentFileKind> = {
  pdf: "pdf",
  ppt: "slides",
  pptx: "slides",
  odp: "slides",
  key: "slides",
  mp4: "video",
  mov: "video",
  webm: "video",
  mkv: "video",
  avi: "video",
  m4v: "video",
  doc: "doc",
  docx: "doc",
  odt: "doc",
  rtf: "doc",
  txt: "doc",
  png: "image",
  jpg: "image",
  jpeg: "image",
  gif: "image",
  webp: "image",
  heic: "image",
  svg: "image",
};

const ATTACHMENT_KINDS: ReadonlySet<string> = new Set<AttachmentFileKind>(["pdf", "image", "doc", "slides", "video", "other"]);

/**
 * What a file is, from its name's extension (the server's rule for §30's
 * `attachmentFiles`, for records that predate it).
 *
 * @param name - A file name or URL.
 * @returns The kind; `other` when the extension says nothing.
 */
export function attachmentKindOf(name: string): AttachmentFileKind {
  const ext = /\.([a-z0-9]+)(?:[?#].*)?$/i.exec(name)?.[1]?.toLowerCase() ?? "";
  return KIND_BY_EXTENSION[ext] ?? "other";
}

/**
 * A file's name from its URL: the last path segment, decoded, without the
 * query or hash.
 *
 * @param url - The attachment URL.
 * @returns The name; "Attachment" when the URL has no path.
 */
export function fileNameFromUrl(url: string): string {
  let path = url;
  try {
    path = new URL(url, "https://talim.invalid").pathname;
  } catch {
    /* not a URL: use it as it is */
  }
  const last = path.split("/").filter(Boolean).pop() ?? "";
  try {
    return decodeURIComponent(last) || "Attachment";
  } catch {
    return last || "Attachment";
  }
}

/**
 * A record's attachments as §30's `attachmentFiles`: the server's list when
 * it sent one, else derived from the plain `attachments` URLs (name from the
 * URL, kind from the extension, size unknown).
 *
 * @param item - The server record.
 * @returns The files, in the server's order.
 */
export function attachmentFilesOf(item: NotificationRecord): AttachmentFile[] {
  if (Array.isArray(item.attachmentFiles) && item.attachmentFiles.length > 0) {
    return item.attachmentFiles
      .filter((file) => Boolean(file?.url))
      .map((file) => {
        const name = file.name || fileNameFromUrl(file.url);
        return {
          url: file.url,
          name,
          kind: ATTACHMENT_KINDS.has(file.kind) ? file.kind : attachmentKindOf(name),
          size: typeof file.size === "number" && Number.isFinite(file.size) && file.size >= 0 ? file.size : null,
        };
      });
  }
  return attachmentsOf(item).map((url) => {
    const name = fileNameFromUrl(url);
    return { url, name, kind: attachmentKindOf(name), size: null };
  });
}

/**
 * Whether the user has read a record, by whichever flag the server set.
 *
 * @param item - The server record.
 * @param userId - The signed-in user.
 * @returns True when read.
 */
function isReadBy(item: NotificationRecord, userId: string): boolean {
  if (typeof item.isRead === "boolean") return item.isRead;
  if (typeof item.read === "boolean") return item.read;
  return hasReadByUser(item.readBy, userId);
}

/**
 * Normalises a school announcement.
 *
 * @param item - The announcement as `GET /notifications/announcements/receiver/:userId` returns it.
 * @param userId - The signed-in user.
 * @returns The inbox item.
 */
export function normalizeAnnouncement(item: NotificationRecord, userId: string): TeacherNotification {
  const sender = item.senderId || item.createdBy;
  const schoolName =
    item.schoolName ||
    item.school?.name ||
    (typeof item.schoolId === "object" && item.schoolId ? (item.schoolId as NotificationPerson).name : undefined) ||
    item.metadata?.schoolName ||
    "School Admin";

  return {
    id: `announcement:${item._id}`,
    rawId: item._id,
    source: "school",
    sourceLabel: item.sourceLabel || "School Announcement",
    // The server counts every announcement under `announcement` (§30).
    category: "announcement",
    title: item.title || "School announcement",
    message: item.message || item.content || "No message provided.",
    createdAt: item.publishedAt || item.createdAt || item.scheduledFor || new Date().toISOString(),
    unread: !isReadBy(item, userId),
    senderName: senderNameOf(item, sender, schoolName),
    senderEmail: senderEmailOf(item, sender),
    attachments: attachmentsOf(item),
    attachmentFiles: attachmentFilesOf(item),
    priority: item.priority,
    metadata: item.metadata,
    endpoint: "announcement",
  };
}

/**
 * Normalises a system notification.
 *
 * @param item - The notification as `GET /notifications` returns it.
 * @param userId - The signed-in user.
 * @returns The inbox item.
 */
export function normalizeSystemNotification(item: NotificationRecord, userId: string): TeacherNotification {
  const sender = item.senderId || item.sender || item.createdBy;
  const rawSource = item.source || item.metadata?.source;
  const source: NotificationSource = rawSource === "school" ? "school" : rawSource === "talim" ? "talim" : "system";
  const senderFallback = source === "talim" ? "Talim Admin" : source === "school" ? "School Admin" : "System Notification";
  const sourceLabel = source === "talim" ? "Talim Alert" : source === "school" ? "School Notification" : "System Notification";

  return {
    id: `notification:${item._id}`,
    rawId: item._id,
    source,
    sourceLabel: item.sourceLabel || sourceLabel,
    category: inferCategory(item, "other"),
    title: item.title || "Notification",
    message: item.message || item.body || item.content || "No message provided.",
    createdAt: item.createdAt || new Date().toISOString(),
    unread: !isReadBy(item, userId),
    senderName: senderNameOf(item, sender, senderFallback),
    senderEmail: senderEmailOf(item, sender),
    attachments: attachmentsOf(item),
    attachmentFiles: attachmentFilesOf(item),
    priority: item.priority,
    metadata: item.metadata,
    endpoint: "notification",
  };
}

/**
 * A system notification that is really a school announcement: those arrive
 * through the announcements list, so the notifications list skips them.
 *
 * @param item - A record from `GET /notifications`.
 * @returns True when it duplicates an announcement.
 */
export function isSchoolAnnouncementNotification(item: NotificationRecord): boolean {
  const source = item.source || item.metadata?.source;
  const category = item.category || item.metadata?.category;
  const type = String(item.type || "").toLowerCase();
  return source === "school" && (category === "announcement" || type.includes("announcement") || Boolean(item.metadata?.announcementId));
}

/**
 * Newest first.
 *
 * @param items - Inbox items.
 * @returns A sorted copy.
 */
export function sortByNewest(items: TeacherNotification[]): TeacherNotification[] {
  return [...items].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * Merges the two server lists into one inbox, newest first.
 *
 * @param announcements - Records from the announcements list, or `null` when that request failed.
 * @param notifications - Records from the notifications list, or `null` when that request failed.
 * @param userId - The signed-in user.
 * @returns The combined, sorted inbox.
 */
export function buildInbox(
  announcements: NotificationRecord[] | null,
  notifications: NotificationRecord[] | null,
  userId: string,
): TeacherNotification[] {
  const merged: TeacherNotification[] = [];
  for (const item of announcements ?? []) merged.push(normalizeAnnouncement(item, userId));
  for (const item of notifications ?? []) {
    if (!isSchoolAnnouncementNotification(item)) merged.push(normalizeSystemNotification(item, userId));
  }
  return sortByNewest(merged);
}
