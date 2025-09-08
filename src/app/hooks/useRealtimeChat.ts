"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ChatRoomData, ChatMessage, ChatRoomsUpdateData } from "./useWebSocket";
import { useWebSocketContext } from "../contexts/WebSocketContext";
import { useAuth } from "./useAuth";
import { toast } from "react-hot-toast";

export interface RealtimeChatRoom extends ChatRoomData {
  displayName: string;
  avatarInfo: {
    type: "image" | "initials";
    value: string;
    bgColor?: string;
  };
  isOnline?: boolean;
  lastSeen?: Date;
}

interface UseRealtimeChatReturn {
  chatRooms: RealtimeChatRoom[];
  isLoading: boolean;
  isConnected: boolean;
  error: string | null;

  // Chat room operations
  refreshChatRooms: () => void;
  searchChatRooms: (searchTerm: string) => RealtimeChatRoom[];
  getFilteredChatRooms: (type?: string) => RealtimeChatRoom[];

  // Room selection and management
  selectedRoomId: string | null;
  selectRoom: (roomId: string) => void;
  unselectRoom: () => void;

  // Message operations
  sendMessage: (
    content: string,
    type?: "text" | "voice",
    duration?: number
  ) => void;
  markAsRead: (messageId: string) => void;

  // Real-time events
  onNewMessage: (callback: (message: ChatMessage) => void) => () => void;
  onRoomUpdate: (
    callback: (roomId: string, room: RealtimeChatRoom) => void
  ) => () => void;
}

export const useRealtimeChat = (): UseRealtimeChatReturn => {
  const [chatRooms, setChatRooms] = useState<RealtimeChatRoom[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  const { user } = useAuth();

  // Get WebSocket context with error handling
  let webSocketContext;
  try {
    webSocketContext = useWebSocketContext();
  } catch (error) {
    // Return a default state if context is not available
    return {
      chatRooms: [],
      isLoading: false,
      isConnected: false,
      error: "WebSocket not available",
      refreshChatRooms: () => {},
      searchChatRooms: () => [],
      getFilteredChatRooms: () => [],
      selectedRoomId: null,
      selectRoom: () => {},
      unselectRoom: () => {},
      sendMessage: () => {},
      markAsRead: () => {},
      onNewMessage: () => () => {},
      onRoomUpdate: () => () => {},
    };
  }

  const {
    socket,
    isConnected,
    connectionStatus,
    fetchChatRooms,
    onChatRoomsUpdate,
    onChatMessage,
    sendChatMessage,
    joinChatRoom,
    leaveChatRoom,
    markMessageAsRead,
  } = webSocketContext;

  const searchTermRef = useRef<string>("");
  const mountedRef = useRef(true);

  // Initial chat rooms fetch when connected
  useEffect(() => {
    const userId = user?.userId || user?._id;

    if (isConnected && userId && socket?.connected) {
      setIsLoading(true);
      setError(null);

      // Fetch chat rooms only once
      fetchChatRooms();
    } else {
      setIsLoading(false);
    }
  }, [isConnected, user?.userId, user?._id, socket?.connected, fetchChatRooms]);

  // Transform chat room data for better UX
  const transformChatRoom = useCallback(
    (room: ChatRoomData): RealtimeChatRoom => {
      let displayName = room.name || "Chat Room";
      let avatarInfo: RealtimeChatRoom["avatarInfo"] = {
        type: "initials",
        value: "CR",
        bgColor: generateColorFromString(room.roomId),
      };
      let isOnline = false;

      // Handle different room types
      switch (room.type) {
        case "one_to_one": {
          const currentUserId = user?.userId || user?._id;
          const otherParticipant = room.participants.find(
            (p) => p.userId !== currentUserId
          );
          if (otherParticipant) {
            displayName =
              `${otherParticipant.firstName || ""} ${
                otherParticipant.lastName || ""
              }`.trim() || "User";
            isOnline = otherParticipant.isOnline;

            if (otherParticipant.userAvatar) {
              avatarInfo = {
                type: "image",
                value: otherParticipant.userAvatar,
              };
            } else {
              const initials =
                `${otherParticipant.firstName?.[0] || ""}${
                  otherParticipant.lastName?.[0] || ""
                }` || "U";
              avatarInfo = {
                type: "initials",
                value: initials.toUpperCase(),
                bgColor: generateColorFromString(otherParticipant.userId),
              };
            }
          }
          break;
        }
        case "class_group": {
          displayName = room.name || `Class Group`;
          const initials = displayName
            .split(" ")
            .map((word) => word[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
          avatarInfo = {
            type: "initials",
            value: initials,
            bgColor: generateColorFromString(room.roomId),
          };
          break;
        }
        case "course_group": {
          displayName = room.name || `Course Group`;
          const initials = displayName
            .split(" ")
            .map((word) => word[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
          avatarInfo = {
            type: "initials",
            value: initials,
            bgColor: generateColorFromString(room.roomId),
          };
          break;
        }
      }

      // Transform lastMessage to match expected format
      let transformedLastMessage = room.lastMessage;
      if (room.lastMessage && (room.lastMessage as any).text) {
        // Backend sends 'text' field instead of 'content'
        transformedLastMessage = {
          ...room.lastMessage,
          content: (room.lastMessage as any).text || room.lastMessage.content,
          timestamp:
            room.lastMessage.timestamp || (room.lastMessage as any).createdAt,
          senderId:
            room.lastMessage.senderId || (room.lastMessage as any).senderId,
          senderName: room.lastMessage.senderName || "Unknown",
          type: room.lastMessage.type || "text",
        };
      }

      return {
        ...room,
        displayName,
        avatarInfo,
        isOnline,
        lastMessage: transformedLastMessage,
      };
    },
    [user?.userId, user?._id]
  );

  // Handle real-time chat rooms updates
  useEffect(() => {
    if (!isConnected) return;

    const unsubscribe = onChatRoomsUpdate((data: ChatRoomsUpdateData) => {
      if (!mountedRef.current) return;

      console.log("📨 Chat rooms data received:", {
        roomsCount: data?.rooms?.length || 0,
        firstRoom: data?.rooms?.[0],
        firstRoomLastMessage: data?.rooms?.[0]?.lastMessage,
      });

      if (!data || !data.rooms || !Array.isArray(data.rooms)) {
        console.log("⚠️ Invalid chat rooms data format:", data);
        setError("Invalid chat rooms data received");
        setIsLoading(false);
        return;
      }

      const transformedRooms = data.rooms.map(transformChatRoom);

      console.log("📝 Transformed rooms:", {
        count: transformedRooms.length,
        firstRoomData: transformedRooms[0],
        hasLastMessage: !!transformedRooms[0]?.lastMessage,
      });

      // Sort rooms by last message time (newest first)
      transformedRooms.sort((a, b) => {
        const timeA = a.lastMessage?.timestamp
          ? new Date(a.lastMessage.timestamp).getTime()
          : new Date(a.updatedAt).getTime();
        const timeB = b.lastMessage?.timestamp
          ? new Date(b.lastMessage.timestamp).getTime()
          : new Date(b.updatedAt).getTime();
        return timeB - timeA;
      });

      setChatRooms(transformedRooms);
      setIsLoading(false);
      setError(null);
    });

    return unsubscribe;
  }, [isConnected, onChatRoomsUpdate, transformChatRoom]);

  // Handle real-time messages
  useEffect(() => {
    if (!isConnected) return;

    const unsubscribe = onChatMessage((message: ChatMessage) => {
      if (!mountedRef.current) return;

      console.log("📨 Real-time message received:", {
        roomId: message.roomId,
        senderId: message.senderId,
        content: message.content,
        timestamp: message.timestamp,
      });

      // Show notification for messages not from current user
      if (message.senderId !== (user?.userId || user?._id)) {
        toast.success(`New message from ${message.senderName}`, {
          duration: 3000,
          position: "top-right",
        });
      }

      // Update chat rooms to reflect new message
      setChatRooms((prevRooms) => {
        console.log("🔄 Updating chat rooms with new message...");

        const updatedRooms = prevRooms.map((room) => {
          if (room.roomId === message.roomId) {
            console.log(
              "✅ Found matching room, updating last message:",
              room.displayName
            );
            return {
              ...room,
              lastMessage: {
                content: message.content,
                senderId: message.senderId,
                senderName: message.senderName || "Unknown",
                timestamp: message.timestamp,
                type: message.type,
              },
              updatedAt: message.timestamp,
              // Increment unread count if message is not from current user
              unreadCount:
                message.senderId !== (user?.userId || user?._id)
                  ? (room.unreadCount || 0) + 1
                  : room.unreadCount,
            };
          }
          return room;
        });

        // Re-sort rooms by last message time
        const sortedRooms = updatedRooms.sort((a, b) => {
          const timeA = a.lastMessage?.timestamp
            ? new Date(a.lastMessage.timestamp).getTime()
            : new Date(a.updatedAt).getTime();
          const timeB = b.lastMessage?.timestamp
            ? new Date(b.lastMessage.timestamp).getTime()
            : new Date(b.updatedAt).getTime();
          return timeB - timeA;
        });

        console.log(
          "📝 Chat rooms updated, new order:",
          sortedRooms.map((r) => ({
            name: r.displayName,
            lastMsg: r.lastMessage?.content,
          }))
        );
        return sortedRooms;
      });
    });

    return unsubscribe;
  }, [isConnected, onChatMessage, user?.userId, user?._id]);

  // Chat room operations
  const refreshChatRooms = useCallback(() => {
    console.log("🔄 Manual refresh triggered");
    if (isConnected) {
      setIsLoading(true);
      fetchChatRooms();
    }
  }, [isConnected, fetchChatRooms]);

  const searchChatRooms = useCallback(
    (searchTerm: string): RealtimeChatRoom[] => {
      searchTermRef.current = searchTerm;

      if (!searchTerm.trim()) {
        return chatRooms;
      }

      const term = searchTerm.toLowerCase();
      return chatRooms.filter(
        (room) =>
          room.displayName.toLowerCase().includes(term) ||
          room.lastMessage?.content.toLowerCase().includes(term)
      );
    },
    [chatRooms]
  );

  const getFilteredChatRooms = useCallback(
    (type?: string): RealtimeChatRoom[] => {
      if (!type || type === "all") return chatRooms;

      switch (type) {
        case "teachers":
          return chatRooms.filter((room) => room.type === "one_to_one");
        case "groups":
          return chatRooms.filter(
            (room) =>
              room.type === "class_group" || room.type === "course_group"
          );
        default:
          return chatRooms.filter((room) => room.type === type);
      }
    },
    [chatRooms]
  );

  // Room selection
  const selectRoom = useCallback(
    (roomId: string) => {
      // Leave previous room if any
      if (selectedRoomId && selectedRoomId !== roomId) {
        leaveChatRoom(selectedRoomId);
      }

      // Join new room
      joinChatRoom(roomId);
      setSelectedRoomId(roomId);

      // Mark room as having no unread messages
      setChatRooms((prevRooms) =>
        prevRooms.map((room) =>
          room.roomId === roomId ? { ...room, unreadCount: 0 } : room
        )
      );
    },
    [selectedRoomId, joinChatRoom, leaveChatRoom]
  );

  const unselectRoom = useCallback(() => {
    if (selectedRoomId) {
      leaveChatRoom(selectedRoomId);
      setSelectedRoomId(null);
    }
  }, [selectedRoomId, leaveChatRoom]);

  // Message operations
  const sendMessage = useCallback(
    (content: string, type: "text" | "voice" = "text", duration?: number) => {
      if (!selectedRoomId || !user) {
        toast.error("Please select a chat room first");
        return;
      }

      if (!content.trim()) {
        toast.error("Message cannot be empty");
        return;
      }

      const messageData = {
        content: content.trim(),
        roomId: selectedRoomId,
        senderName:
          `${user.firstName || ""} ${user.lastName || ""}`.trim() || "You",
        type,
        ...(duration && { duration }),
      };

      sendChatMessage(messageData);
    },
    [selectedRoomId, user, sendChatMessage]
  );

  const markAsRead = useCallback(
    (messageId: string) => {
      markMessageAsRead(messageId);
    },
    [markMessageAsRead]
  );

  // Event handlers for external use
  const onNewMessage = useCallback(
    (callback: (message: ChatMessage) => void) => {
      return onChatMessage(callback);
    },
    [onChatMessage]
  );

  const onRoomUpdate = useCallback(
    (callback: (roomId: string, room: RealtimeChatRoom) => void) => {
      // This can be enhanced to provide more granular room updates
      return () => {};
    },
    []
  );

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      if (selectedRoomId) {
        leaveChatRoom(selectedRoomId);
      }
    };
  }, [selectedRoomId, leaveChatRoom]);

  return {
    chatRooms,
    isLoading,
    isConnected,
    error,

    // Chat room operations
    refreshChatRooms,
    searchChatRooms,
    getFilteredChatRooms,

    // Room selection and management
    selectedRoomId,
    selectRoom,
    unselectRoom,

    // Message operations
    sendMessage,
    markAsRead,

    // Real-time events
    onNewMessage,
    onRoomUpdate,
  };
};

// Utility function to generate consistent colors from strings
function generateColorFromString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 70%, 50%)`;
}
