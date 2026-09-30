/**
 * Pure logic behind the redesigned Messages page (Round 4 §26–29): the
 * category filter chips and thread search, the thread row's preview and
 * time, the contacts picker's groups, the header's Call rule and the sound
 * for new messages. No React, no network; unit-tested in
 * `src/__tests__/messages.logic.test.ts`.
 */
import type { ChatContact, ChatContactGroup, RoomCategory } from "@/types/inboxSettings";

/** The filter chips, in the design's order. `all` shows every thread. */
export type ThreadFilter = "all" | "parent" | "colleague" | "class_group" | "office";

/** Label of each chip. */
export const THREAD_FILTERS: readonly { id: ThreadFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "parent", label: "Parents" },
  { id: "colleague", label: "Colleagues" },
  { id: "class_group", label: "Class groups" },
  { id: "office", label: "Office" },
];

/** A participant, as far as the category fallback reads one. */
interface ParticipantLike {
  _id?: string;
  userId?: string;
  role?: string;
}

/** What the thread list reads from a room (a subset of `RealtimeChatRoom`). */
export interface ThreadLike {
  roomId: string;
  type: string;
  displayName: string;
  participants?: ParticipantLike[];
  lastMessage?: { senderId?: string; preview?: string; type?: string; createdAt?: string } | null;
  /** §27; missing on a server that predates Round 4. */
  category?: RoomCategory | string | null;
  subtitle?: string | null;
  callPhone?: string | null;
}

const CATEGORIES: ReadonlySet<string> = new Set(["parent", "colleague", "class_group", "office", "group"]);
const STAFF_ROLES: ReadonlySet<string> = new Set(["school_admin", "school_sub_admin", "sub_admin", "admin"]);

/**
 * A room's category: the server's (§27) when it sent one, else worked out
 * from the room type and the other participant's role, so the chips still
 * work against a server that predates Round 4.
 *
 * @param room - The room.
 * @param me - The signed-in user's id.
 * @returns The category.
 */
export function roomCategory(room: ThreadLike, me: string | null): RoomCategory {
  if (room.category && CATEGORIES.has(room.category)) return room.category as RoomCategory;
  if (room.type === "office") return "office";
  if (room.type === "class_group" || room.type === "course_group") return "class_group";
  if (room.type !== "one_to_one") return "group";
  const other = (room.participants ?? []).find((p) => (p.userId ?? p._id) !== me);
  const role = other?.role ?? "";
  if (role === "parent") return "parent";
  if (STAFF_ROLES.has(role)) return "office";
  return "colleague";
}

/**
 * Whether a room is a group conversation (the design's square green avatar).
 *
 * @param room - The room.
 * @returns True for everything but a one-to-one chat.
 */
export function isGroupThread(room: Pick<ThreadLike, "type">): boolean {
  return room.type !== "one_to_one";
}

/**
 * The threads a chip and a search show: the chip first, then the search
 * term (name, subtitle or last message) within it, in the list's order.
 *
 * @param rooms - Every room, newest activity first.
 * @param filter - The chip.
 * @param term - The search text; blank means none.
 * @param me - The signed-in user's id.
 * @returns The matching rooms.
 */
export function filterThreads<T extends ThreadLike>(rooms: readonly T[], filter: ThreadFilter, term: string, me: string | null): T[] {
  const needle = term.trim().toLowerCase();
  return rooms.filter((room) => {
    if (filter !== "all" && roomCategory(room, me) !== filter) return false;
    if (!needle) return true;
    return [room.displayName, room.subtitle ?? "", room.lastMessage?.preview ?? ""].some((text) => text.toLowerCase().includes(needle));
  });
}

/**
 * How many threads each chip holds, for the chips' accessible names.
 *
 * @param rooms - Every room.
 * @param me - The signed-in user's id.
 * @returns Count per chip.
 */
export function threadCounts(rooms: readonly ThreadLike[], me: string | null): Record<ThreadFilter, number> {
  const counts: Record<ThreadFilter, number> = { all: rooms.length, parent: 0, colleague: 0, class_group: 0, office: 0 };
  for (const room of rooms) {
    const category = roomCategory(room, me);
    if (category !== "group") counts[category] += 1;
  }
  return counts;
}

const MEDIA_PREVIEW: Record<string, string> = {
  image: "Photo",
  video: "Video",
  voice: "Voice note",
  audio: "Voice note",
  file: "File",
  document: "Document",
};

/**
 * The thread row's second line: "You: " before my own last message, the
 * media kind when there is no text, "No messages yet" for an empty thread.
 *
 * @param room - The room.
 * @param me - The signed-in user's id.
 * @returns The preview.
 */
export function threadPreview(room: Pick<ThreadLike, "lastMessage">, me: string | null): string {
  const last = room.lastMessage;
  if (!last) return "No messages yet";
  const text = last.preview?.trim() || MEDIA_PREVIEW[last.type ?? ""] || "Sent a message";
  const mine = Boolean(me) && last.senderId === me;
  return mine ? `You: ${text}` : text;
}

/**
 * A 12-hour clock time, "7:52am".
 *
 * @param date - The instant, in the viewer's timezone.
 * @returns The time.
 */
export function clockTime(date: Date): string {
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours % 12 || 12}:${minutes}${hours < 12 ? "am" : "pm"}`;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

/**
 * The thread row's time: the clock time today, "Thu" within the last week,
 * else "18 Sep" (the design's `time`).
 *
 * @param iso - The last message's timestamp.
 * @param now - The current time; a parameter so tests can pin it.
 * @returns The label, or "" without a valid time.
 */
export function threadTime(iso: string | undefined | null, now: Date = new Date()): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOf(now) - startOf(date)) / 86_400_000);
  if (days <= 0) return clockTime(date);
  if (days < 7) return WEEKDAYS[date.getDay()];
  return `${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

/**
 * Initials for an avatar, ignoring titles ("Mrs. Adaobi Obi" → "AO").
 *
 * @param name - The name.
 * @returns One or two capitals.
 */
export function initialsFor(name: string): string {
  const words = name
    .replace(/^(Mr|Mrs|Ms|Miss|Dr|Prof)\.?\s+/i, "")
    .split(/\s+/)
    .filter(Boolean);
  return (words.map((word) => word[0]).join("").slice(0, 2) || "?").toUpperCase();
}

// ─── Call (decision 1: no in-app calls) ─────────────────────────────────────

/**
 * The `tel:` link for a room's `callPhone` (§27). Only a one-to-one chat
 * with a parent of one of the teacher's students has one; everything else
 * shows no Call button at all.
 *
 * @param callPhone - The room's `callPhone`.
 * @returns `tel:+2348067712290`, or null when there is nothing to call.
 */
export function callHref(callPhone: string | null | undefined): string | null {
  const digits = (callPhone ?? "").replace(/[^\d+]/g, "");
  return digits.replace(/\+/g, "").length >= 5 ? `tel:${digits}` : null;
}

// ─── Contacts picker (§26) ──────────────────────────────────────────────────

/** One section of the "New message" picker. */
export interface ContactSection {
  group: ChatContactGroup;
  title: string;
  contacts: ChatContact[];
}

const SECTION_TITLES: Record<ChatContactGroup, string> = { parent: "Parents", colleague: "Colleagues", office: "School office" };
const SECTION_ORDER: readonly ChatContactGroup[] = ["parent", "colleague", "office"];

/**
 * The picker's sections: Parents, Colleagues, School office, in that order,
 * each keeping the server's order, filtered by a search over name and
 * subtitle. Empty sections are dropped.
 *
 * @param contacts - `GET /chat/contacts`.
 * @param term - The search text.
 * @returns The non-empty sections.
 */
export function groupContacts(contacts: readonly ChatContact[], term: string): ContactSection[] {
  const needle = term.trim().toLowerCase();
  const match = (contact: ChatContact) => !needle || `${contact.name} ${contact.subtitle}`.toLowerCase().includes(needle);
  return SECTION_ORDER.map((group) => ({
    group,
    title: SECTION_TITLES[group],
    contacts: contacts.filter((contact) => contact.group === group && match(contact)),
  })).filter((section) => section.contacts.length > 0);
}

// ─── Sound for new messages (§32 soundEnabled) ──────────────────────────────

/** Where the teacher is, for {@link isWatchingThread}. */
export interface WatchingInput {
  /** The app is on `/messages`. */
  onMessagesPage: boolean;
  /** The message's room is the one open in the chat. */
  roomOpen: boolean;
  /** The page is visible and its window has focus (`document.hasFocus()`). */
  pageFocused: boolean;
}

/**
 * Whether the teacher is reading the message's conversation right now: its
 * room is open on the Messages page in a focused window. Only then are the
 * in-app banner, the sound and the OS notification (in `public/sw.js`)
 * skipped; a room open in a window in the background still alerts.
 *
 * @param input - See {@link WatchingInput}.
 * @returns True when the conversation is open and focused.
 */
export function isWatchingThread({ onMessagesPage, roomOpen, pageFocused }: WatchingInput): boolean {
  return onMessagesPage && roomOpen && pageFocused;
}

/** What decides whether an incoming message makes a sound. */
export interface MessageSoundInput {
  /** The teacher's `messages.soundEnabled`. */
  soundEnabled: boolean;
  /** `document.visibilityState === "visible"`. */
  pageVisible: boolean;
  /** The message's conversation is open in a focused window ({@link isWatchingThread}). */
  inOpenThread: boolean;
  /** I sent it (another tab or device). */
  fromMe: boolean;
}

/**
 * The sound rule: a short chime for someone else's message, only while the
 * page is visible (a hidden tab gets the push notification instead), never
 * for the conversation being read in a focused window, and only when the
 * teacher turned "Sound for new messages" on.
 *
 * @param input - See {@link MessageSoundInput}.
 * @returns Whether to play it.
 */
export function shouldPlayMessageSound({ soundEnabled, pageVisible, inOpenThread, fromMe }: MessageSoundInput): boolean {
  return soundEnabled && pageVisible && !inOpenThread && !fromMe;
}
