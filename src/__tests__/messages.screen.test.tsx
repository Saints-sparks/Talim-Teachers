/**
 * @jest-environment jsdom
 *
 * The redesigned Messages page against the Round 4 fixtures: chips and
 * search, the thread rows, the chat header's Call rule, the empty thread,
 * the info modal (members, media tabs with counts and Load more, the group
 * description editor for admins only, 403), the New message picker and the
 * New class group sheet, and the list's empty, loading and error states.
 */
import React from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@/test-utils/render";
import { MessagesScreen } from "@/components/messages/MessagesScreen";
import { roomStore } from "@/app/lib/chat/roomStore";
import type { RealtimeChatRoom } from "@/app/hooks/useRealtimeChat";
import type { ChatMessageView } from "@/app/lib/chat/normalizeMessage";
import * as chatService from "@/app/services/chat.service";
import { classroomService } from "@/app/services/classroom/classroom.service";
import { makeMyClassesFixture } from "@/lib/fixtures/classroom.fixture";
import { FIXTURE_NOW } from "@/lib/fixtures/today.fixture";
import { threadTime } from "@/hooks/messages/messages.logic";
import { FIXTURE_TEACHER_ID, makeContactsFixture, makeRoomMediaFixture, makeRoomsFixture } from "@/lib/fixtures/inbox.fixture";
import { ApiError } from "@/lib/apiError";
import type { User } from "@/types/auth";

const push = jest.fn();
const replace = jest.fn();
let search = "";
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace }),
  usePathname: () => "/messages",
  useSearchParams: () => new URLSearchParams(search),
}));
jest.mock("@/components/CustomToast", () => ({ toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }));
jest.mock("@/app/context/OnboardingContext", () => ({ useTeacherOnboarding: () => ({ markStepComplete: jest.fn() }) }));
jest.mock("@/app/context/AppContext", () => ({ useAppContext: () => ({ classes: [], courses: [] }) }));
jest.mock("@/hooks/academic/useCurrentTerm", () => ({ useCurrentTerm: () => ({ data: { _id: "term-1" } }) }));
jest.mock("@/app/services/classroom/classroom.service", () => ({ classroomService: { getMyClasses: jest.fn() } }));
jest.mock("@/app/services/chat.service", () => ({
  ROOM_MEDIA_PAGE_SIZE: 30,
  getChatContacts: jest.fn(),
  startDirectChat: jest.fn(),
  openOfficeRoom: jest.fn(),
  createGroupChat: jest.fn(),
  getRoomMedia: jest.fn(),
  updateChatRoom: jest.fn(),
  uploadChatAttachment: jest.fn(),
  removeChatParticipant: jest.fn(),
  addChatParticipants: jest.fn(),
}));

/** The chat provider's value, replaced per test. */
let chat: Record<string, unknown>;
jest.mock("@/app/context/ChatContext", () => ({ useChat: () => chat }));

const service = chatService as jest.Mocked<typeof chatService>;
const teacher = {
  userId: FIXTURE_TEACHER_ID,
  _id: FIXTURE_TEACHER_ID,
  role: "teacher",
  firstName: "Seyi",
  lastName: "Tinubu",
  email: "seyi@easysparks.test",
  schoolId: "school-1",
} as unknown as User;
const NOW = new Date(FIXTURE_NOW);

/**
 * The fixture rooms as the provider lists them.
 *
 * @param overrides - Per-room changes by id.
 * @returns The rooms.
 */
function rooms(overrides: Record<string, Partial<RealtimeChatRoom>> = {}): RealtimeChatRoom[] {
  return makeRoomsFixture().map((room) => ({ ...(room as unknown as RealtimeChatRoom), ...(overrides[room.roomId] ?? {}) }));
}

/**
 * A stored message for the open thread.
 *
 * @param over - Fields to change.
 * @returns The message.
 */
function message(over: Partial<ChatMessageView>): ChatMessageView {
  return {
    _id: "m1",
    roomId: "room-c2",
    senderId: "u-student-s14",
    senderName: "Daniel Ojo",
    senderAvatar: null,
    text: "Sir, is it page 42 or 44?",
    type: "text",
    attachments: [],
    readBy: [],
    createdAt: "2026-09-24T17:48:00.000Z",
    status: "sent",
    ...over,
  };
}

/**
 * Seeds the open room's thread in the store.
 *
 * @param roomId - The room.
 * @param messages - Its messages.
 */
function seedThread(roomId: string, messages: ChatMessageView[]) {
  roomStore.update(roomId, (s) => ({ ...s, messages, joinStatus: "joined", joinError: null }));
}

/**
 * Renders the screen as the signed-in fixture teacher.
 *
 * @param list - The provider's rooms.
 * @param extra - Other provider fields.
 * @returns The render result.
 */
function mount(list: RealtimeChatRoom[] = rooms(), extra: Record<string, unknown> = {}) {
  chat = {
    chatRooms: list,
    isLoading: false,
    isConnected: true,
    error: null,
    currentUserId: FIXTURE_TEACHER_ID,
    refreshChatRooms: jest.fn(),
    selectRoom: jest.fn(),
    unselectRoom: jest.fn(),
    sendMessage: jest.fn(),
    retryMessage: jest.fn(),
    deleteMessage: jest.fn(),
    deleteStoredMessage: jest.fn(),
    loadOlderMessages: jest.fn(),
    retryJoin: jest.fn(),
    setDraft: jest.fn(),
    dropRoom: jest.fn(),
    applyRoomDetails: jest.fn(),
    ...extra,
  };
  return render(<MessagesScreen now={NOW} />, { user: teacher });
}

const threadList = () => screen.getByRole("list", { name: "Conversations" });
const threadNames = () => within(threadList()).getAllByRole("button").map((b) => b.querySelector(".truncate")?.textContent);

beforeAll(() => {
  Element.prototype.scrollIntoView = jest.fn();
});

beforeEach(() => {
  jest.clearAllMocks();
  search = "";
  roomStore.reset();
  (classroomService.getMyClasses as jest.Mock).mockResolvedValue(makeMyClassesFixture());
  service.getChatContacts.mockResolvedValue(makeContactsFixture());
  service.getRoomMedia.mockImplementation(async (roomId, kind, cursor, limit) => makeRoomMediaFixture(roomId, kind, cursor, limit));
});

describe("the conversation list", () => {
  it("shows the design's header, rows and filters", () => {
    mount();
    expect(screen.getByRole("heading", { level: 1, name: "Messages" })).toBeInTheDocument();
    expect(screen.getByText("Parents, colleagues, class groups and the school office.")).toBeInTheDocument();
    expect(threadNames()).toEqual(["Mrs. Adaobi Obi", "JSS2 B Mathematics", "Mr. Tunji Salami", "School office"]);
    const [obi, group] = within(threadList()).getAllByRole("button");
    // The row times are the viewer's local time (formatting is covered in messages.logic.test).
    expect(obi).toHaveTextContent(threadTime("2026-09-25T06:52:00.000Z", NOW));
    expect(obi).toHaveTextContent("1 unread");
    expect(group).toHaveTextContent("You: Page 42. Exercise 2c starts halfway down.");
    expect(group).toHaveTextContent(threadTime("2026-09-24T18:02:00.000Z", NOW));
  });

  it("filters by category chip and searches within it", () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: /^Parents/ }));
    expect(screen.getByRole("button", { name: /^Parents/ })).toHaveAttribute("aria-pressed", "true");
    expect(threadNames()).toEqual(["Mrs. Adaobi Obi"]);
    fireEvent.click(screen.getByRole("button", { name: /^Class groups/ }));
    expect(threadNames()).toEqual(["JSS2 B Mathematics"]);
    fireEvent.click(screen.getByRole("button", { name: /^All/ }));
    fireEvent.change(screen.getByLabelText("Search conversations"), { target: { value: "salami" } });
    expect(threadNames()).toEqual(["Mr. Tunji Salami"]);
    fireEvent.click(screen.getByRole("button", { name: /^Office/ }));
    expect(screen.queryByRole("list", { name: "Conversations" })).not.toBeInTheDocument();
    expect(screen.getByText("No conversations match “salami”.")).toBeInTheDocument();
  });

  it("opens a conversation through the url", () => {
    mount();
    fireEvent.click(within(threadList()).getAllByRole("button")[2]);
    expect(push).toHaveBeenCalledWith("/messages?room=room-salami");
  });

  it("has an empty state, a loading state and an error with Retry", () => {
    const { unmount } = mount([]);
    expect(screen.getByText("No conversations yet. Start one with New message.")).toBeInTheDocument();
    expect(screen.getByText("Pick a conversation")).toBeInTheDocument();
    unmount();

    const loading = mount([], { isLoading: true });
    expect(screen.getByRole("status", { name: "Loading conversations" })).toBeInTheDocument();
    loading.unmount();

    const refreshChatRooms = jest.fn();
    mount([], { error: "Couldn't load your conversations", refreshChatRooms });
    expect(screen.getByRole("alert")).toHaveTextContent("Couldn't load your conversations");
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(refreshChatRooms).toHaveBeenCalled();
  });
});

describe("an open conversation", () => {
  it("shows the parent's subtitle and a Call link, and no voice or video call", () => {
    search = "room=room-obi";
    seedThread("room-obi", [message({ _id: "m-obi-1", roomId: "room-obi", senderId: "u-guardian-s3", senderName: "Mrs. Adaobi Obi", text: "Good morning Mr. Tinubu." })]);
    mount();
    expect(chat.selectRoom).toHaveBeenCalledWith("room-obi");
    expect(screen.getByRole("heading", { level: 2, name: "Mrs. Adaobi Obi" })).toBeInTheDocument();
    expect(screen.getByText("Parent of Chiamaka Obi · JSS1 A")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Call Mrs. Adaobi Obi" })).toHaveAttribute("href", "tel:+2348067712290");
    expect(screen.queryByRole("button", { name: /voice call|video call/i })).not.toBeInTheDocument();
    expect(screen.getByText("Good morning Mr. Tinubu.")).toBeInTheDocument();
  });

  it("has no Call link without a callPhone, and says hello in an empty thread", () => {
    search = "room=room-salami";
    seedThread("room-salami", []);
    mount();
    expect(screen.getByText("Basic Science · colleague")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /^Call/ })).not.toBeInTheDocument();
    expect(screen.getByText("No messages yet. Say hello below.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Back to conversations" })).toBeInTheDocument();
  });

  it("shows sender names in a group, my own receipts and sends from the composer", () => {
    search = "room=room-c2";
    seedThread("room-c2", [
      message({}),
      message({ _id: "m2", senderId: FIXTURE_TEACHER_ID, senderName: "Seyi Tinubu", text: "Page 42.", createdAt: "2026-09-24T18:02:00.000Z", readBy: ["u-student-s14"] }),
    ]);
    mount();
    const log = screen.getByRole("log");
    expect(within(log).getByText("Daniel Ojo")).toBeInTheDocument();
    expect(within(log).getByText("Read by 1")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Message"), { target: { value: "See you tomorrow" } });
    expect(chat.setDraft).toHaveBeenCalledWith("room-c2", "See you tomorrow");
  });
});

describe("the info modal", () => {
  /**
   * Opens a room and its info.
   *
   * @param roomId - The room.
   * @param list - The rooms.
   * @returns The dialog.
   */
  async function openInfo(roomId: string, list = rooms()) {
    search = `room=${roomId}`;
    seedThread(roomId, []);
    mount(list);
    fireEvent.click(screen.getByRole("button", { name: "Conversation info" }));
    return screen.findByRole("dialog", { name: /Conversation info/ });
  }

  it("lists Members, Images, Documents and Links with counts, and pages the media", async () => {
    const dialog = await openInfo("room-c2");
    const tabs = within(dialog).getAllByRole("tab");
    expect(tabs.map((t) => t.textContent)).toEqual(["Members2", "Images1", "Documents1", "Links1"].map((t) => expect.stringContaining(t.replace(/\d+$/, ""))));
    await waitFor(() => expect(within(dialog).getByRole("tab", { name: /Documents/ })).toHaveTextContent("Documents1"));
    expect(within(dialog).getByRole("tab", { name: /Members/ })).toHaveAttribute("aria-selected", "true");

    fireEvent.click(within(dialog).getByRole("tab", { name: /Documents/ }));
    expect(await within(dialog).findByText("Exercise 2c worked example.pdf")).toBeInTheDocument();
    expect(within(dialog).getByRole("link", { name: "Download Exercise 2c worked example.pdf" })).toHaveAttribute("href", expect.stringContaining("Exercise%202c"));
    expect(service.getRoomMedia).toHaveBeenCalledWith("room-c2", "document", null, 30);

    fireEvent.click(within(dialog).getByRole("tab", { name: /Links/ }));
    expect(await within(dialog).findByRole("link", { name: "https://www.khanacademy.org/math/pre-algebra" })).toBeInTheDocument();
  });

  it("loads more media while the server has a next page", async () => {
    service.getRoomMedia.mockImplementation(async (roomId, kind, cursor) => ({
      items: [
        { messageId: `m-${cursor ?? 0}`, kind, url: `https://files.test/${cursor ?? 0}.pdf`, name: `Notes ${cursor ?? "0"}.pdf`, mimeType: "application/pdf", size: 1024, sentAt: "2026-09-20T10:00:00Z", sender: { id: "x", name: "Seyi Tinubu" } },
      ],
      nextCursor: cursor ? null : "1",
      counts: { image: 0, document: 2, link: 0 },
    }));
    const dialog = await openInfo("room-c2");
    fireEvent.click(within(dialog).getByRole("tab", { name: /Documents/ }));
    expect(await within(dialog).findByText("Notes 0.pdf")).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Load more" }));
    expect(await within(dialog).findByText("Notes 1.pdf")).toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: "Load more" })).not.toBeInTheDocument();
  });

  it("says when nothing was shared", async () => {
    const dialog = await openInfo("room-salami");
    fireEvent.click(within(dialog).getByRole("tab", { name: /Images/ }));
    expect(await within(dialog).findByText("No images shared in this conversation yet.")).toBeInTheDocument();
  });

  it("shows a group admin the description editor and a Group admin badge, and saves within 500 characters", async () => {
    service.updateChatRoom.mockResolvedValue({} as never);
    const list = rooms({ "room-c2": { description: "Homework and reminders.", admins: [{ id: FIXTURE_TEACHER_ID, name: "Seyi Tinubu" }] } });
    const dialog = await openInfo("room-c2", list);
    expect(within(dialog).getByText("Homework and reminders.")).toBeInTheDocument();
    expect(within(dialog).getByText("Group admin")).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: "Edit" }));
    const box = within(dialog).getByRole("textbox", { name: "Description" });
    expect(box).toHaveAttribute("maxLength", "500");
    fireEvent.change(box, { target: { value: "Homework, reminders and links." } });
    expect(within(dialog).getByText("30/500")).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));
    await waitFor(() => expect(service.updateChatRoom).toHaveBeenCalledWith("room-c2", { description: "Homework, reminders and links." }));
    expect(chat.applyRoomDetails).toHaveBeenCalledWith("room-c2", { description: "Homework, reminders and links." });
  });

  it("explains a 403 and hides the editor", async () => {
    service.updateChatRoom.mockRejectedValue(ApiError.fromResponse({ status: 403 }, { message: "Forbidden", error: { code: "FORBIDDEN" } }));
    const list = rooms({ "room-c2": { description: "", admins: [{ id: FIXTURE_TEACHER_ID, name: "Seyi Tinubu" }] } });
    const dialog = await openInfo("room-c2", list);
    fireEvent.click(within(dialog).getByRole("button", { name: "Edit the group name" }));
    fireEvent.change(within(dialog).getByLabelText("Group name"), { target: { value: "JSS2 B Maths" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("Only a group admin can change the group's name, description or picture.");
    expect(within(dialog).queryByRole("button", { name: "Edit the group name" })).not.toBeInTheDocument();
  });

  it("gives a member who isn't an admin no editor", async () => {
    const list = rooms({ "room-c2": { description: "Homework and reminders.", admins: [{ id: "u-other", name: "Mrs. Funke Adebayo" }] } });
    const dialog = await openInfo("room-c2", list);
    expect(within(dialog).getByText("Homework and reminders.")).toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: "Edit the group name" })).not.toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: "Add students" })).not.toBeInTheDocument();
  });

  it("follows room-updated live: a new description and a new admin show without reopening", async () => {
    search = "room=room-c2";
    seedThread("room-c2", []);
    const view = mount(rooms({ "room-c2": { description: "Old notes.", admins: [{ id: "u-other", name: "Mrs. Funke Adebayo" }] } }));
    fireEvent.click(screen.getByRole("button", { name: "Conversation info" }));
    const dialog = await screen.findByRole("dialog", { name: /Conversation info/ });
    expect(within(dialog).getByText("Old notes.")).toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
    // The provider applies room-updated (description, admins) to its list; the screen re-renders from it.
    chat = { ...chat, chatRooms: rooms({ "room-c2": { description: "Homework is on page 42.", admins: [{ id: FIXTURE_TEACHER_ID, name: "Seyi Tinubu" }] } }) };
    view.rerender(<MessagesScreen now={NOW} />);
    expect(await within(dialog).findByText("Homework is on page 42.")).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Edit" })).toBeInTheDocument();
  });

  it("has no description editor for the office or a direct chat", async () => {
    const office = await openInfo("room-office", rooms({ "room-office": { admins: [{ id: FIXTURE_TEACHER_ID, name: "Seyi Tinubu" }] } }));
    expect(within(office).queryByText("Description")).not.toBeInTheDocument();
    expect(within(office).getByText(/The school office reads and replies here/)).toBeInTheDocument();
  });

  it("lists both people in a direct chat", async () => {
    const dialog = await openInfo("room-obi");
    const people = within(dialog).getAllByRole("listitem");
    expect(people).toHaveLength(2);
    expect(people[0]).toHaveTextContent("Mrs. Adaobi Obi");
    expect(people[0]).toHaveTextContent("Parent of Chiamaka Obi · JSS1 A");
    expect(people[1]).toHaveTextContent("Seyi Tinubu (you)");
    expect(within(dialog).queryByText("Description")).not.toBeInTheDocument();
  });

  it("closes on Escape and returns focus", async () => {
    const dialog = await openInfo("room-obi");
    act(() => {
      fireEvent.keyDown(window, { key: "Escape" });
    });
    await waitFor(() => expect(dialog).not.toBeInTheDocument());
  });
});

describe("New message", () => {
  it("groups the contacts, searches, and opens a person or the office", async () => {
    service.startDirectChat.mockResolvedValue("room-new");
    service.openOfficeRoom.mockResolvedValue("room-office");
    mount();
    fireEvent.click(screen.getAllByRole("button", { name: "New message" })[0]);
    const sheet = await screen.findByRole("dialog", { name: "New message" });
    await within(sheet).findByText("Mrs. Adaobi Obi");
    expect(within(sheet).getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual(["Parents", "Colleagues", "School office"]);

    fireEvent.change(within(sheet).getByLabelText("Search people"), { target: { value: "salami" } });
    expect(within(sheet).getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual(["Colleagues"]);
    fireEvent.click(within(sheet).getByRole("button", { name: /Mr. Tunji Salami/ }));
    await waitFor(() => expect(service.startDirectChat).toHaveBeenCalledWith("u-teacher-tunji", FIXTURE_TEACHER_ID));
    expect(push).toHaveBeenCalledWith("/messages?room=room-new");
  });

  it("opens the office inbox through POST /chat/office", async () => {
    service.openOfficeRoom.mockResolvedValue("room-office");
    mount();
    fireEvent.click(screen.getAllByRole("button", { name: "New message" })[0]);
    const sheet = await screen.findByRole("dialog", { name: "New message" });
    fireEvent.click(await within(sheet).findByRole("button", { name: /School office/ }));
    await waitFor(() => expect(service.openOfficeRoom).toHaveBeenCalled());
    expect(service.startDirectChat).not.toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith("/messages?room=room-office");
  });

  it("shows an error with Try again when the contacts fail", async () => {
    service.getChatContacts.mockRejectedValue(new Error("Network error"));
    mount();
    fireEvent.click(screen.getAllByRole("button", { name: "New message" })[0]);
    const sheet = await screen.findByRole("dialog", { name: "New message" });
    expect(await within(sheet).findByRole("alert")).toHaveTextContent("We couldn't load your contacts.");
  });
});

describe("New class group", () => {
  it("names the group, picks a class and creates it through the class_group flow", async () => {
    service.createGroupChat.mockResolvedValue({ success: true, data: { _id: "room-c1", reused: false } as never, message: "" });
    mount();
    fireEvent.click(screen.getByRole("button", { name: "New class group" }));
    const sheet = await screen.findByRole("dialog", { name: "New class group" });
    expect(within(sheet).getByText("Everyone in the class is added. Students can reply; parents are not included.")).toBeInTheDocument();
    const create = within(sheet).getByRole("button", { name: "Create group" });
    expect(create).toBeDisabled();
    await within(sheet).findByRole("button", { name: "JSS1 A" });
    fireEvent.click(within(sheet).getByRole("button", { name: "JSS2 B" }));
    expect(within(sheet).getByText("10 students will be added.")).toBeInTheDocument();
    fireEvent.change(within(sheet).getByLabelText("Group name"), { target: { value: "JSS2 B Mathematics" } });
    fireEvent.click(create);
    await waitFor(() =>
      expect(service.createGroupChat).toHaveBeenCalledWith({ type: "class_group", classId: "c2", participants: [FIXTURE_TEACHER_ID], termId: "term-1", name: "JSS2 B Mathematics" }),
    );
    expect(push).toHaveBeenCalledWith("/messages?room=room-c1");
  });
});
