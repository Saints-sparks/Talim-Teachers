/**
 * @jest-environment jsdom
 */
import {
  addChatParticipants,
  createGroupChat,
  getChatRooms,
  removeChatParticipant,
  updateChatRoom,
  uploadChatAttachment,
} from "@/app/services/chat.service";
import { apiClient } from "@/lib/apiClient";
import { sessionStore } from "@/lib/session";

const fetchMock = jest.fn();

/**
 * A JSON `fetch` response.
 *
 * @param status - HTTP status.
 * @param body - Body to serialise.
 * @returns The response.
 */
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
  sessionStore._resetForTests();
  apiClient.setAccessToken("session-token");
});

describe("chat.service", () => {
  it("creates a group through the client, with the session token and no caller-supplied one", async () => {
    fetchMock.mockResolvedValueOnce(json(201, { _id: "room1", reused: true }));

    const response = await createGroupChat({ type: "class_group", classId: "c1", termId: "t1", participants: ["u1"] }, "ignored-token");

    const [url, config] = fetchMock.mock.calls[0];
    expect(url).toBe("http://api.test/chat/groups");
    expect(config.method).toBe("POST");
    expect((config.headers as Record<string, string>).Authorization).toBe("Bearer session-token");
    expect(JSON.parse(config.body as string)).toEqual({ type: "class_group", classId: "c1", termId: "t1", participants: ["u1"] });
    expect(response).toMatchObject({ success: true, data: { _id: "room1", reused: true } });
  });

  it("raises the server's error, keyed on its code, when the caller may not create groups", async () => {
    fetchMock.mockResolvedValueOnce(json(403, { success: false, error: { code: "FORBIDDEN", message: "Only teachers can create groups" } }));

    await expect(createGroupChat({ type: "course_group", courseId: "c1", participants: [] })).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "Only teachers can create groups",
    });
  });

  it("lists rooms and treats a non-list body as no rooms", async () => {
    fetchMock.mockResolvedValueOnce(json(200, [{ _id: "r1" }])).mockResolvedValueOnce(json(200, { unexpected: true }));

    await expect(getChatRooms()).resolves.toEqual([{ _id: "r1" }]);
    await expect(getChatRooms()).resolves.toEqual([]);
  });

  it("encodes ids into the room paths and uses the verbs the API declares", async () => {
    fetchMock.mockResolvedValue(json(200, {}));

    await updateChatRoom("room/1", { name: "JSS1", description: null });
    await addChatParticipants("room1", ["u1", "u2"]);
    await removeChatParticipant("room1", "u 1");

    const calls = fetchMock.mock.calls.map(([url, config]) => [config.method, url]);
    expect(calls).toEqual([
      ["PATCH", "http://api.test/chat/rooms/room%2F1"],
      ["POST", "http://api.test/chat/rooms/room1/participants/batch"],
      ["PATCH", "http://api.test/chat/rooms/room1/participants/u%201/remove"],
    ]);
    expect(JSON.parse(fetchMock.mock.calls[1][1].body as string)).toEqual({ participantIds: ["u1", "u2"] });
  });

  describe("uploadChatAttachment", () => {
    const file = new File(["x"], "note.pdf", { type: "application/pdf" });

    it("returns the stored file whether the body is the file or wraps it in data", async () => {
      const upload = jest.spyOn(apiClient, "upload");
      upload.mockResolvedValueOnce({ url: "https://cdn/a.pdf", type: "document" });
      upload.mockResolvedValueOnce({ data: { url: "https://cdn/b.pdf", type: "document" } });

      await expect(uploadChatAttachment(file)).resolves.toMatchObject({ url: "https://cdn/a.pdf" });
      await expect(uploadChatAttachment(file)).resolves.toMatchObject({ url: "https://cdn/b.pdf" });
      expect(upload.mock.calls[0][0]).toBe("/upload/chat-attachment");
      upload.mockRestore();
    });

    it("refuses a response that carries no URL", async () => {
      const upload = jest.spyOn(apiClient, "upload").mockResolvedValue({ data: undefined });
      await expect(uploadChatAttachment(file)).rejects.toThrow(/file URL/);
      upload.mockRestore();
    });
  });
});
