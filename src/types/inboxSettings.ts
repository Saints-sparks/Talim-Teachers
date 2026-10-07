/**
 * Types for the teachers redesign, Round 4: Messages, Notifications and
 * Settings (§26–36 of `talimBE-V2/docs/redesign-teachers-round4-inbox-settings.md`).
 *
 * These are ALIASES of the generated contract (`./api.d.ts`, refreshed with
 * `npm run types:api`), as `./today.ts` does, so a backend change fails `tsc`
 * instead of rendering `undefined`. Where the portal builds a value itself (a
 * fallback, a dev fixture) the alias picks only the fields the portal reads.
 * The few hand-written types left say why next to them. The section numbers
 * below are the contract's.
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
import type { components } from "./api";

type S = components["schemas"];

// ─── §26 Contacts: GET /chat/contacts ───────────────────────────────────────

/**
 * One person the teacher can message. Sorted by the server by group
 * (parent, colleague, office), then by name. `phone` is set for parents only.
 */
export type ChatContact = S["TeacherContactDto"];

/** Who a contact is. */
export type ChatContactRole = ChatContact["role"];

/** Which section of the "New message" picker a contact is listed under. */
export type ChatContactGroup = ChatContact["group"];

/** The `userId` of the one "School office" entry; picking it calls `POST /chat/office` (§28). */
export const OFFICE_CONTACT_ID = "office";

// ─── §27 Room view additions (every room list and room read) ────────────────

/** The room view every room list and room read returns (`ChatRoomViewDto`). */
type RoomView = S["ChatRoomViewDto"];

/** A room's category, as the Messages filter chips group them. */
export type RoomCategory = RoomView["category"];

/** A group admin as the room view lists them (addendum of 2026-09-30). */
export type RoomAdmin = S["ChatRoomAdminDto"];

/**
 * The per-viewer fields every room gains (§27), plus the product owner's
 * addendum of 2026-09-30: every room view also carries the group's
 * `description` and its `admins`. Only a group admin may rename a group or
 * change its description (`PATCH /chat/rooms/:id`, 403 otherwise); office and
 * one-to-one rooms have no description to edit. `room-updated` delivers the
 * same fields live, which is why `description` and `admins` stay optional
 * here although the room view always has them.
 */
export type RoomViewAdditions = Pick<RoomView, "category" | "subtitle" | "callPhone"> &
  Partial<Pick<RoomView, "description" | "admins">>;

// ─── §28 Office inbox: POST /chat/office ────────────────────────────────────

/**
 * The caller's office room in the room-view shape (created if needed). Only
 * the id is read by the portal; the rest arrives with the room list, so only
 * the fields the dev fixture builds are picked.
 */
export type OfficeRoom = Pick<RoomView, "_id" | "roomId" | "name" | "type" | "category" | "subtitle" | "callPhone">;

// ─── §29 Shared media: GET /chat/rooms/:roomId/media ───────────────────────

/** One shared image, video, document or link (links are URLs found in message text). */
export type SharedMediaItem = S["ChatMediaItemDto"];

/**
 * The kinds the media endpoint serves. Videos have their own kind since the
 * portals backend (B10); they used to be filed under `document`.
 */
export type SharedMediaKind = SharedMediaItem["kind"];

/** Every media kind, in the endpoint's (and the info modal's) order. */
export const SHARED_MEDIA_KINDS: readonly SharedMediaKind[] = ["image", "video", "document", "link"];

/** One page of shared media, with the totals per kind for the tab counts. */
export type SharedMediaPage = S["ChatMediaPageDto"];

// ─── §30 Notifications ──────────────────────────────────────────────────────

/**
 * `metadata.target` on a notification (same shape as `attention.action.target`):
 * where its action goes. v1.5's support target is `{ page: 'support', ticketId }`.
 */
export type NotificationTarget = S["NotificationTargetDto"];

/**
 * Every page a notification's action can name, the parents' and payments'
 * pages included; `notifications.logic.ts` routes only the ones this portal has.
 */
export type NotificationTargetPage = NotificationTarget["page"];

/** `{ all, unread }` for one category. */
export type CategoryCount = S["InboxCountDto"];

/** A category the counts are kept under (the backend's `NotificationCategory`, `support` included). */
export type CountCategory = keyof S["InboxCountsByCategoryDto"];

/**
 * `GET /notifications/counts`. Announcements count under `announcement`, and
 * the counts cover both feeds (notifications and announcements). The server
 * always sends every category; `byCategory` is partial here because the
 * portal also builds counts itself (from a page of items, or a fallback).
 */
export type NotificationCountsBody = Omit<S["InboxCountsDto"], "byCategory"> & {
  byCategory: Partial<Record<CountCategory, CategoryCount>>;
};

/** `PATCH /notifications/read-all` (also marks the caller's announcements read). */
export type ReadAllResult = Pick<S["ReadAllResponseDto"], "updated">;

/** One attachment of a notification or announcement (derived from `attachments`). */
export type AttachmentFile = S["NotificationAttachmentFileDto"];

/** What an attachment is, derived by the server from its URL. */
export type AttachmentFileKind = AttachmentFile["kind"];

// ─── §31 Alert preferences: GET / PATCH /notifications/preferences ─────────
// `gradingEnabled`, `registerReminderEnabled` and `resourceOpenedEnabled` are
// in `UpdateNotificationPreferenceDto` now; `useNotificationPreferences` picks
// them from the generated payload.

// ─── §32 Message preferences (GET /teacher/settings, PATCH …/preferences) ──

/**
 * `messages` in the teacher settings, as far as this portal shows it.
 * `showOnlineStatus` and `readReceipts` are the chat module's own
 * (`ChatPreference`); `soundEnabled` stays with the teacher's preferences.
 */
export type MessagePreferences = Pick<
  S["TeacherMessagePreferencesViewDto"],
  "showOnlineStatus" | "readReceipts" | "soundEnabled"
>;

// ─── §33 Profile: PATCH /teacher/settings/profile ──────────────────────────

/** The body. Email is not accepted. Answers with the `GET /teacher/settings` shape. */
export type UpdateProfileBody = S["UpdateTeacherProfileDto"];

/** Names are 1–60 characters. */
export const PROFILE_NAME_MAX = 60;

/** The phone, after trimming: 7–20 characters of `+`, digits, spaces and dashes. */
export const PROFILE_PHONE_PATTERN = /^[+\d\s-]{7,20}$/;

// ─── §34 Sessions and password policy (all roles) ──────────────────────────

/**
 * `GET /auth/sessions`: one active refresh token. `current` is decided by the
 * refresh token on the request; all false when it can't be identified.
 */
export type AuthSession = S["SessionDto"];

/** `POST /auth/sessions/revoke-others`. */
export type RevokeOthersResult = S["RevokeOthersDto"];

/**
 * `GET /auth/password-policy` (public), from `security-config.service.ts`.
 * Picks the rules the portal checks and explains; `maxLength` and `symbols`
 * are not used, and the portal's own fallback policy does not carry them.
 */
export type PasswordPolicy = Pick<
  S["PasswordPolicyDto"],
  "minLength" | "requireUppercase" | "requireLowercase" | "requireNumber" | "requireSymbol" | "historyCount"
>;

// ─── §35 Support tickets ───────────────────────────────────────────────────
// Replaced in v1.5 by the unified tickets (`./tickets.ts`: `GET /tickets/mine`,
// `POST /tickets` and the rest), in `src/app/services/support/tickets.service.ts`.

// ─── §36 School contact: GET /teachers/me/school ───────────────────────────

/**
 * The school office's contact details. `officeHours` (`HH:mm`, from
 * `AcademicSettings.officeHours`) is null when the school hasn't set them.
 */
export type SchoolContact = S["SchoolContactDto"];
