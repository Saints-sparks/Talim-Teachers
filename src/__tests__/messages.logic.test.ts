import {
  callHref,
  filterThreads,
  groupContacts,
  initialsFor,
  isWatchingThread,
  roomCategory,
  shouldPlayMessageSound,
  threadCounts,
  threadPreview,
  threadTime,
} from "@/hooks/messages/messages.logic";
import { FIXTURE_TEACHER_ID, makeContactsFixture, makeRoomsFixture } from "@/lib/fixtures/inbox.fixture";

const ME = FIXTURE_TEACHER_ID;
const rooms = makeRoomsFixture();
const names = (list: { displayName: string }[]) => list.map((r) => r.displayName);

describe("category chips and search", () => {
  it("filters by the room's §27 category", () => {
    expect(names(filterThreads(rooms, "all", "", ME))).toEqual(["Mrs. Adaobi Obi", "JSS2 B Mathematics", "Mr. Tunji Salami", "School office"]);
    expect(names(filterThreads(rooms, "parent", "", ME))).toEqual(["Mrs. Adaobi Obi"]);
    expect(names(filterThreads(rooms, "colleague", "", ME))).toEqual(["Mr. Tunji Salami"]);
    expect(names(filterThreads(rooms, "class_group", "", ME))).toEqual(["JSS2 B Mathematics"]);
    expect(names(filterThreads(rooms, "office", "", ME))).toEqual(["School office"]);
  });

  it("searches name, subtitle and last message within the chip, ignoring case and spaces", () => {
    expect(names(filterThreads(rooms, "all", "  CHIAMAKA ", ME))).toEqual(["Mrs. Adaobi Obi"]);
    expect(names(filterThreads(rooms, "all", "exercise 2c", ME))).toEqual(["JSS2 B Mathematics"]);
    expect(names(filterThreads(rooms, "all", "basic science", ME))).toEqual(["Mr. Tunji Salami"]);
    // "office" matches the colleague's last message, but the Parents chip still excludes it.
    expect(names(filterThreads(rooms, "all", "office", ME))).toEqual(["Mr. Tunji Salami", "School office"]);
    expect(filterThreads(rooms, "parent", "office", ME)).toEqual([]);
  });

  it("works out the category on a server that predates Round 4", () => {
    const bare = rooms.map(({ category: _c, subtitle: _s, callPhone: _p, ...room }) => room);
    expect(bare.map((room) => roomCategory(room, ME))).toEqual(["parent", "class_group", "colleague", "office"]);
    expect(roomCategory({ roomId: "x", type: "custom_group", displayName: "Staff room" }, ME)).toBe("group");
    expect(roomCategory({ roomId: "y", type: "one_to_one", displayName: "Admin", participants: [{ userId: ME }, { userId: "a", role: "school_admin" }] }, ME)).toBe("office");
    // An unknown category from the server falls back too.
    expect(roomCategory({ roomId: "z", type: "course_group", displayName: "JSS1 A Maths", category: "weird" }, ME)).toBe("class_group");
  });

  it("counts each chip", () => {
    expect(threadCounts(rooms, ME)).toEqual({ all: 4, parent: 1, colleague: 1, class_group: 1, office: 1 });
  });
});

describe("thread rows", () => {
  it("prefixes my own last message with 'You: ' and names media without text", () => {
    expect(threadPreview(rooms[0], ME)).toBe("Good morning Mr. Tinubu. Chiamaka has a dental appointment on Monday morning.");
    expect(threadPreview(rooms[1], ME)).toBe("You: Page 42. Exercise 2c starts halfway down.");
    expect(threadPreview({ lastMessage: null }, ME)).toBe("No messages yet");
    expect(threadPreview({ lastMessage: { senderId: ME, preview: "", type: "voice" } }, ME)).toBe("You: Voice note");
    expect(threadPreview({ lastMessage: { senderId: "x", preview: "", type: "image" } }, ME)).toBe("Photo");
  });

  it("shows the clock time today, the weekday this week, else the date", () => {
    const now = new Date(2026, 8, 25, 10, 0);
    expect(threadTime(new Date(2026, 8, 25, 7, 52).toISOString(), now)).toBe("7:52am");
    expect(threadTime(new Date(2026, 8, 25, 15, 5).toISOString(), now)).toBe("3:05pm");
    expect(threadTime(new Date(2026, 8, 24, 19, 2).toISOString(), now)).toBe("Thu");
    expect(threadTime(new Date(2026, 8, 18, 9, 0).toISOString(), now)).toBe("18 Sep");
    expect(threadTime(undefined, now)).toBe("");
    expect(threadTime("not a date", now)).toBe("");
  });

  it("builds initials without titles", () => {
    expect(initialsFor("Mrs. Adaobi Obi")).toBe("AO");
    expect(initialsFor("JSS2 B Mathematics")).toBe("JB");
    expect(initialsFor("")).toBe("?");
  });
});

describe("the Call rule (no in-app calls)", () => {
  it("links tel: only when the room has a callPhone", () => {
    expect(callHref("+234 806 771 2290")).toBe("tel:+2348067712290");
    expect(callHref("0806-771-2290")).toBe("tel:08067712290");
    expect(callHref(null)).toBeNull();
    expect(callHref(undefined)).toBeNull();
    expect(callHref("")).toBeNull();
    expect(callHref("n/a")).toBeNull();
  });

  it("only a parent's one-to-one room carries a callPhone in the fixtures", () => {
    expect(rooms.filter((room) => callHref(room.callPhone)).map((room) => room.displayName)).toEqual(["Mrs. Adaobi Obi"]);
  });
});

describe("the contacts picker", () => {
  const contacts = makeContactsFixture();

  it("groups Parents, Colleagues and School office in that order, keeping the server's order", () => {
    const sections = groupContacts(contacts, "");
    expect(sections.map((s) => s.title)).toEqual(["Parents", "Colleagues", "School office"]);
    expect(sections[0].contacts.every((c) => c.group === "parent")).toBe(true);
    expect(sections[1].contacts.map((c) => c.name)).toEqual(["Mrs. Funke Adebayo", "Mr. Ibrahim Musa", "Mr. Tunji Salami"]);
    expect(sections[2].contacts).toEqual([expect.objectContaining({ userId: "office", name: "School office" })]);
  });

  it("searches names and subtitles and drops empty groups", () => {
    const sections = groupContacts(contacts, "jss2 b");
    expect(sections.map((s) => s.title)).toEqual(["Parents"]);
    expect(sections[0].contacts.every((c) => c.subtitle.includes("JSS2 B"))).toBe(true);
    expect(groupContacts(contacts, "office").map((s) => s.title)).toEqual(["School office"]);
    expect(groupContacts(contacts, "nobody by this name")).toEqual([]);
  });
});

describe("the sound and banner rules", () => {
  it("skips alerts only for a conversation open in a focused window", () => {
    expect(isWatchingThread({ onMessagesPage: true, roomOpen: true, pageFocused: true })).toBe(true);
    expect(isWatchingThread({ onMessagesPage: true, roomOpen: true, pageFocused: false })).toBe(false);
    expect(isWatchingThread({ onMessagesPage: true, roomOpen: false, pageFocused: true })).toBe(false);
    expect(isWatchingThread({ onMessagesPage: false, roomOpen: true, pageFocused: true })).toBe(false);
  });

  it.each([
    [{ soundEnabled: true, pageVisible: true, inOpenThread: false, fromMe: false }, true],
    [{ soundEnabled: false, pageVisible: true, inOpenThread: false, fromMe: false }, false],
    [{ soundEnabled: true, pageVisible: false, inOpenThread: false, fromMe: false }, false],
    [{ soundEnabled: true, pageVisible: true, inOpenThread: true, fromMe: false }, false],
    [{ soundEnabled: true, pageVisible: true, inOpenThread: false, fromMe: true }, false],
  ])("%j → %s", (input, expected) => {
    expect(shouldPlayMessageSound(input)).toBe(expected);
  });
});
