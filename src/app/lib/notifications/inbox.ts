/**
 * Pure logic for the teacher's notification inbox: turning the two server
 * lists (announcements and system notifications) into one list of
 * {@link TeacherNotification}, and filtering, sorting and counting it.
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

/** Where a notification came from. */
export type NotificationSource = "school" | "talim" | "system";

/** The categories the inbox groups by; mirrors the backend `NotificationCategory` enum. */
export type NotificationCategory =
  | "announcement"
  | "attendance"
  | "academics"
  | "grading"
  | "resources"
  | "messages"
  | "account"
  | "other";

/** A link shown under "Related" on a notification. */
export interface NotificationLink {
  label: string;
  href?: string;
}

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
  related: NotificationLink[];
  priority?: "low" | "medium" | "high";
  metadata?: NotificationMetadata;
  /** Which read endpoint applies. */
  endpoint: "announcement" | "notification";
}

/** Counts shown on the tabs and the sidebar badge. */
export type NotificationCounts = Record<NotificationCategory | "all" | "unread", number>;

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
  system_alert: "other",
  system_notice: "other",
  app_update: "other",
  fee_reminder: "other",
  fee_overdue: "other",
  payment_confirmed: "other",
  receipt_generated: "other",
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

/**
 * Decides a record's category. The notification's `type` wins when it is one
 * the backend defines; keyword matching is only a fallback ("late" would
 * otherwise match "translate").
 *
 * @param item - The server record.
 * @param fallback - Used when nothing matches.
 * @returns The category.
 */
export function inferCategory(item: NotificationRecord, fallback: NotificationCategory): NotificationCategory {
  const typed =
    CATEGORY_BY_TYPE[String(item.type || "").toLowerCase()] ??
    CATEGORY_BY_TYPE[String(item.category || item.metadata?.category || "").toLowerCase()];
  if (typed) return typed;

  const explicit = String(item.category || item.type || item.metadata?.category || item.metadata?.module || "").toLowerCase();
  const text = `${explicit} ${textBlob(item)}`;

  if (/attendance|absence|absent|late/.test(text)) return "attendance";
  if (/grade|grading|result|report/.test(text)) return "grading";
  if (/assessment|assignment|curriculum|academic/.test(text)) return "academics";
  if (/resource|material|pdf|e-library/.test(text)) return "resources";
  if (/chat|message/.test(text)) return "messages";
  if (/account|password|login|security/.test(text)) return "account";
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

/**
 * The "Related" links a record's metadata describes.
 *
 * @param item - The server record.
 * @returns Class, course, student, resource and link entries, in that order.
 */
function relatedOf(item: NotificationRecord): NotificationLink[] {
  const metadata = item.metadata ?? {};
  const related: NotificationLink[] = [];
  if (metadata.className) related.push({ label: metadata.className });
  if (metadata.courseName) related.push({ label: metadata.courseName });
  if (metadata.studentName) related.push({ label: metadata.studentName });
  if (metadata.resourceTitle) related.push({ label: metadata.resourceTitle, href: metadata.resourceUrl });
  const href = metadata.href || metadata.url;
  if (href) related.push({ label: "Open related item", href: String(href) });
  return related;
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
    category: inferCategory(item, "announcement"),
    title: item.title || "School announcement",
    message: item.message || item.content || "No message provided.",
    createdAt: item.publishedAt || item.createdAt || item.scheduledFor || new Date().toISOString(),
    unread: !isReadBy(item, userId),
    senderName: senderNameOf(item, sender, schoolName),
    senderEmail: senderEmailOf(item, sender),
    attachments: attachmentsOf(item),
    related: relatedOf(item),
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
    related: relatedOf(item),
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

/** Filter tabs: everything, unread only, or one category. */
export type TabKey = "all" | "unread" | NotificationCategory;

/** Sort orders the inbox offers. */
export type SortKey = "newest" | "oldest" | "unread";

/**
 * Tallies the inbox for the tabs and the sidebar badge.
 *
 * @param notifications - The inbox.
 * @returns Total, unread and per-category counts.
 */
export function countNotifications(notifications: TeacherNotification[]): NotificationCounts {
  const counts: NotificationCounts = {
    all: 0,
    unread: 0,
    announcement: 0,
    attendance: 0,
    academics: 0,
    grading: 0,
    resources: 0,
    messages: 0,
    account: 0,
    other: 0,
  };
  for (const notification of notifications) {
    counts.all += 1;
    if (notification.unread) counts.unread += 1;
    counts[notification.category] += 1;
  }
  return counts;
}

/**
 * Applies a tab, a search query and a sort order to the inbox.
 *
 * @param notifications - The inbox.
 * @param options - The active tab, the search text and the sort order.
 * @param options.tab - Which tab is active.
 * @param options.query - Free-text search over title, message, sender, source and category label.
 * @param options.sort - The sort order.
 * @param categoryLabel - Maps a category to the label users see, so search matches what is on screen.
 * @returns The visible notifications.
 */
export function filterNotifications(
  notifications: TeacherNotification[],
  options: { tab: TabKey; query: string; sort: SortKey },
  categoryLabel: (category: NotificationCategory) => string,
): TeacherNotification[] {
  const query = options.query.trim().toLowerCase();

  const filtered = notifications.filter((notification) => {
    const matchesTab =
      options.tab === "all" ? true : options.tab === "unread" ? notification.unread : notification.category === options.tab;
    if (!matchesTab) return false;
    if (!query) return true;
    return [notification.title, notification.message, notification.senderName, notification.sourceLabel, categoryLabel(notification.category)]
      .join(" ")
      .toLowerCase()
      .includes(query);
  });

  return filtered.sort((a, b) => {
    if (options.sort === "unread" && a.unread !== b.unread) return a.unread ? -1 : 1;
    const aTime = new Date(a.createdAt).getTime();
    const bTime = new Date(b.createdAt).getTime();
    return options.sort === "oldest" ? aTime - bTime : bTime - aTime;
  });
}
