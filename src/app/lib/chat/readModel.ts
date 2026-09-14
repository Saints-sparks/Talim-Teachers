import type { ChatMessageView } from "./normalizeMessage";

/**
 * Read positions and receipts (docs/chat-realtime-contract.md, "Reading and
 * read receipts"). Pure functions so the socket handlers stay small.
 */

export interface ReadPosition {
  messageId: string;
  createdAt: string;
}

export type ReceiptState = "pending" | "failed" | "sent" | "read";

const time = (iso: string) => new Date(iso).getTime() || 0;

/** Orders two messages the way the server pages them: (createdAt, _id). */
export function compareReadPosition(a: ReadPosition, b: ReadPosition): number {
  const diff = time(a.createdAt) - time(b.createdAt);
  if (diff !== 0) return diff;
  return a.messageId < b.messageId ? -1 : a.messageId > b.messageId ? 1 : 0;
}

/** The newest stored message from someone else: what "read up to" should point at. */
export function newestReadableMessage(
  messages: ChatMessageView[],
  me: string | null,
): ChatMessageView | null {
  if (!me) return null;
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (message.status === "sent" && message.senderId && message.senderId !== me) return message;
  }
  return null;
}

/**
 * Whether `candidate` is worth sending: never the position already sent for
 * the room, nor anything older than it.
 */
export function shouldSendReadPosition(
  candidate: ReadPosition,
  lastSent: ReadPosition | null | undefined,
): boolean {
  if (!lastSent) return true;
  if (candidate.messageId === lastSent.messageId) return false;
  return compareReadPosition(candidate, lastSent) > 0;
}

/**
 * `messages-read`: `userId` has read every message from other senders created
 * at or before `readAt`. Returns the same array when nothing changes.
 */
export function applyMessagesRead(
  messages: ChatMessageView[],
  userId: string,
  readAt: string,
): ChatMessageView[] {
  if (!userId) return messages;
  const readTime = time(readAt);
  if (!readTime) return messages;
  let changed = false;
  const next = messages.map((message) => {
    if (
      message.status !== "sent" ||
      message.senderId === userId ||
      message.readBy.includes(userId) ||
      time(message.createdAt) > readTime
    ) {
      return message;
    }
    changed = true;
    return { ...message, readBy: [...message.readBy, userId] };
  });
  return changed ? next : messages;
}

/** Readers of my message, excluding me. */
export function readersOf(message: ChatMessageView, me: string | null): string[] {
  return message.readBy.filter((id) => id && id !== me && id !== message.senderId);
}

/**
 * Tick state of one of my messages. In a direct message it is read once the
 * other person's id is in readBy; in a group, once anyone else's is.
 */
export function receiptState(
  message: ChatMessageView,
  me: string | null,
  otherParticipantId?: string | null,
): ReceiptState {
  if (message.status === "pending" || message.status === "failed") return message.status;
  if (otherParticipantId !== undefined) {
    return otherParticipantId && message.readBy.includes(otherParticipantId) ? "read" : "sent";
  }
  return readersOf(message, me).length > 0 ? "read" : "sent";
}
