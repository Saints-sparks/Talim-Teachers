import type { ChatParticipant, ChatRoomData } from "@/app/hooks/useWebSocket";
import type { ChatMessageView } from "./normalizeMessage";

export type JoinStatus = "idle" | "joining" | "joined" | "error";

/** Everything the app knows about one chat thread. Survives switching rooms. */
export interface RoomThreadState {
  /** Oldest first, merged by _id and clientMessageId. */
  messages: ChatMessageView[];
  hasMore: boolean;
  /** Pass with direction "before" to load older messages. */
  nextCursor: string | null;
  loadingOlder: boolean;
  joinStatus: JoinStatus;
  joinError: string | null;
  room: ChatRoomData | null;
  participants: ChatParticipant[];
  draft: string;
}

export const EMPTY_ROOM: RoomThreadState = Object.freeze({
  messages: [],
  hasMore: false,
  nextCursor: null,
  loadingOlder: false,
  joinStatus: "idle",
  joinError: null,
  room: null,
  participants: [],
  draft: "",
}) as RoomThreadState;

const byTime = (a: ChatMessageView, b: ChatMessageView) => {
  const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  if (diff !== 0) return diff;
  return a._id < b._id ? -1 : a._id > b._id ? 1 : 0;
};

/**
 * Merges incoming messages into a thread. A server copy replaces the pending
 * bubble with the same clientMessageId; everything else is keyed by _id.
 */
export function mergeMessages(
  existing: ChatMessageView[],
  incoming: ChatMessageView[],
): ChatMessageView[] {
  if (incoming.length === 0) return existing;
  const next = new Map<string, ChatMessageView>();
  const localKeyByClientId = new Map<string, string>();
  for (const message of existing) {
    next.set(message._id, message);
    if (message.clientMessageId) localKeyByClientId.set(message.clientMessageId, message._id);
  }
  for (const message of incoming) {
    if (message.clientMessageId) {
      const localKey = localKeyByClientId.get(message.clientMessageId);
      if (localKey && localKey !== message._id) {
        const local = next.get(localKey);
        // Never let a server echo downgrade a message, and never resurrect a
        // pending bubble over the saved message.
        if (local && local.status !== "sent") next.delete(localKey);
        else if (message.status !== "sent") continue;
      }
      localKeyByClientId.set(message.clientMessageId, message._id);
    }
    const current = next.get(message._id);
    if (current && current.status === "sent" && message.status !== "sent") continue;
    next.set(message._id, message);
  }
  return Array.from(next.values()).sort(byTime);
}

type Listener = () => void;

const rooms = new Map<string, RoomThreadState>();
const listeners = new Set<Listener>();

const emit = () => listeners.forEach((listener) => listener());

export const roomStore = {
  get(roomId: string | null | undefined): RoomThreadState {
    if (!roomId) return EMPTY_ROOM;
    return rooms.get(roomId) ?? EMPTY_ROOM;
  },

  update(roomId: string, updater: (state: RoomThreadState) => RoomThreadState) {
    const current = rooms.get(roomId) ?? EMPTY_ROOM;
    const next = updater(current);
    if (next === current) return;
    rooms.set(roomId, next);
    emit();
  },

  /** Every room that has a message waiting to be sent. */
  pendingMessages(): ChatMessageView[] {
    const pending: ChatMessageView[] = [];
    rooms.forEach((state) => {
      state.messages.forEach((message) => {
        if (message.status === "pending") pending.push(message);
      });
    });
    return pending;
  },

  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  /** Forget everything, e.g. when a different user signs in. */
  reset() {
    rooms.clear();
    emit();
  },
};

/** The newest message the server has confirmed, used as the backfill cursor. */
export function newestServerMessageId(messages: ChatMessageView[]): string | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].status === "sent") return messages[i]._id;
  }
  return null;
}
