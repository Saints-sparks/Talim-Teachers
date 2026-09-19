import { filterRooms } from "@/app/lib/chat/roomFilter";
import { applyPresenceToRooms } from "@/app/lib/chat/presence";

const rooms = [
  { type: "one_to_one", displayName: "Ada Obi", lastMessage: { preview: "See you at 8" } },
  { type: "custom_group", displayName: "JSS1 Parents", lastMessage: { preview: "Fees are due" } },
  { type: "class_group", displayName: "JSS1 A", lastMessage: null },
];

describe("filterRooms", () => {
  it("filters by kind", () => {
    expect(filterRooms(rooms, "teachers", "").map((r) => r.displayName)).toEqual(["Ada Obi"]);
    expect(filterRooms(rooms, "groups", "").map((r) => r.displayName)).toEqual(["JSS1 Parents", "JSS1 A"]);
    expect(filterRooms(rooms, "all", "")).toHaveLength(3);
  });

  it("searches within the chosen filter instead of replacing it", () => {
    // "jss1" matches both groups but the direct-chat filter must still exclude them.
    expect(filterRooms(rooms, "teachers", "jss1")).toEqual([]);
    expect(filterRooms(rooms, "groups", "jss1")).toHaveLength(2);
  });

  it("matches the last message preview too, ignoring case and spaces around the term", () => {
    expect(filterRooms(rooms, "all", "  FEES ").map((r) => r.displayName)).toEqual(["JSS1 Parents"]);
  });
});

describe("applyPresenceToRooms", () => {
  const list = [
    { participants: [{ userId: "u1", isOnline: false }, { userId: "u2", isOnline: true }] },
    { participants: [{ userId: "u1", isOnline: false }] },
  ];

  it("updates the person in every room", () => {
    const next = applyPresenceToRooms(list, "u1", true);
    expect(next[0].participants[0].isOnline).toBe(true);
    expect(next[1].participants[0].isOnline).toBe(true);
    expect(next[0].participants[1].isOnline).toBe(true);
  });

  it("returns the same list when nothing changes", () => {
    expect(applyPresenceToRooms(list, "u1", false)).toBe(list);
    expect(applyPresenceToRooms(list, "nobody", true)).toBe(list);
  });
});
