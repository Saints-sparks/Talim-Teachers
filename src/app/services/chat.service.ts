/**
 * Chat REST calls (`/chat/*` and `/upload/chat-attachment`). Live messaging
 * goes over the socket (see `useRealtimeChat`); these are the calls that
 * create and manage rooms. Every function goes through the one typed client
 * and throws `ApiError`, which carries the server's user-safe message — show
 * it with `getErrorMessage()`.
 *
 * Contract: `talimBE-V2/src/modules/chat/controllers/chat.controller.ts` and
 * `dto/create-group-chat.dto.ts`, `dto/room-details.dto.ts`.
 */
import { ChatRoom } from "@/types/chat";
import { api, apiClient } from "@/lib/apiClient";

/** `CreateGroupChatDto` — the server rejects any other field. */
export interface CreateGroupChatPayload {
  type: "class_group" | "course_group";
  classId?: string;
  courseId?: string;
  termId?: string;
  participants: string[];
}

/** A chat room as `POST /chat/groups` returns it. */
export type CreatedChatRoom = ChatRoom & {
  /** The server reuses an existing class or course group and says so here. */
  reused?: boolean;
  roomId?: string;
};

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

/** `UpdateChatRoomDto` — any subset of a group's details. */
export interface UpdateChatRoomPayload {
  name?: string;
  /** `null` or `''` clears it. */
  description?: string | null;
  /** From uploadChatAttachment; `null` removes the picture. */
  avatarUrl?: string | null;
}

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
  api.post<ChatRoom>(`/chat/rooms/${encodeURIComponent(roomId)}/participants/batch`, { participantIds });

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
