/** Preview shown for a room whose last message was deleted. */
export const DELETED_PREVIEW = "This message was deleted";

interface RoomWithLast {
  _id?: string;
  roomId?: string;
  lastMessage?: { _id?: string; preview: string } | null;
}

/**
 * A message was deleted: when it is its room's last message, the room list
 * previews it as deleted. Returns the same array otherwise.
 */
export function applyDeletedToRooms<T extends RoomWithLast>(rooms: T[], roomId: string, messageId: string): T[] {
  const at = rooms.findIndex((r) => r.roomId === roomId || r._id === roomId);
  const last = at === -1 ? null : rooms[at].lastMessage;
  if (!last || last._id !== messageId || last.preview === DELETED_PREVIEW) return rooms;
  const next = rooms.slice();
  next[at] = { ...rooms[at], lastMessage: { ...last, preview: DELETED_PREVIEW } };
  return next;
}
