/**
 * Types for the teachers redesign, Round 4: Messages, Notifications and
 * Settings (§26–36 of `talimBE-V2/docs/redesign-teachers-round4-inbox-settings.md`).
 *
 * HAND-WRITTEN ON PURPOSE, FOR SWAPPING LATER. The backend is being built in
 * parallel, so these DTOs are not in the generated contract (`./api.d.ts`)
 * yet. Once `npm run types:api` brings them in, replace each interface here
 * with an alias of the generated schema (`type X = S["XDto"]`, as
 * `./today.ts` does) so a backend change fails `tsc` instead of rendering
 * `undefined`. The section numbers below are the contract's.
 *
 * Decisions of 2026-09-29 that shape these types:
 * 1. No in-app calls: a `one_to_one` room with a parent of one of the
 *    teacher's students carries `callPhone`, and the chat header offers a
 *    `tel:` link instead of the design's Voice/Video buttons.
 * 2. "School office" is a shared inbox: one `office` room per teacher.
 * 3. The Notifications "Messages" tab is dropped.
 * 4. Teachers edit their name and phone; the email is read-only.
 * 5. Security: sessions with "sign out other devices"; no two-step sign-in;
 *    the password copy comes from the backend's real policy.
 */
import type { AttentionTarget } from "./today";

// ─── §26 Contacts: GET /chat/contacts ───────────────────────────────────────

/** Who a contact is. */
export type ChatContactRole = "parent" | "teacher" | "school_admin" | "sub_admin";

/** Which section of the "New message" picker a contact is listed under. */
export type ChatContactGroup = "parent" | "colleague" | "office";

/** The `userId` of the one "School office" entry; picking it calls `POST /chat/office` (§28). */
export const OFFICE_CONTACT_ID = "office";

/**
 * One person the teacher can message. Sorted by the server by group
 * (parent, colleague, office), then by name.
 */
export interface ChatContact {
  userId: string;
  name: string;
  role: ChatContactRole;
  avatarUrl: string | null;
  /** "Parent of Ada Obi · Grade 5A", "Mathematics · colleague". */
  subtitle: string;
  group: ChatContactGroup;
  /** Parents only; null for everyone else. */
  phone: string | null;
}

// ─── §27 Room view additions (every room list and room read) ────────────────

/** A room's category, as the Messages filter chips group them. */
export type RoomCategory = "parent" | "colleague" | "class_group" | "office" | "group";

/** A group admin as the room view lists them (addendum of 2026-09-30). */
export interface RoomAdmin {
  id: string;
  name: string;
}

/**
 * The per-viewer fields every room gains (§27), plus the product owner's
 * addendum of 2026-09-30: every room view also carries the group's
 * `description` and its `admins`. Only a group admin may rename a group or
 * change its description (`PATCH /chat/rooms/:id`, 403 otherwise); office and
 * one-to-one rooms have no description to edit. `room-updated` delivers the
 * same fields live.
 */
export interface RoomViewAdditions {
  category: RoomCategory;
  /** "Parent of Ada Obi · Grade 5A", "Class group · 12 students", "School office · Easy Sparks". */
  subtitle: string;
  /**
   * Set only when the viewer is a teacher, the room is `one_to_one` and the
   * other participant is a parent of one of the viewer's students.
   */
  callPhone: string | null;
  /** The group's description (empty or null when none; groups only). */
  description?: string | null;
  /** The group's admins; empty for one-to-one and office rooms. */
  admins?: RoomAdmin[];
}

// ─── §28 Office inbox: POST /chat/office ────────────────────────────────────

/**
 * The caller's office room in the room-view shape (created if needed). Only
 * the id is read by the portal; the rest arrives with the room list.
 */
export interface OfficeRoom extends Partial<RoomViewAdditions> {
  _id?: string;
  roomId?: string;
  name?: string;
  type?: "office";
}

// ─── §29 Shared media: GET /chat/rooms/:roomId/media ───────────────────────

/**
 * The kinds the media endpoint serves. Videos have their own kind since the
 * portals backend (B10); they used to be filed under `document`.
 */
export type SharedMediaKind = "image" | "video" | "document" | "link";

/** Every media kind, in the endpoint's (and the info modal's) order. */
export const SHARED_MEDIA_KINDS: readonly SharedMediaKind[] = ["image", "video", "document", "link"];

/** One shared image, video, document or link (links are URLs found in message text). */
export interface SharedMediaItem {
  messageId: string;
  kind: SharedMediaKind;
  url: string;
  name: string | null;
  mimeType: string | null;
  size: number | null;
  sentAt: string;
  sender: { id: string; name: string };
}

/** One page of shared media, with the totals per kind for the tab counts. */
export interface SharedMediaPage {
  items: SharedMediaItem[];
  nextCursor: string | null;
  counts: Record<SharedMediaKind, number>;
}

// ─── §30 Notifications ──────────────────────────────────────────────────────

/**
 * Where a notification's action goes: the §8 attention target plus the pages
 * Round 4 adds (`announcements`, `timetable`, `subjects`, `settings`).
 */
export type NotificationTargetPage = AttentionTarget["page"] | "announcements" | "timetable" | "subjects" | "settings";

/** `metadata.target` on a notification (same shape as `attention.action.target`). */
export interface NotificationTarget {
  page: NotificationTargetPage;
  classId?: string;
  courseId?: string;
  assessmentId?: string;
  roomId?: string;
  week?: number;
  /** `YYYY-MM-DD`. */
  date?: string;
}

/** `{ all, unread }` for one category. */
export interface CategoryCount {
  all: number;
  unread: number;
}

/**
 * `GET /notifications/counts`. Announcements count under `announcement`, and
 * the counts cover both feeds (notifications and announcements).
 */
export interface NotificationCountsBody {
  all: number;
  unread: number;
  byCategory: Partial<Record<string, CategoryCount>>;
}

/** `PATCH /notifications/read-all` (also marks the caller's announcements read). */
export interface ReadAllResult {
  updated: number;
}

/** What an attachment is, derived by the server from its URL. */
export type AttachmentFileKind = "pdf" | "image" | "doc" | "slides" | "video" | "other";

/** One attachment of a notification or announcement (derived from `attachments`). */
export interface AttachmentFile {
  url: string;
  /** The last path segment, decoded. */
  name: string;
  kind: AttachmentFileKind;
  size: number | null;
}

// ─── §31 Alert preferences: GET / PATCH /notifications/preferences ─────────

/** The switches Round 4 adds to `UpdateNotificationPreferenceDto` (all default true). */
export interface AlertPreferenceAdditions {
  /** Gates the assessment deadline reminder (7 days and 1 day before) and grading reminders. */
  gradingEnabled: boolean;
  /** One notification at `registerCloseTime` minus 30 minutes while a register is open. */
  registerReminderEnabled: boolean;
  /** A daily digest at 16:00: "N students opened '{name}' today". */
  resourceOpenedEnabled: boolean;
}

// ─── §32 Message preferences (GET /teacher/settings, PATCH …/preferences) ──

/**
 * `messages` in the teacher settings. `showOnlineStatus` and `readReceipts`
 * are the chat module's own (`ChatPreference`); `soundEnabled` stays with the
 * teacher's preferences.
 */
export interface MessagePreferences {
  showOnlineStatus: boolean;
  readReceipts: boolean;
  soundEnabled: boolean;
}

// ─── §33 Profile: PATCH /teacher/settings/profile ──────────────────────────

/** The body. Email is not accepted. Answers with the `GET /teacher/settings` shape. */
export interface UpdateProfileBody {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  avatarUrl?: string;
}

/** Names are 1–60 characters. */
export const PROFILE_NAME_MAX = 60;

/** The phone, after trimming: 7–20 characters of `+`, digits, spaces and dashes. */
export const PROFILE_PHONE_PATTERN = /^[+\d\s-]{7,20}$/;

// ─── §34 Sessions and password policy (all roles) ──────────────────────────

/** `GET /auth/sessions`: one active refresh token. */
export interface AuthSession {
  id: string;
  device: string | null;
  browser: string | null;
  os: string | null;
  ip: string | null;
  lastUsedAt: string;
  createdAt: string;
  /** Decided by the refresh token on the request; all false when it can't be identified. */
  current: boolean;
}

/** `POST /auth/sessions/revoke-others`. */
export interface RevokeOthersResult {
  revoked: number;
}

/** `GET /auth/password-policy` (public), from `security-config.service.ts`. */
export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumber: boolean;
  requireSymbol: boolean;
  /** How many previous passwords can't be reused. */
  historyCount: number;
}

// ─── §35 Support tickets: POST /support/tickets ────────────────────────────

/** Where the problem happened (the design's area chips). */
export type SupportArea = "grading" | "attendance" | "timetable" | "messages" | "signing_in" | "other";

/** The description's length limits. */
export const SUPPORT_DESCRIPTION_MIN = 10;
export const SUPPORT_DESCRIPTION_MAX = 2000;

/** The body. */
export interface SupportTicketBody {
  area: SupportArea;
  /** 10–2000 characters. */
  description: string;
  attachmentUrl?: string;
  context?: { path: string; appVersion: string; userAgent: string };
}

/** The answer: the reference to quote, e.g. `TS-51234`. */
export interface SupportTicketResult {
  reference: string;
  createdAt: string;
}

// ─── §36 School contact: GET /teachers/me/school ───────────────────────────

/** The school office's contact details. */
export interface SchoolContact {
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  /** `HH:mm`, from `AcademicSettings.officeHours`; null when the school hasn't set them. */
  officeHours: { start: string; end: string } | null;
}
