/**
 * Pure logic for the redesigned Notifications page (design
 * `Talim Teacher Portal.dc.html`, "Notifications"; contract §30 of
 * `talimBE-V2/docs/redesign-teachers-round4-inbox-settings.md`): the tabs and
 * which categories each one lists, the tab counts from
 * `GET /notifications/counts`, the category and attachment chips, where a
 * notification's action goes, the "Today · 8:00am" stamps, and the optimistic
 * count changes of the read calls. No React, no network.
 *
 * Decision 3 of 2026-09-29: there is no "Messages" tab; `messages`,
 * `account` and `other` notifications show under All and Unread only.
 *
 * The portals backend (B11) adds two categories. `leave` (a parent's leave
 * request for a student in the teacher's class) lists under Attendance, with
 * its own "Leave" chip, and opens the class register on the first day of
 * leave. `payments` is a parent and bursary category: a teacher should not
 * get one, and if they do it shows under All and Unread only, with a
 * "Payments" chip and no action (this app has no payments page).
 */
import type { NotificationCategory, TeacherNotification } from "@/app/lib/notifications/inbox";
import { extractRecords, extractTotal, type NotificationListBody } from "@/app/services/notifications.service";
import { attentionHref } from "@/hooks/today/today.routes";
import type { AttachmentFileKind, NotificationCountsBody, NotificationTarget, NotificationTargetPage } from "@/types/inboxSettings";

// ─── Tabs ───────────────────────────────────────────────────────────────────

/** The tabs of the Notifications page, as `?tab=` spells them. */
export type NotificationTabId = "all" | "unread" | "academics" | "attendance" | "announcements";

/** One tab: its id and label. */
export interface NotificationTab {
  id: NotificationTabId;
  label: string;
}

/** The tabs, in the design's order (without its "Messages" tab). */
export const NOTIFICATION_TABS: readonly NotificationTab[] = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "academics", label: "Academics" },
  { id: "attendance", label: "Attendance" },
  { id: "announcements", label: "Announcements" },
];

const TAB_IDS: ReadonlySet<string> = new Set(NOTIFICATION_TABS.map((tab) => tab.id));

/**
 * Reads `?tab=`.
 *
 * @param raw - The query value.
 * @returns The tab; `all` for anything unknown or missing.
 */
export function parseNotificationTab(raw: string | null | undefined): NotificationTabId {
  const value = (raw ?? "").trim().toLowerCase();
  return TAB_IDS.has(value) ? (value as NotificationTabId) : "all";
}

/**
 * The page's URL for a tab (All has no `?tab=`).
 *
 * @param tab - The tab.
 * @returns `/notifications` or `/notifications?tab=…`.
 */
export function notificationTabHref(tab: NotificationTabId): string {
  return tab === "all" ? "/notifications" : `/notifications?tab=${tab}`;
}

/** The category tab each category lists under; `null` for All and Unread only. */
const TAB_OF_CATEGORY: Record<NotificationCategory, "academics" | "attendance" | "announcements" | null> = {
  academics: "academics",
  grading: "academics",
  resources: "academics",
  attendance: "attendance",
  leave: "attendance",
  announcement: "announcements",
  messages: null,
  account: null,
  payments: null,
  other: null,
};

/**
 * The category tab a category belongs to.
 *
 * @param category - The notification's category.
 * @returns `academics` (academics, grading, resources), `attendance` (attendance, leave), `announcements`, or `null`.
 */
export function tabOfCategory(category: NotificationCategory): "academics" | "attendance" | "announcements" | null {
  return TAB_OF_CATEGORY[category] ?? null;
}

/**
 * Whether a notification lists under a tab.
 *
 * @param item - The notification's category and read state.
 * @param item.category - Its category.
 * @param item.unread - Whether it is unread.
 * @param tab - The tab.
 * @returns True when the tab shows it.
 */
export function matchesTab(item: Pick<TeacherNotification, "category" | "unread">, tab: NotificationTabId): boolean {
  if (tab === "all") return true;
  if (tab === "unread") return item.unread;
  return tabOfCategory(item.category) === tab;
}

/**
 * The notifications a tab lists, in the given order. `keep` holds ids that
 * stay on the Unread tab after being read there, so the one the teacher just
 * opened does not vanish from under them.
 *
 * @param items - The loaded inbox, newest first.
 * @param tab - The tab.
 * @param keep - Ids to list even when the tab would not (read on the Unread tab).
 * @returns The visible notifications.
 */
export function filterByTab(items: readonly TeacherNotification[], tab: NotificationTabId, keep?: ReadonlySet<string>): TeacherNotification[] {
  return items.filter((item) => matchesTab(item, tab) || Boolean(keep?.has(item.id)));
}

// ─── Counts ─────────────────────────────────────────────────────────────────

/**
 * The counts body built from the loaded items, for when
 * `GET /notifications/counts` fails.
 *
 * @param items - The loaded inbox.
 * @returns `{ all, unread, byCategory }` over those items only.
 */
export function countsFromItems(items: readonly TeacherNotification[]): NotificationCountsBody {
  const body: NotificationCountsBody = { all: 0, unread: 0, byCategory: {} };
  for (const item of items) {
    const entry = body.byCategory[item.category] ?? { all: 0, unread: 0 };
    entry.all += 1;
    body.all += 1;
    if (item.unread) {
      entry.unread += 1;
      body.unread += 1;
    }
    body.byCategory[item.category] = entry;
  }
  return body;
}

/**
 * The number on each tab: All and Unread from the totals, Academics the sum of
 * `academics`, `grading` and `resources`, Attendance the sum of `attendance`
 * and `leave`, Announcements its one category.
 *
 * @param counts - `GET /notifications/counts`.
 * @returns The count per tab.
 */
export function tabCounts(counts: NotificationCountsBody): Record<NotificationTabId, number> {
  const all = (category: NotificationCategory) => counts.byCategory[category]?.all ?? 0;
  return {
    all: counts.all,
    unread: counts.unread,
    academics: all("academics") + all("grading") + all("resources"),
    attendance: all("attendance") + all("leave"),
    announcements: all("announcement"),
  };
}

/**
 * The counts after one notification is read: the total and its category's
 * unread each go down by one (never below zero).
 *
 * @param counts - The counts before.
 * @param category - The notification's category.
 * @returns The new counts.
 */
export function countsAfterRead(counts: NotificationCountsBody, category: NotificationCategory): NotificationCountsBody {
  const entry = counts.byCategory[category];
  return {
    ...counts,
    unread: Math.max(0, counts.unread - 1),
    byCategory: entry ? { ...counts.byCategory, [category]: { ...entry, unread: Math.max(0, entry.unread - 1) } } : counts.byCategory,
  };
}

/**
 * The counts undoing {@link countsAfterRead}, when the server refuses the read.
 *
 * @param counts - The counts now.
 * @param category - The notification's category.
 * @returns The counts with that one unread again.
 */
export function countsAfterUnread(counts: NotificationCountsBody, category: NotificationCategory): NotificationCountsBody {
  const entry = counts.byCategory[category];
  return {
    ...counts,
    unread: counts.unread + 1,
    byCategory: entry ? { ...counts.byCategory, [category]: { ...entry, unread: Math.min(entry.all, entry.unread + 1) } } : counts.byCategory,
  };
}

/**
 * The counts after "Mark all as read": nothing unread in any category.
 *
 * @param counts - The counts before.
 * @returns The new counts.
 */
export function countsAfterReadAll(counts: NotificationCountsBody): NotificationCountsBody {
  const byCategory: NotificationCountsBody["byCategory"] = {};
  for (const [category, entry] of Object.entries(counts.byCategory)) {
    if (entry) byCategory[category] = { ...entry, unread: 0 };
  }
  return { ...counts, unread: 0, byCategory };
}

// ─── Paging ─────────────────────────────────────────────────────────────────

/**
 * Whether a feed has another page after this one: `meta.total` when the
 * server sent it, else a full page suggests more.
 *
 * @param body - One page of a list endpoint.
 * @param page - Its 1-based page number.
 * @param limit - The page size asked for.
 * @returns True when the next page may hold records.
 */
export function feedHasMore(body: NotificationListBody | null | undefined, page: number, limit: number): boolean {
  if (body && !Array.isArray(body) && typeof body.meta?.total === "number") return page * limit < extractTotal(body);
  return extractRecords(body).length >= limit;
}

/**
 * The loaded pages as one list: newest first, each id once (a notification
 * pushed down a page by a newer one can be on two pages; the copy from the
 * later page, the fresher read, wins).
 *
 * @param pages - The loaded pages, in order.
 * @returns The merged inbox.
 */
export function mergeInboxPages(pages: readonly { items: readonly TeacherNotification[] }[]): TeacherNotification[] {
  const byId = new Map<string, TeacherNotification>();
  for (const page of pages) for (const item of page.items) byId.set(item.id, item);
  return [...byId.values()].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

// ─── Chips ──────────────────────────────────────────────────────────────────

/** A chip's colour, as `pillTone` in `src/components/tl/styles.ts` names them. */
export type ChipTone = "info" | "warning" | "accent" | "success" | "muted" | "danger";

/** A chip's text and colour. */
export interface Chip {
  label: string;
  tone: ChipTone;
}

const CATEGORY_CHIPS: Record<NotificationCategory, Chip> = {
  academics: { label: "Academics", tone: "info" },
  grading: { label: "Academics", tone: "info" },
  resources: { label: "Academics", tone: "info" },
  attendance: { label: "Attendance", tone: "warning" },
  leave: { label: "Leave", tone: "warning" },
  announcement: { label: "Announcement", tone: "accent" },
  messages: { label: "Messages", tone: "muted" },
  account: { label: "Account", tone: "muted" },
  payments: { label: "Payments", tone: "muted" },
  other: { label: "Other", tone: "muted" },
};

/**
 * The category chip on a row and in the detail pane.
 *
 * @param category - The notification's category.
 * @returns Label and tone.
 */
export function categoryChip(category: NotificationCategory): Chip {
  return CATEGORY_CHIPS[category] ?? CATEGORY_CHIPS.other;
}

const ATTACHMENT_BADGES: Record<AttachmentFileKind, Chip> = {
  pdf: { label: "PDF", tone: "danger" },
  image: { label: "Image", tone: "accent" },
  doc: { label: "DOC", tone: "info" },
  slides: { label: "Slides", tone: "warning" },
  video: { label: "Video", tone: "success" },
  other: { label: "File", tone: "muted" },
};

/**
 * The badge in front of an attachment: what kind of file it really is.
 *
 * @param kind - The attachment's kind.
 * @returns Label and tone.
 */
export function attachmentBadge(kind: AttachmentFileKind): Chip {
  return ATTACHMENT_BADGES[kind] ?? ATTACHMENT_BADGES.other;
}

// ─── Actions ────────────────────────────────────────────────────────────────

/** A notification's action button. */
export interface NotificationAction {
  href: string;
  label: string;
}

const DEFAULT_ACTION_LABELS: Record<NotificationTargetPage, string> = {
  attendance: "Take register",
  grading: "Open grading",
  messages: "Open message",
  resources: "Open resources",
  subjects: "Open subjects",
  leave: "Open register",
  announcements: "Open announcements",
  timetable: "Open timetable",
  settings: "Open settings",
};

/** The target pages this app has a route for; any other page (`payments`, a parent's `results`) gets no action. */
const ROUTED_PAGES: ReadonlySet<string> = new Set(Object.keys(DEFAULT_ACTION_LABELS));

/**
 * The action's label when the producer sent no `actionLabel`.
 *
 * @param page - The target page.
 * @returns e.g. "Take register", "Open grading".
 */
export function defaultActionLabel(page: NotificationTargetPage | string): string {
  return DEFAULT_ACTION_LABELS[page as NotificationTargetPage] ?? "Open";
}

/**
 * Whether a string is a path inside this app (not another site, not a
 * protocol-relative URL).
 *
 * @param value - A legacy `metadata.href` or `metadata.url`.
 * @returns True for "/grading", false for "https://…" and "//…".
 */
function isInternalPath(value: unknown): value is string {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//");
}

/**
 * Whether a value has the shape of §30's `metadata.target`.
 *
 * @param value - Anything.
 * @returns True when it names a page.
 */
function isTarget(value: unknown): value is NotificationTarget {
  return typeof value === "object" && value !== null && typeof (value as { page?: unknown }).page === "string";
}

/**
 * Where a notification's action goes and what it says: `metadata.target`
 * through the shared route mapper (`attentionHref`), labelled
 * `metadata.actionLabel` or the page's default; else a legacy internal
 * `metadata.href` / `metadata.url` as "Open"; else no action. A target on a
 * page this app does not have (`payments`, which the payments producers set)
 * is ignored rather than sent to the dashboard.
 *
 * @param item - The notification (its metadata).
 * @param item.metadata - The notification's metadata.
 * @returns The action, or null.
 */
export function notificationAction(item: Pick<TeacherNotification, "metadata">): NotificationAction | null {
  const metadata = item.metadata;
  if (!metadata) return null;
  if (isTarget(metadata.target) && ROUTED_PAGES.has(metadata.target.page)) {
    const label = typeof metadata.actionLabel === "string" && metadata.actionLabel.trim() ? metadata.actionLabel.trim() : defaultActionLabel(metadata.target.page);
    return { href: attentionHref(metadata.target), label };
  }
  const legacy = isInternalPath(metadata.href) ? metadata.href : isInternalPath(metadata.url) ? metadata.url : null;
  // "/notifications" is the web-push default: a link to this page would go nowhere.
  if (legacy && legacy !== "/notifications") return { href: legacy, label: "Open" };
  return null;
}

// ─── Time ───────────────────────────────────────────────────────────────────

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * Whether two instants fall on the same day on the viewer's calendar.
 *
 * @param a - One instant.
 * @param b - The other.
 * @returns True on the same local day.
 */
function sameLocalDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/**
 * The day of a notification in the viewer's timezone: "Today", "Yesterday",
 * "18 Sep", or "18 Sep 2025" in another year.
 *
 * @param iso - When it was sent.
 * @param now - The current time (a parameter so tests can pin it).
 * @returns The day, or an empty string when unreadable.
 */
export function notificationDay(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  if (sameLocalDay(date, now)) return "Today";
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameLocalDay(date, yesterday)) return "Yesterday";
  const day = `${date.getDate()} ${MONTHS[date.getMonth()]}`;
  return date.getFullYear() === now.getFullYear() ? day : `${day} ${date.getFullYear()}`;
}

/**
 * The clock time of a notification in the viewer's timezone: "8:00am".
 *
 * @param iso - When it was sent.
 * @returns The time, or an empty string when unreadable.
 */
export function notificationClock(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const h24 = date.getHours();
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(date.getMinutes()).padStart(2, "0")}${h24 < 12 ? "am" : "pm"}`;
}

/**
 * A row's stamp: "Today · 8:00am".
 *
 * @param iso - When it was sent.
 * @param now - The current time.
 * @returns The stamp.
 */
export function rowStamp(iso: string, now: Date = new Date()): string {
  return [notificationDay(iso, now), notificationClock(iso)].filter(Boolean).join(" · ");
}

/**
 * The detail pane's meta line: "Academic office · Today, 8:00am".
 *
 * @param from - Who sent it.
 * @param iso - When it was sent.
 * @param now - The current time.
 * @returns The line.
 */
export function detailMeta(from: string, iso: string, now: Date = new Date()): string {
  const when = [notificationDay(iso, now), notificationClock(iso)].filter(Boolean).join(", ");
  return [from, when].filter(Boolean).join(" · ");
}
