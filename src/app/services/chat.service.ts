import axios from "axios";
import { API_BASE_URL } from "../lib/api/config";
import { ChatRoom, ChatMessage, ChatRoomType, SendMessagePayload } from "@/types/chat";

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

    const response = await axios.post(
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

    const response = await axios.get(
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

/**
 * Search chat rooms with optional filters
 * @param token - Authentication token
 * @param searchTerm - Search term (optional)
 * @param type - Chat room type filter (optional)
 * @returns Promise<ChatRoom[]>
 */
export const searchChatRooms = async (
  token: string,
  searchTerm?: string,
  type?: ChatRoomType
): Promise<ChatRoom[]> => {
  try {
    if (!token) {
      throw new Error("Authentication token is required");
    }

    const params: any = {};
    if (searchTerm) params.searchTerm = searchTerm;
    if (type) params.type = type;

    const response = await axios.get(
      `${API_BASE_URL}/chat/rooms/search`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params,
      }
    );

    return response.data || [];
  } catch (error: any) {
    console.error("Error searching chat rooms:", error);
    throw new Error(error.response?.data?.message || "Failed to search chat rooms");
  }
};

/**
 * Get messages for a specific chat room
 * @param roomId - Chat room ID
 * @param token - Authentication token
 * @param page - Page number for pagination
 * @param limit - Number of messages per page
 * @returns Promise<any>
 */
export const getChatMessages = async (
  roomId: string,
  token: string,
  page: number = 1,
  limit: number = 50
): Promise<any> => {
  try {
    if (!token) {
      throw new Error("Authentication token is required");
    }

    const response = await axios.get(
      `${API_BASE_URL}/chat/rooms/${roomId}/messages`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params: {
          page,
          limit,
        },
      }
    );

    return response.data;
  } catch (error: any) {
    console.error("Error fetching chat messages:", error);
    throw new Error(error.response?.data?.message || "Failed to fetch messages");
  }
};

/**
 * Send a message to a chat room
 * @param roomId - Chat room ID
 * @param message - Message content
 * @param token - Authentication token
 * @returns Promise<any>
 */
export const sendMessage = async (
  roomId: string,
  message: string,
  token: string
): Promise<any> => {
  try {
    if (!token) {
      throw new Error("Authentication token is required");
    }

    const response = await axios.post(
      `${API_BASE_URL}/chat/rooms/${roomId}/messages`,
      { content: message },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data;
  } catch (error: any) {
    console.error("Error sending message:", error);
    throw new Error(error.response?.data?.message || "Failed to send message");
  }
};
