/**
 * Notification and announcement calls for the signed-in teacher. Every
 * function goes through the one typed client and throws `ApiError`.
 *
 * A teacher's inbox is two server lists: school announcements
 * (`GET /notifications/announcements/receiver/:userId`) and system
 * notifications (`GET /notifications`). Reading either one is scoped to the
 * caller by the server; marking one read always applies to the authenticated
 * user, so no body is sent.
 *
 * Round 4 (§30 of `talimBE-V2/docs/redesign-teachers-round4-inbox-settings.md`)
 * adds `GET /notifications/counts`, `PATCH /notifications/read-all` (both
 * feeds), the `unread` filter, `metadata.target` / `metadata.actionLabel` and
 * `attachmentFiles`. With `NEXT_PUBLIC_USE_FIXTURES=true` in a dev build the
 * calls answer from `src/lib/fixtures/inbox.fixture.ts`.
 *
 * Contract: `talimBE-V2/src/modules/notification/controllers/notifications.controller.ts`
 * and `annoucements.controller.ts`.
 */
import { api } from "@/lib/apiClient";
import { ApiError } from "@/lib/apiError";
import { fixturesEnabled } from "@/lib/fixtures/flag";
import type { AttachmentFile, NotificationCountsBody, NotificationTarget, ReadAllResult } from "@/types/inboxSettings";

/** A person as the server populates them on a notification or announcement. */
export interface NotificationPerson {
  _id?: string;
  id?: string;
  userId?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

/**
 * The free-form `metadata` object a notification carries. The keys listed are
 * the ones the Teachers portal reads; producers may add others.
 */
export interface NotificationMetadata {
  category?: string;
  module?: string;
  source?: string;
  senderName?: string;
  schoolName?: string;
  announcementId?: string;
  className?: string;
  courseName?: string;
  studentName?: string;
  resourceTitle?: string;
  resourceUrl?: string;
  href?: string;
  url?: string;
  /** Where the notification's action goes (§30); older rows have none. */
  target?: NotificationTarget;
  /** The action button's label, e.g. "Take register". */
  actionLabel?: string;
  [key: string]: unknown;
}

/** Either a bare user id or a populated person. */
export type PersonRef = NotificationPerson | string | null;

/**
 * One inbox item as the server sends it. Notifications and announcements
 * share this shape; the fields only one of them has are optional.
 */
export interface NotificationRecord {
  _id: string;
  title?: string;
  /** Notifications carry `message`; announcements also expose it, mapped from `content`. */
  message?: string;
  body?: string;
  content?: string;
  type?: string;
  source?: string;
  sourceLabel?: string;
  category?: string;
  priority?: "low" | "medium" | "high";
  senderId?: PersonRef;
  sender?: PersonRef;
  createdBy?: PersonRef;
  senderName?: string;
  senderEmail?: string;
  senderDisplay?: { name?: string; email?: string };
  metadata?: NotificationMetadata;
  attachments?: string[];
  attachment?: string;
  /** §30: `attachments` with a name, a kind and (when known) a size. */
  attachmentFiles?: AttachmentFile[];
  readBy?: PersonRef[];
  isRead?: boolean;
  read?: boolean;
  createdAt?: string;
  publishedAt?: string | null;
  scheduledFor?: string | null;
  schoolName?: string;
  school?: { name?: string };
  schoolId?: PersonRef;
}

/** A page of a list endpoint. The client unwraps the envelope, so a bare array is possible too. */
export type NotificationListBody =
  | NotificationRecord[]
  | {
      data?: NotificationRecord[];
      announcements?: NotificationRecord[];
      meta?: { total?: number; page?: number; lastPage?: number; limit?: number };
    };

/** Paging accepted by both list endpoints (`PaginationDto`). */
export interface NotificationPaging {
  page?: number;
  limit?: number;
  /** `GET /notifications` only: unread ones only (§30). */
  unread?: boolean;
}

/** How many of each list one inbox load reads. */
export const INBOX_PAGE_SIZE = 50;

/**
 * Pulls the records out of whichever list shape the server returned.
 *
 * @param body - A list endpoint's response body.
 * @returns The records, or an empty list for anything unrecognised.
 */
export function extractRecords(body: NotificationListBody | null | undefined): NotificationRecord[] {
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.data)) return body.data;
  if (Array.isArray(body?.announcements)) return body.announcements;
  return [];
}

/**
 * The total the server reports for a list, falling back to the page length.
 *
 * @param body - A list endpoint's response body.
 * @returns How many records exist server-side.
 */
export function extractTotal(body: NotificationListBody | null | undefined): number {
  if (body && !Array.isArray(body) && typeof body.meta?.total === "number") return body.meta.total;
  return extractRecords(body).length;
}

/**
 * The announcements addressed to a user.
 *
 * @param userId - The signed-in user's id (the server refuses anyone else's).
 * @param paging - Page and page size.
 * @returns One page of announcements.
 * @throws ApiError when the request fails.
 */
export const listAnnouncements = async (userId: string, paging: NotificationPaging = {}): Promise<NotificationListBody> => {
  if (fixturesEnabled()) {
    const { listAnnouncementsFixture } = await import("@/lib/fixtures/inbox.fixture");
    return listAnnouncementsFixture(paging.page ?? 1, paging.limit ?? INBOX_PAGE_SIZE);
  }
  return api.get<NotificationListBody>(`/notifications/announcements/receiver/${encodeURIComponent(userId)}`, {
    params: { page: paging.page ?? 1, limit: paging.limit ?? INBOX_PAGE_SIZE },
  });
};

/**
 * The system notifications addressed to a user.
 *
 * @param userId - The signed-in user's id; non-staff callers only ever get their own.
 * @param paging - Page and page size.
 * @returns One page of notifications.
 * @throws ApiError when the request fails.
 */
export const listNotifications = async (userId: string, paging: NotificationPaging = {}): Promise<NotificationListBody> => {
  if (fixturesEnabled()) {
    const { listNotificationsFixture } = await import("@/lib/fixtures/inbox.fixture");
    return listNotificationsFixture(paging.page ?? 1, paging.limit ?? INBOX_PAGE_SIZE, paging.unread);
  }
  return api.get<NotificationListBody>("/notifications", {
    params: {
      recipientId: userId,
      page: paging.page ?? 1,
      limit: paging.limit ?? INBOX_PAGE_SIZE,
      ...(paging.unread ? { unread: "true" } : {}),
    },
  });
};

/**
 * `GET /notifications/counts`: totals over both feeds, for the tab badges and
 * the bell. Announcements count under `announcement`.
 *
 * @returns `{ all, unread, byCategory }`.
 * @throws ApiError when the request fails.
 */
export const getNotificationCounts = async (): Promise<NotificationCountsBody> => {
  if (fixturesEnabled()) {
    const { makeNotificationCountsFixture } = await import("@/lib/fixtures/inbox.fixture");
    return makeNotificationCountsFixture();
  }
  const body = await api.get<Partial<NotificationCountsBody>>("/notifications/counts");
  return { all: Number(body?.all) || 0, unread: Number(body?.unread) || 0, byCategory: body?.byCategory ?? {} };
};

/**
 * `PATCH /notifications/read-all`: marks every notification and announcement
 * of the signed-in user read, in one call.
 *
 * @returns `{ updated }`.
 * @throws ApiError when the request fails.
 */
export const markAllNotificationsRead = async (): Promise<ReadAllResult> => {
  if (fixturesEnabled()) {
    const { markAllReadFixture } = await import("@/lib/fixtures/inbox.fixture");
    return markAllReadFixture();
  }
  const body = await api.patch<Partial<ReadAllResult> | null>("/notifications/read-all");
  return { updated: Number(body?.updated) || 0 };
};

/**
 * One notification by id.
 *
 * @param id - The notification id.
 * @returns The notification.
 * @throws ApiError with `NOT_FOUND` when it does not exist or is not the caller's.
 */
export const getNotification = async (id: string): Promise<NotificationRecord> => {
  if (fixturesEnabled()) {
    const { getNotificationFixture } = await import("@/lib/fixtures/inbox.fixture");
    const record = getNotificationFixture(id);
    if (!record) throw ApiError.fromResponse({ status: 404 }, { success: false, statusCode: 404, message: "Notification not found", error: { code: "NOT_FOUND" } });
    return record;
  }
  return api.get<NotificationRecord>(`/notifications/${encodeURIComponent(id)}`);
};

/**
 * Marks a system notification read for the signed-in user.
 *
 * @param id - The notification id.
 * @returns The updated notification.
 * @throws ApiError when it cannot be marked.
 */
export const markNotificationRead = async (id: string): Promise<NotificationRecord> => {
  if (fixturesEnabled()) {
    const { markReadFixture } = await import("@/lib/fixtures/inbox.fixture");
    return markReadFixture(id) ?? { _id: id };
  }
  return api.put<NotificationRecord>(`/notifications/${encodeURIComponent(id)}/read`);
};

/**
 * Marks an announcement read for the signed-in user.
 *
 * @param id - The announcement id.
 * @returns The updated announcement.
 * @throws ApiError when it cannot be marked.
 */
export const markAnnouncementRead = async (id: string): Promise<NotificationRecord> => {
  if (fixturesEnabled()) {
    const { markReadFixture } = await import("@/lib/fixtures/inbox.fixture");
    return markReadFixture(id) ?? { _id: id };
  }
  return api.put<NotificationRecord>(`/notifications/announcements/${encodeURIComponent(id)}/read`);
};
