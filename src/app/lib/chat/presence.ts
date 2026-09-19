interface RoomWithParticipants {
  participants: Array<{ _id?: string; userId?: string; isOnline?: boolean }>;
}

/**
 * A person came online or went offline: updates them in every room they are
 * in. Returns the same array when nobody matches or nothing changes.
 *
 * @param rooms - The room list.
 * @param userId - Who changed.
 * @param isOnline - Their new state.
 */
export function applyPresenceToRooms<T extends RoomWithParticipants>(rooms: T[], userId: string, isOnline: boolean): T[] {
  let changed = false;
  const next = rooms.map((room) => {
    const at = room.participants.findIndex((p) => p.userId === userId || p._id === userId);
    if (at === -1 || Boolean(room.participants[at].isOnline) === isOnline) return room;
    changed = true;
    const participants = room.participants.slice();
    participants[at] = { ...participants[at], isOnline };
    return { ...room, participants };
  });
  return changed ? next : rooms;
}
