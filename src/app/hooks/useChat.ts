import { useState, useEffect, useRef } from "react";
import { getChatRooms } from "../services/chat.service";
import { useAuth } from "./useAuth";
import { ChatRoom, ChatRoomType } from "@/types/chat";

interface UseChatReturn {
  chatRooms: ChatRoom[];
  isLoading: boolean;
  error: string | null;
  refreshChatRooms: () => Promise<void>;
  getFilteredChatRooms: (type?: ChatRoomType) => ChatRoom[];
  searchChatRooms: (searchTerm: string) => ChatRoom[];
}

export const useChat = (): UseChatReturn => {
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { getAccessToken } = useAuth();
  const lastFetchRef = useRef<number>(0);
  const fetchCooldownMs = 5000; // 5 seconds for REST API calls

  const fetchChatRooms = async () => {
    const now = Date.now();

    // Rate limiting for REST API calls
    if (now - lastFetchRef.current < fetchCooldownMs) {
      console.log("🔄 fetchChatRooms (REST): Rate limited, skipping request");
      return;
    }

    lastFetchRef.current = now;
    setIsLoading(true);
    setError(null);

    try {
      const token = getAccessToken();
      if (!token) {
        throw new Error("No authentication token found");
      }

      console.log("🔄 fetchChatRooms (REST): Making API request");
      const rooms = await getChatRooms(token);
      setChatRooms(rooms);
    } catch (err: any) {
      setError(err.message || "Failed to fetch chat rooms");
      console.error("Error fetching chat rooms:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshChatRooms = async () => {
    await fetchChatRooms();
  };

  const getFilteredChatRooms = (type?: ChatRoomType): ChatRoom[] => {
    if (!type) return chatRooms;
    return chatRooms.filter((room) => room.type === type);
  };

  const searchChatRooms = (searchTerm: string): ChatRoom[] => {
    if (!searchTerm.trim()) return chatRooms;

    const term = searchTerm.toLowerCase();
    return chatRooms.filter((room) => {
      // Search in room name if available
      if (room.name && room.name.toLowerCase().includes(term)) {
        return true;
      }

      // For class groups, search in class name
      if (room.type === ChatRoomType.CLASS_GROUP && room.classId) {
        // You might want to maintain a mapping of classId to class name
        return false; // Placeholder - implement based on your data structure
      }

      // For course groups, search in course name
      if (room.type === ChatRoomType.COURSE_GROUP && room.courseId) {
        // You might want to maintain a mapping of courseId to course name
        return false; // Placeholder - implement based on your data structure
      }

      return false;
    });
  };

  useEffect(() => {
    fetchChatRooms();
  }, []);

  return {
    chatRooms,
    isLoading,
    error,
    refreshChatRooms,
    getFilteredChatRooms,
    searchChatRooms,
  };
};
