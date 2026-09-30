/**
 * Dev and test fixtures for Round 4's Messages and Notifications
 * (`GET /chat/contacts`, `POST /chat/office`, `GET /chat/rooms/:id/media`,
 * the room-view additions, `GET /notifications` and the announcements list
 * with `metadata.target` and `attachmentFiles`, `GET /notifications/counts`
 * and `PATCH /notifications/read-all`), in the shapes of
 * `src/types/inboxSettings.ts`.
 *
 * Mirrors the design's seed: Seyi Tinubu teaches JSS1 A (class teacher) and
 * JSS2 B at Easy Sparks Education Center; the threads are Mrs. Adaobi Obi
 * (a parent), the JSS2 B Mathematics class group, Mr. Tunji Salami (a
 * colleague) and the School office; the notifications are n1–n7 without the
 * dropped "Messages" one.
 *
 * Read state is the records' `isRead` flag (the server's per-viewer view),
 * so it does not depend on who is signed in. In fixture mode
 * (`NEXT_PUBLIC_USE_FIXTURES=true`, dev only) marking read writes to an
 * in-memory store until the page is reloaded. Nothing in a
 * production build imports this file statically.
 */
import { FIXTURE_SCHOOL, FIXTURE_STUDENTS } from "@/lib/fixtures/classroom.fixture";
import type { NotificationRecord } from "@/app/services/notifications.service";
import type {
  ChatContact,
  NotificationCountsBody,
  OfficeRoom,
  RoomCategory,
  SharedMediaItem,
  SharedMediaKind,
  SharedMediaPage,
} from "@/types/inboxSettings";

/** The signed-in fixture teacher. */
export const FIXTURE_TEACHER_ID = "u-teacher-seyi";

/** The office room's id. */
export const FIXTURE_OFFICE_ROOM_ID = "room-office";

// ─── Contacts (§26) ─────────────────────────────────────────────────────────

const CLASS_NAME: Record<string, string> = { c1: "JSS1 A", c2: "JSS2 B" };

/**
 * `GET /chat/contacts`: the guardians of the teacher's students, three
 * colleagues and the office, sorted by group and then by name (titles
 * ignored), as the server sorts them.
 *
 * @returns The contacts.
 */
export function makeContactsFixture(): ChatContact[] {
  const bare = (name: string) => name.replace(/^(Mr\.|Mrs\.|Ms\.)\s*/, "");
  // Samuel Ogun's guardian (s12) has no Talim account; Victor Ade (s22) has no guardian.
  const parents: ChatContact[] = FIXTURE_STUDENTS.filter((s) => s.id !== "s12" && s.id !== "s22").map((s) => ({
    userId: `u-guardian-${s.id}`,
    name: s.guardian,
    role: "parent",
    avatarUrl: null,
    subtitle: `Parent of ${s.name} · ${CLASS_NAME[s.cls]}`,
    group: "parent",
    phone: s.phone,
  }));
  const colleagues: ChatContact[] = [
    { userId: "u-teacher-tunji", name: "Mr. Tunji Salami", role: "teacher", avatarUrl: null, subtitle: "Basic Science · colleague", group: "colleague", phone: null },
    { userId: "u-teacher-funke", name: "Mrs. Funke Adebayo", role: "teacher", avatarUrl: null, subtitle: "English Language · colleague", group: "colleague", phone: null },
    { userId: "u-teacher-ibrahim", name: "Mr. Ibrahim Musa", role: "teacher", avatarUrl: null, subtitle: "Social Studies · colleague", group: "colleague", phone: null },
  ];
  const office: ChatContact = {
    userId: "office",
    name: "School office",
    role: "school_admin",
    avatarUrl: null,
    subtitle: `School office · ${FIXTURE_SCHOOL}`,
    group: "office",
    phone: null,
  };
  const byName = (a: ChatContact, b: ChatContact) => bare(a.name).localeCompare(bare(b.name));
  return [...parents.sort(byName), ...colleagues.sort(byName), office];
}

/**
 * `POST /chat/office`: the teacher's office room.
 *
 * @returns The room, in the room-view shape.
 */
export function makeOfficeRoomFixture(): OfficeRoom {
  return {
    _id: FIXTURE_OFFICE_ROOM_ID,
    roomId: FIXTURE_OFFICE_ROOM_ID,
    name: "School office",
    type: "office",
    category: "office",
    subtitle: `School office · ${FIXTURE_SCHOOL}`,
    callPhone: null,
  };
}

// ─── Rooms (§27) ────────────────────────────────────────────────────────────

/** A room as the Messages list reads it (the fields of `RealtimeChatRoom` it uses). */
export interface FixtureRoom {
  roomId: string;
  name: string;
  type: string;
  displayName: string;
  avatarInfo: { type: "image" | "initials"; value: string };
  participants: {
    _id: string;
    userId: string;
    firstName: string;
    lastName: string;
    role: string;
    isOnline: boolean;
  }[];
  lastMessage: { _id: string; senderId: string; senderName: string; type: string; preview: string; createdAt: string } | null;
  unreadCount: number;
  updatedAt: string;
  isOnline: boolean;
  category: RoomCategory;
  subtitle: string;
  callPhone: string | null;
}

/**
 * The design's four threads, newest first, as the room list delivers them
 * (with the §27 fields).
 *
 * @returns The rooms.
 */
export function makeRoomsFixture(): FixtureRoom[] {
  const me = { _id: FIXTURE_TEACHER_ID, userId: FIXTURE_TEACHER_ID, firstName: "Seyi", lastName: "Tinubu", role: "teacher", isOnline: true };
  return [
    {
      roomId: "room-obi",
      name: "",
      type: "one_to_one",
      displayName: "Mrs. Adaobi Obi",
      avatarInfo: { type: "initials", value: "AO" },
      participants: [me, { _id: "u-guardian-s3", userId: "u-guardian-s3", firstName: "Mrs. Adaobi", lastName: "Obi", role: "parent", isOnline: false }],
      lastMessage: {
        _id: "m-obi-1",
        senderId: "u-guardian-s3",
        senderName: "Mrs. Adaobi Obi",
        type: "text",
        preview: "Good morning Mr. Tinubu. Chiamaka has a dental appointment on Monday morning.",
        createdAt: "2026-09-25T06:52:00.000Z",
      },
      unreadCount: 1,
      updatedAt: "2026-09-25T06:52:00.000Z",
      isOnline: false,
      category: "parent",
      subtitle: "Parent of Chiamaka Obi · JSS1 A",
      callPhone: "+234 806 771 2290",
    },
    {
      roomId: "room-c2",
      name: "JSS2 B Mathematics",
      type: "class_group",
      displayName: "JSS2 B Mathematics",
      avatarInfo: { type: "initials", value: "JB" },
      participants: [me, { _id: "u-student-s14", userId: "u-student-s14", firstName: "Daniel", lastName: "Ojo", role: "student", isOnline: true }],
      lastMessage: {
        _id: "m-c2-3",
        senderId: FIXTURE_TEACHER_ID,
        senderName: "Seyi Tinubu",
        type: "text",
        preview: "Page 42. Exercise 2c starts halfway down.",
        createdAt: "2026-09-24T18:02:00.000Z",
      },
      unreadCount: 0,
      updatedAt: "2026-09-24T18:02:00.000Z",
      isOnline: false,
      category: "class_group",
      subtitle: "Class group · 10 students",
      callPhone: null,
    },
    {
      roomId: "room-salami",
      name: "",
      type: "one_to_one",
      displayName: "Mr. Tunji Salami",
      avatarInfo: { type: "initials", value: "TS" },
      participants: [me, { _id: "u-teacher-tunji", userId: "u-teacher-tunji", firstName: "Mr. Tunji", lastName: "Salami", role: "teacher", isOnline: true }],
      lastMessage: {
        _id: "m-salami-2",
        senderId: FIXTURE_TEACHER_ID,
        senderName: "Seyi Tinubu",
        type: "text",
        preview: "That works. I'll confirm with the office.",
        createdAt: "2026-09-23T12:40:00.000Z",
      },
      unreadCount: 0,
      updatedAt: "2026-09-23T12:40:00.000Z",
      isOnline: true,
      category: "colleague",
      subtitle: "Basic Science · colleague",
      callPhone: null,
    },
    {
      roomId: FIXTURE_OFFICE_ROOM_ID,
      name: "School office",
      type: "office",
      displayName: "School office",
      avatarInfo: { type: "initials", value: "SO" },
      participants: [me, { _id: "u-admin-1", userId: "u-admin-1", firstName: "Office", lastName: "Admin", role: "school_admin", isOnline: false }],
      lastMessage: {
        _id: "m-office-1",
        senderId: "u-admin-1",
        senderName: "School office",
        type: "text",
        preview: "The staff meeting has moved to Wednesday at 2:30pm in the library.",
        createdAt: "2026-09-21T08:05:00.000Z",
      },
      unreadCount: 0,
      updatedAt: "2026-09-21T08:05:00.000Z",
      isOnline: false,
      category: "office",
      subtitle: `School office · ${FIXTURE_SCHOOL}`,
      callPhone: null,
    },
  ];
}

// ─── Shared media (§29) ─────────────────────────────────────────────────────

const MEDIA: Record<string, SharedMediaItem[]> = {
  "room-c2": [
    {
      messageId: "m-c2-1",
      kind: "document",
      url: "https://res.cloudinary.com/talim-fixture/raw/upload/Exercise%202c%20worked%20example.pdf",
      name: "Exercise 2c worked example.pdf",
      mimeType: "application/pdf",
      size: 245_760,
      sentAt: "2026-09-24T14:10:00.000Z",
      sender: { id: FIXTURE_TEACHER_ID, name: "Seyi Tinubu" },
    },
    {
      messageId: "m-c2-4",
      kind: "image",
      url: "https://res.cloudinary.com/talim-fixture/image/upload/board-work.jpg",
      name: "board-work.jpg",
      mimeType: "image/jpeg",
      size: 412_000,
      sentAt: "2026-09-23T10:00:00.000Z",
      sender: { id: FIXTURE_TEACHER_ID, name: "Seyi Tinubu" },
    },
    {
      messageId: "m-c2-5",
      kind: "link",
      url: "https://www.khanacademy.org/math/pre-algebra",
      name: null,
      mimeType: null,
      size: null,
      sentAt: "2026-09-22T15:30:00.000Z",
      sender: { id: FIXTURE_TEACHER_ID, name: "Seyi Tinubu" },
    },
  ],
};

/**
 * `GET /chat/rooms/:roomId/media?kind=&cursor=&limit=`: newest first, paged
 * by index (the cursor is the next index as a string).
 *
 * @param roomId - The room.
 * @param kind - Images, documents or links.
 * @param cursor - Where the previous page stopped.
 * @param limit - Page size.
 * @returns One page, with the totals per kind.
 */
export function makeRoomMediaFixture(roomId: string, kind: SharedMediaKind, cursor?: string | null, limit = 20): SharedMediaPage {
  const all = MEDIA[roomId] ?? [];
  const ofKind = all.filter((item) => item.kind === kind);
  const start = cursor ? Number(cursor) || 0 : 0;
  const items = ofKind.slice(start, start + limit);
  const next = start + limit < ofKind.length ? String(start + limit) : null;
  const count = (k: SharedMediaKind) => all.filter((item) => item.kind === k).length;
  return { items, nextCursor: next, counts: { image: count("image"), document: count("document"), link: count("link") } };
}

// ─── Notifications (§30) ────────────────────────────────────────────────────

/** The design's notifications (without the dropped Messages one), as the two feeds return them. */
function seedNotifications(): { notifications: NotificationRecord[]; announcements: NotificationRecord[] } {
  const academicOffice = { _id: "u-admin-academic", name: "Academic office" };
  return {
    notifications: [
      {
        _id: "n1",
        type: "assessment_reminder",
        category: "academics",
        source: "school",
        title: "1st CA closes in 7 days",
        message:
          "Scores for 1st CA are due by Friday 2 October. Mathematics · JSS1 A still has scores to enter, and Further Mathematics · JSS2 B has not started.",
        senderId: academicOffice,
        createdAt: "2026-09-25T07:00:00.000Z",
        isRead: false,
        metadata: { category: "academics", target: { page: "grading", courseId: "k1", assessmentId: "a1" }, actionLabel: "Open grading" },
      },
      {
        _id: "n2",
        type: "attendance_alert",
        category: "attendance",
        source: "talim",
        title: "Register not yet submitted: JSS1 A",
        message: "Morning registers close at 11:00am. Parents of absent students are notified as soon as the register is submitted.",
        senderName: "Talim",
        createdAt: "2026-09-25T08:30:00.000Z",
        isRead: false,
        metadata: { category: "attendance", target: { page: "attendance", classId: "c1", date: "2026-09-25" }, actionLabel: "Take register" },
      },
      {
        _id: "n5",
        type: "result_published",
        category: "grading",
        source: "talim",
        title: "Scores published: 1st CA Mathematics · JSS2 B",
        message: "You published 10 scores. Class average 72.5%, pass rate 90%. Students and parents can now see them.",
        senderName: "Talim",
        createdAt: "2026-09-18T14:29:00.000Z",
        isRead: true,
        metadata: { category: "grading", target: { page: "grading", courseId: "k2", assessmentId: "a1" }, actionLabel: "View scores" },
      },
      {
        _id: "n7",
        type: "app_update",
        category: "other",
        source: "talim",
        title: "New in Talim: period-by-period timetable",
        message: "Your timetable now shows each period, the room and the week's topic. Open any lesson for quick actions.",
        senderName: "Talim",
        createdAt: "2026-09-14T09:00:00.000Z",
        isRead: true,
        metadata: { category: "other", target: { page: "timetable" }, actionLabel: "Open timetable" },
      },
    ],
    announcements: [
      {
        _id: "n3",
        title: "Inter-house sports on Friday 9 October",
        message:
          "Lessons end at 12:20pm. Class teachers should collect signed consent forms by Wednesday 7 October and hand them to the games master.",
        senderName: "School admin",
        schoolName: FIXTURE_SCHOOL,
        createdAt: "2026-09-24T15:10:00.000Z",
        isRead: false,
        attachments: [
          "https://res.cloudinary.com/talim-fixture/raw/upload/Sports%20day%20schedule.pdf",
          "https://res.cloudinary.com/talim-fixture/raw/upload/Consent%20form.docx",
        ],
        attachmentFiles: [
          { url: "https://res.cloudinary.com/talim-fixture/raw/upload/Sports%20day%20schedule.pdf", name: "Sports day schedule.pdf", kind: "pdf", size: 182_000 },
          { url: "https://res.cloudinary.com/talim-fixture/raw/upload/Consent%20form.docx", name: "Consent form.docx", kind: "doc", size: 48_000 },
        ],
        metadata: { target: { page: "announcements" } },
      },
      {
        _id: "n6",
        title: "Staff meeting moved to Wednesday",
        message: "The weekly staff meeting is now on Wednesday at 2:30pm in the library.",
        senderName: "School admin",
        schoolName: FIXTURE_SCHOOL,
        createdAt: "2026-09-21T08:05:00.000Z",
        isRead: true,
      },
    ],
  };
}

let store = seedNotifications();

/** Restores the notification seed (tests call this in `beforeEach`). */
export function resetInboxFixtureStore(): void {
  store = seedNotifications();
}

/**
 * Whether the fixture teacher has read a record.
 *
 * @param record - A notification or announcement.
 * @returns True when read.
 */
function isRead(record: NotificationRecord): boolean {
  return record.isRead === true;
}

/**
 * One page of a feed, newest first, in the list envelope's shape.
 *
 * @param records - The feed.
 * @param page - 1-based.
 * @param limit - Page size.
 * @returns `{ data, meta }`.
 */
function pageOf(records: NotificationRecord[], page: number, limit: number) {
  const sorted = [...records].sort((a, b) => Date.parse(b.createdAt ?? "") - Date.parse(a.createdAt ?? ""));
  const start = (page - 1) * limit;
  return { data: sorted.slice(start, start + limit), meta: { total: sorted.length, page, limit, lastPage: Math.max(1, Math.ceil(sorted.length / limit)) } };
}

/**
 * `GET /notifications?page=&limit=&unread=`.
 *
 * @param page - 1-based page.
 * @param limit - Page size.
 * @param unread - Only unread ones.
 * @returns The page.
 */
export function listNotificationsFixture(page = 1, limit = 20, unread = false) {
  return pageOf(store.notifications.filter((n) => !unread || !isRead(n)), page, limit);
}

/**
 * `GET /notifications/announcements/receiver/:userId?page=&limit=`.
 *
 * @param page - 1-based page.
 * @param limit - Page size.
 * @returns The page.
 */
export function listAnnouncementsFixture(page = 1, limit = 20) {
  return pageOf(store.announcements, page, limit);
}

/** The server's category for a notification record (announcements count under `announcement`). */
function categoryOf(record: NotificationRecord, feed: "notification" | "announcement"): string {
  return feed === "announcement" ? "announcement" : String(record.category ?? record.metadata?.category ?? "other");
}

/**
 * `GET /notifications/counts` over both feeds.
 *
 * @returns `{ all, unread, byCategory }`.
 */
export function makeNotificationCountsFixture(): NotificationCountsBody {
  const body: NotificationCountsBody = { all: 0, unread: 0, byCategory: {} };
  const add = (record: NotificationRecord, feed: "notification" | "announcement") => {
    const category = categoryOf(record, feed);
    const entry = body.byCategory[category] ?? { all: 0, unread: 0 };
    entry.all += 1;
    body.all += 1;
    if (!isRead(record)) {
      entry.unread += 1;
      body.unread += 1;
    }
    body.byCategory[category] = entry;
  };
  store.notifications.forEach((record) => add(record, "notification"));
  store.announcements.forEach((record) => add(record, "announcement"));
  return body;
}

/**
 * `GET /notifications/:id` (system notifications only, as the server serves them).
 *
 * @param id - The notification.
 * @returns The record, or a 404-like `undefined` when it isn't one.
 */
export function getNotificationFixture(id: string): NotificationRecord | undefined {
  return store.notifications.find((n) => n._id === id);
}

/**
 * `PUT /notifications/:id/read` or `PUT /notifications/announcements/:id/read`.
 *
 * @param id - The record.
 * @returns The record after marking, or undefined when unknown.
 */
export function markReadFixture(id: string): NotificationRecord | undefined {
  const notification = store.notifications.find((n) => n._id === id);
  if (notification) {
    notification.isRead = true;
    return notification;
  }
  const announcement = store.announcements.find((n) => n._id === id);
  if (announcement) {
    announcement.isRead = true;
    return announcement;
  }
  return undefined;
}

/**
 * `PATCH /notifications/read-all`: both feeds.
 *
 * @returns How many were marked.
 */
export function markAllReadFixture(): { updated: number } {
  let updated = 0;
  for (const record of store.notifications) {
    if (!isRead(record)) {
      record.isRead = true;
      updated++;
    }
  }
  for (const record of store.announcements) {
    if (!isRead(record)) {
      record.isRead = true;
      updated++;
    }
  }
  return { updated };
}
