/**
 * Chat REST calls (`/chat/*` and `/upload/chat-attachment`). Live messaging
 * goes over the socket (see `useRealtimeChat`); these are the calls that
 * create and manage rooms. Every function goes through the one typed client
 * and throws `ApiError`, which carries the server's user-safe message — show
 * it with `getErrorMessage()`.
 *
 * Contract: `talimBE-V2/src/modules/chat/controllers/chat.controller.ts` and
 * `dto/create-group-chat.dto.ts`, `dto/room-details.dto.ts`. Round 4 (§26,
 * §28, §29 of `docs/redesign-teachers-round4-inbox-settings.md`) adds the
 * contacts picker, the office inbox and shared media; with
 * `NEXT_PUBLIC_USE_FIXTURES=true` in a dev build those answer from
 * `src/lib/fixtures/inbox.fixture.ts`.
 */
import { ChatRoom } from "@/types/chat";
import type { components } from "@/types/api";
import { api, apiClient } from "@/lib/apiClient";
import type { AddChatParticipantsBody, CreateChatRoomBody, CreateGroupChatBody, UpdateChatRoomBody } from "@/types/apiPayloads";
import { fixturesEnabled } from "@/lib/fixtures/flag";
import type { ChatContact, OfficeRoom, SharedMediaKind, SharedMediaPage } from "@/types/inboxSettings";

/**
 * `CreateGroupChatDto` from the generated contract — the server rejects any
 * other field. Teachers only create class and course groups, and always name
 * the participants, so those two fields are narrower than the DTO's.
 */
export type CreateGroupChatPayload = Omit<CreateGroupChatBody, "type" | "participants"> & {
  type: Extract<CreateGroupChatBody["type"], "class_group" | "course_group">;
  participants: string[];
};

/**
 * A chat room as `POST /chat/groups` returns it (`ChatRoomResponseDto`). The
 * server reuses an existing class or course group and says so in `reused`.
 */
export type CreatedChatRoom = components["schemas"]["ChatRoomResponseDto"];

/** `POST /chat/rooms`: the room in the viewer's room-view shape, with `reused` when it already existed. */
export type CreatedDirectRoom = components["schemas"]["ChatRoomCreatedDto"];

/** What {@link createGroupChat} resolves with. */
export interface CreateGroupChatResponse {
  success: boolean;
  data: CreatedChatRoom;
  message: string;
}

/**
 * Creates a class or course group chat, or returns the existing one.
 *
 * @param payload - The group to create.
 * @param _token - Ignored; the client holds the session token.
 * @returns The room the server created or reused.
 * @throws ApiError when the server rejects the payload or the caller may not create groups.
 */
export const createGroupChat = async (
  payload: CreateGroupChatPayload,
  _token?: string | null,
): Promise<CreateGroupChatResponse> => {
  const room = await api.post<CreatedChatRoom>("/chat/groups", payload);
  return { success: true, data: room, message: "Group chat created successfully" };
};

/**
 * Lists the signed-in user's chat rooms.
 *
 * @param _token - Ignored; the client holds the session token.
 * @returns The rooms, newest activity first.
 * @throws ApiError when the request fails.
 */
export const getChatRooms = async (_token?: string | null): Promise<ChatRoom[]> => {
  const rooms = await api.get<ChatRoom[]>("/chat/rooms");
  return Array.isArray(rooms) ? rooms : [];
};

/** A file stored by `POST /upload/chat-attachment`. */
export interface ChatAttachmentUpload {
  url: string;
  type: "image" | "audio" | "video" | "document" | "file";
  name?: string;
  mimeType?: string;
  size?: number;
  duration?: number;
  width?: number;
  height?: number;
  playbackUrl?: string;
}

/**
 * Uploads one file to `POST /upload/chat-attachment`, reporting progress when asked.
 *
 * @param file - The file to store.
 * @param onProgress - Called with a 0-1 fraction as bytes are sent.
 * @returns The stored file's URL and metadata.
 * @throws ApiError when the upload fails; Error when the response carries no URL.
 */
export const uploadChatAttachment = async (
  file: File,
  onProgress?: (fraction: number) => void,
): Promise<ChatAttachmentUpload> => {
  const form = new FormData();
  form.append("file", file);
  // No Content-Type: the browser adds the multipart boundary.
  const body = await apiClient.upload<ChatAttachmentUpload | { data?: ChatAttachmentUpload }>(
    "/upload/chat-attachment",
    form,
    onProgress,
  );
  const result = body && "url" in body ? body : body?.data;
  if (!result?.url) throw new Error("The upload didn't return a file URL");
  return result;
};

/**
 * `UpdateChatRoomDto` from the generated contract — any subset of a group's
 * details. `description` of `null` or `''` clears it; `avatarUrl` comes from
 * `uploadChatAttachment`, and `null` removes the picture.
 */
export type UpdateChatRoomPayload = UpdateChatRoomBody;

/**
 * Updates a group's name, description or picture.
 *
 * @param roomId - The group's room id.
 * @param payload - The fields to change.
 * @returns The updated room.
 * @throws ApiError with `FORBIDDEN` when the caller may not manage the group.
 */
export const updateChatRoom = async (roomId: string, payload: UpdateChatRoomPayload): Promise<ChatRoom> =>
  api.patch<ChatRoom>(`/chat/rooms/${encodeURIComponent(roomId)}`, payload);

/**
 * Adds users to a group.
 *
 * @param roomId - The group's room id.
 * @param participantIds - Ids of the users to add.
 * @returns The updated room.
 * @throws ApiError when the list is empty or the caller may not manage the group.
 */
export const addChatParticipants = async (roomId: string, participantIds: string[]): Promise<ChatRoom> =>
  api.post<ChatRoom>(`/chat/rooms/${encodeURIComponent(roomId)}/participants/batch`, {
    participantIds,
  } satisfies AddChatParticipantsBody);

/**
 * Removes a member from a group; removing yourself leaves it.
 *
 * @param roomId - The group's room id.
 * @param userId - The member to remove.
 * @returns The updated room.
 * @throws ApiError with `FORBIDDEN` when the caller may not remove that member.
 */
export const removeChatParticipant = async (roomId: string, userId: string): Promise<ChatRoom> =>
  api.patch<ChatRoom>(`/chat/rooms/${encodeURIComponent(roomId)}/participants/${encodeURIComponent(userId)}/remove`);

/**
 * Deletes a message: its sender, or whoever can manage the room. The text and
 * attachments are blanked and members get `message-deleted`.
 *
 * @param messageId - The stored message's `_id`.
 * @throws ApiError with `FORBIDDEN` when the caller may not delete it.
 */
export const deleteChatMessage = async (messageId: string): Promise<void> => {
  await api.delete(`/chat/messages/${encodeURIComponent(messageId)}`);
};

/**
 * Opens a direct conversation with another member of the school:
 * `POST /chat/rooms` with `type: "one_to_one"` and both user ids. The server
 * returns the existing room when the two already have one, so this is safe to
 * call every time "Message" is pressed.
 *
 * @param otherUserId - The person to message (e.g. a guardian's `userId`).
 * @param myUserId - The signed-in user's id (the server requires it among the participants).
 * @returns The room's id, for `/messages?room=`.
 * @throws ApiError when the other person is not in the caller's school or the room cannot be created.
 */
export const startDirectChat = async (otherUserId: string, myUserId: string): Promise<string> => {
  if (fixturesEnabled()) return `dm-${otherUserId}`;
  const body: CreateChatRoomBody = { type: "one_to_one", participants: [myUserId, otherUserId] };
  const room = await api.post<CreatedDirectRoom>("/chat/rooms", body);
  const id = room?._id || room?.roomId;
  if (!id) throw new Error("The conversation could not be opened.");
  return String(id);
};

/**
 * `GET /chat/contacts` (§26): the people the teacher can message — the
 * guardians of students in their classes (unless a parent turned teacher
 * messages off), the school's other teachers, and one "School office" entry
 * (`userId: 'office'`). Sorted by group, then name.
 *
 * @returns The contacts.
 * @throws ApiError when the request fails.
 */
export const getChatContacts = async (): Promise<ChatContact[]> => {
  if (fixturesEnabled()) {
    const { makeContactsFixture } = await import("@/lib/fixtures/inbox.fixture");
    return makeContactsFixture();
  }
  const contacts = await api.get<ChatContact[]>("/chat/contacts");
  return Array.isArray(contacts) ? contacts : [];
};

/**
 * `POST /chat/office` (§28): the teacher's own "School office" room, created
 * on first use. Every admin (and sub-admin with `manage:messages`) reads and
 * replies there.
 *
 * @returns The room's id, for `/messages?room=`.
 * @throws ApiError when the room cannot be opened; Error when the answer has no id.
 */
export const openOfficeRoom = async (): Promise<string> => {
  let room: OfficeRoom;
  if (fixturesEnabled()) {
    const { makeOfficeRoomFixture } = await import("@/lib/fixtures/inbox.fixture");
    room = makeOfficeRoomFixture();
  } else {
    room = await api.post<OfficeRoom>("/chat/office");
  }
  const id = room?._id || room?.roomId;
  if (!id) throw new Error("The school office conversation could not be opened.");
  return String(id);
};

/** The media page size the info modal asks for. */
export const ROOM_MEDIA_PAGE_SIZE = 30;

/**
 * `GET /chat/rooms/:roomId/media?kind=&cursor=&limit=` (§29): shared images,
 * videos, documents or links (URLs found in message text), newest first,
 * without deleted messages, with the total per kind. A count the server
 * leaves out (an older backend has no `video`) reads as 0.
 *
 * @param roomId - The room (participants only).
 * @param kind - Which kind to list.
 * @param cursor - `nextCursor` of the previous page.
 * @param limit - Page size.
 * @returns One page.
 * @throws ApiError when the caller is not a participant (403) or the room is another school's (404).
 */
export const getRoomMedia = async (
  roomId: string,
  kind: SharedMediaKind,
  cursor?: string | null,
  limit: number = ROOM_MEDIA_PAGE_SIZE,
): Promise<SharedMediaPage> => {
  if (fixturesEnabled()) {
    const { makeRoomMediaFixture } = await import("@/lib/fixtures/inbox.fixture");
    return makeRoomMediaFixture(roomId, kind, cursor, limit);
  }
  const page = await api.get<Partial<SharedMediaPage>>(`/chat/rooms/${encodeURIComponent(roomId)}/media`, {
    params: { kind, limit, ...(cursor ? { cursor } : {}) },
  });
  return {
    items: Array.isArray(page?.items) ? page.items : [],
    nextCursor: page?.nextCursor ?? null,
    counts: {
      image: page?.counts?.image ?? 0,
      video: page?.counts?.video ?? 0,
      document: page?.counts?.document ?? 0,
      link: page?.counts?.link ?? 0,
    },
  };
};
