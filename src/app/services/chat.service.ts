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
