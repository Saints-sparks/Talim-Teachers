/** What the sidebar's filter and search read from a room. */
interface FilterableRoom {
  type: string;
  displayName: string;
  lastMessage?: { preview: string } | null;
}

/**
 * The rooms the sidebar shows: the chosen filter first, then the search term
 * within it, so searching never brings back rooms the filter excluded.
 *
 * @param rooms - Every room.
 * @param type - "all", "teachers" (direct chats), "groups", or a room type.
 * @param term - The search text; blank means no search.
 * @returns The matching rooms, in their original order.
 */
export function filterRooms<T extends FilterableRoom>(rooms: T[], type: string | undefined, term: string): T[] {
  let result = rooms;
  if (type && type !== "all") {
    result = rooms.filter((room) => {
      if (type === "teachers") return room.type === "one_to_one";
      if (type === "groups") return room.type !== "one_to_one";
      return room.type === type;
    });
  }
  const needle = term.trim().toLowerCase();
  if (!needle) return result;
  return result.filter(
    (room) =>
      room.displayName.toLowerCase().includes(needle) ||
      Boolean(room.lastMessage?.preview.toLowerCase().includes(needle)),
  );
}
