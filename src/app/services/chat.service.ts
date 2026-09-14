import { API_BASE_URL } from "../lib/api/config";
import { ChatRoom } from "@/types/chat";
import { apiClient } from "../lib/api/apiClient";

// Types for chat service
export interface CreateGroupChatPayload {
  type: "class_group" | "course_group";
  classId?: string;
  courseId?: string;
  termId?: string;
  participants: string[]; // This is required by the API
}

export interface CreateGroupChatResponse {
  success: boolean;
  data: ChatRoom;
  message: string;
}

/**
 * Create a new group chat room
 * @param payload - The group chat data
 * @param token - Authentication token
 * @returns Promise<CreateGroupChatResponse>
 */
export const createGroupChat = async (
  payload: CreateGroupChatPayload,
  token: string
): Promise<CreateGroupChatResponse> => {
  try {
    if (!token) {
      throw new Error("Authentication token is required");
    }

    const response = await apiClient.post(
      `${API_BASE_URL}/chat/groups`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return {
      success: true,
      data: response.data,
      message: "Group chat created successfully",
    };
  } catch (error: any) {
    console.error("Error creating group chat:", error);
    
    const errorMessage = error.response?.data?.message || 
                        error.message || 
                        "Failed to create group chat";
    
    throw new Error(errorMessage);
  }
};

/**
 * Get all chat rooms for a user
 * @param token - Authentication token
 * @returns Promise<ChatRoom[]>
 */
export const getChatRooms = async (token: string): Promise<ChatRoom[]> => {
  try {
    if (!token) {
      throw new Error("Authentication token is required");
    }

    const response = await apiClient.get(
      `${API_BASE_URL}/chat/rooms`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return response.data || [];
  } catch (error: any) {
    console.error("Error fetching chat rooms:", error);
    throw new Error(error.response?.data?.message || "Failed to fetch chat rooms");
  }
};

/** The server's user-safe message for a failed request (403s included). */
export const chatApiErrorMessage = (error: any, fallback: string): string =>
  error?.response?.data?.error?.message ||
  error?.response?.data?.message ||
  (error?.response ? fallback : error?.message) ||
  fallback;

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

/** Uploads one file with POST /upload/chat-attachment. */
export const uploadChatAttachment = async (file: File): Promise<ChatAttachmentUpload> => {
  const form = new FormData();
  form.append("file", file);
  try {
    // No Content-Type: the browser adds the multipart boundary.
    const response = await apiClient.post(`${API_BASE_URL}/upload/chat-attachment`, form);
    const body: any = response.data;
    const result = body?.url ? body : body?.data;
    if (!result?.url) throw new Error("The upload didn't return a file URL");
    return result as ChatAttachmentUpload;
  } catch (error: any) {
    throw new Error(chatApiErrorMessage(error, "Couldn't upload the file"));
  }
};

export interface UpdateChatRoomPayload {
  name?: string;
  /** `null` or `''` clears it. */
  description?: string | null;
  /** From uploadChatAttachment; `null` removes the picture. */
  avatarUrl?: string | null;
}

/** PATCH /chat/rooms/:roomId: a group's name, description or picture. */
export const updateChatRoom = async (roomId: string, payload: UpdateChatRoomPayload) => {
  try {
    const response = await apiClient.patch(
      `${API_BASE_URL}/chat/rooms/${encodeURIComponent(roomId)}`,
      payload,
    );
    return response.data;
  } catch (error: any) {
    throw new Error(chatApiErrorMessage(error, "Couldn't update the group"));
  }
};

/** Adds users to a group. */
export const addChatParticipants = async (roomId: string, participantIds: string[]) => {
  try {
    const response = await apiClient.post(
      `${API_BASE_URL}/chat/rooms/${encodeURIComponent(roomId)}/participants/batch`,
      { participantIds },
    );
    return response.data;
  } catch (error: any) {
    throw new Error(chatApiErrorMessage(error, "Couldn't add members"));
  }
};

/** Removes a member from a group; removing yourself leaves it. */
export const removeChatParticipant = async (roomId: string, userId: string) => {
  try {
    const response = await apiClient.patch(
      `${API_BASE_URL}/chat/rooms/${encodeURIComponent(roomId)}/participants/${encodeURIComponent(userId)}/remove`,
    );
    return response.data;
  } catch (error: any) {
    throw new Error(chatApiErrorMessage(error, "Couldn't remove this member"));
  }
};
