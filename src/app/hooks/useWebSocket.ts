"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { toast } from "@/components/CustomToast";
import { API_BASE_URL } from "../lib/api/config";

// WebSocket connection configuration - Socket.IO can handle HTTP/HTTPS URLs directly
const WEBSOCKET_URL = API_BASE_URL;

/**
 * Rate limiting and request deduplication features:
 * - Prevents multiple fetchChatRooms calls within 2 seconds
 * - Deduplicates simultaneous fetch requests
 * - Removes automatic chat room fetching on connection
 * - Adds proper logging for debugging
 */

// Event types that match the backend gateway
export interface ChatMessage {
  _id: string;
  senderId: string;
  content: string;
  roomId: string;
  senderName: string;
  type: "text" | "voice";
  duration?: number;
  timestamp: Date;
  readBy: string[];
}

export interface NotificationData {
  _id: string;
  userId: string;
  title: string;
  body: string;
  type: string;
  data?: Record<string, any>;
  sender?: {
    id: string;
    name: string;
  };
  createdAt: Date;
  read: boolean;
}

export interface ChatRoomData {
  roomId: string;
  name: string;
  type: string;
  participants: Array<{
    _id: string;
    userId: string;
    firstName?: string;
    lastName?: string;
    role?: string;
    userAvatar?: string | null;
    isActive?: boolean;
    isOnline: boolean;
  }>;
  lastMessage?: {
    content: string;
    senderId: string;
    senderName: string;
    timestamp: Date;
    type: string;
  };
  unreadCount: number;
  updatedAt: Date;
  classId?: string;
  courseId?: string;
}

export interface ChatRoomsUpdateData {
  rooms: ChatRoomData[];
  totalRooms: number;
}

export interface ChatRoomJoinedData {
  roomId: string;
  roomName: string;
  roomType: string;
  participants: Array<{
    _id: string;
    userId: string;
    firstName?: string;
    lastName?: string;
    role?: string;
    userAvatar?: string | null;
    isActive?: boolean;
    isOnline: boolean;
  }>;
  messages: ChatMessage[];
  hasMore: boolean;
  nextCursor?: string;
  totalParticipants: number;
}

export interface FetchMessagesData {
  roomId: string;
  messages: ChatMessage[];
  hasMore: boolean;
  nextCursor?: string;
  direction: "before" | "after";
}

export interface WebSocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  connectionStatus: "disconnected" | "connecting" | "connected" | "error";

  // Chat functions
  joinChatRoom: (roomId: string) => void;
  leaveChatRoom: (roomId: string) => void;
  sendChatMessage: (
    message: Omit<ChatMessage, "_id" | "senderId" | "timestamp" | "readBy">,
  ) => void;
  markMessageAsRead: (messageId: string) => void;
  fetchChatRooms: () => void;
  fetchMessages: (data: {
    roomId: string;
    cursor?: string;
    direction?: "before" | "after";
    limit?: number;
  }) => void;

  // Event listeners
  onChatMessage: (callback: (message: ChatMessage) => void) => () => void;
  onNotification: (
    callback: (notification: NotificationData) => void,
  ) => () => void;
  onChatRoomHistory: (
    callback: (data: { roomId: string; messages: any[] }) => void,
  ) => () => void;
  onChatRoomsUpdate: (
    callback: (data: ChatRoomsUpdateData) => void,
  ) => () => void;
  onChatRoomJoined: (
    callback: (data: ChatRoomJoinedData) => void,
  ) => () => void;
  onMessagesUpdate: (callback: (data: FetchMessagesData) => void) => () => void;
  onUnreadMessagesUpdate: (callback: (data: { userId: string; unreadCount: number }) => void) => () => void;

  // Connection management
  connect: (userId: string) => void;
  disconnect: () => void;
  reconnect: () => void;
}

export const useWebSocket = (): WebSocketContextType => {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<
    "disconnected" | "connecting" | "connected" | "error"
  >("disconnected");
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const userIdRef = useRef<string | null>(null);
  const lastFetchTimeRef = useRef<number>(0);
  const fetchCooldownMs = 2000; // 2 seconds cooldown between fetches
  const isFetchingRef = useRef<boolean>(false);
  const reconnectAttemptsRef = useRef<number>(0);
  const maxReconnectAttempts = 3;
  const connectionFailureCountRef = useRef<number>(0);
  const maxToastFailures = 2;
  const lastDisconnectToastAtRef = useRef<number>(0);
  const disconnectToastCooldownMs = 10000;

  // Debug state changes
  useEffect(() => {
    // Removed debug logging for production
  }, [isConnected, connectionStatus]);

  // Connect to WebSocket
  const connect = useCallback((userId: string) => {
    // Prevent multiple connections
    if (socketRef.current?.connected) {
      return;
    }

    // Prevent multiple connection attempts while connecting
    if (connectionStatus === "connecting") {
      return;
    }

    setConnectionStatus("connecting");
    userIdRef.current = userId;

    try {
      const socket = io(WEBSOCKET_URL, {
        query: { userId },
        transports: ["websocket", "polling"],
        timeout: 20000,
        reconnection: false, // Disable automatic reconnection, we'll handle it manually
        reconnectionDelay: 1000,
        reconnectionAttempts: 0, // Disable built-in attempts
      });

      // Connection successful
      socket.on("connect", () => {
        setIsConnected(true);
        setConnectionStatus("connected");

        // Reset retry counters on successful connection
        reconnectAttemptsRef.current = 0;
        connectionFailureCountRef.current = 0;

        // Clear any pending reconnection attempts
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      });

      // Connection failed
      socket.on("connect_error", (error) => {
        setIsConnected(false);
        setConnectionStatus("error");

        connectionFailureCountRef.current += 1;

        // Only show toast for first few failures to avoid spam
        if (connectionFailureCountRef.current <= maxToastFailures) {
          toast.error("Failed to connect to real-time services");
        }
      });

      // Disconnection
      socket.on("disconnect", (reason) => {
        setIsConnected(false);
        setConnectionStatus("disconnected");

        // Don't show toast for intentional disconnections
        if (reason !== "io client disconnect") {
          const now = Date.now();
          const shouldShowDisconnectToast =
            now - lastDisconnectToastAtRef.current > disconnectToastCooldownMs;

          // Only show connection lost toast for first few failures and with cooldown
          if (
            connectionFailureCountRef.current <= maxToastFailures &&
            shouldShowDisconnectToast
          ) {
            toast.error("Connection lost");
            lastDisconnectToastAtRef.current = now;
          }

          // Attempt to reconnect after a delay, but limit attempts
          if (
            userIdRef.current &&
            reason !== "io server disconnect" &&
            reconnectAttemptsRef.current < maxReconnectAttempts
          ) {
            reconnectAttemptsRef.current += 1;
            const delay = Math.min(
              3000 * Math.pow(2, reconnectAttemptsRef.current - 1),
              30000,
            ); // Exponential backoff, max 30 seconds

            reconnectTimeoutRef.current = setTimeout(() => {
              reconnect();
            }, delay);
          }
        }
      });

      // Error handling
      socket.on("error", (error) => {
        toast.error("WebSocket error occurred");
      });

      // Reconnection events
      socket.on("reconnect", (attemptNumber) => {
        // Silent success: avoid noisy "connected" toasts
      });

      socket.on("reconnect_error", (error) => {
        // Silent error handling
      });

      socket.on("reconnect_failed", () => {
        // Only show final failure toast if we haven't exceeded toast limit
        if (connectionFailureCountRef.current <= maxToastFailures) {
          toast.error("Unable to reconnect. Please refresh the page.");
        }
        setConnectionStatus("error");
      });

      socketRef.current = socket;
    } catch (error) {
      setConnectionStatus("error");
      toast.error("Failed to initialize WebSocket connection");
    }
  }, []);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    setIsConnected(false);
    setConnectionStatus("disconnected");
    userIdRef.current = null;

    // Reset counters on manual disconnect
    reconnectAttemptsRef.current = 0;
    connectionFailureCountRef.current = 0;
  }, []);

  // Reconnect to WebSocket
  const reconnect = useCallback(() => {
    if (userIdRef.current) {
      disconnect();
      setTimeout(() => {
        connect(userIdRef.current!);
      }, 1000);
    }
  }, []);

  // Chat functions
  const joinChatRoom = useCallback((roomId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("join-chat-room", { roomId });
    } else {
      toast.error("Not connected to chat service");
    }
  }, []);

  const leaveChatRoom = useCallback((roomId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("leave-chat-room", { roomId });
    }
  }, []);

  const sendChatMessage = useCallback(
    (
      message: Omit<ChatMessage, "_id" | "senderId" | "timestamp" | "readBy">,
    ) => {
      if (socketRef.current?.connected) {
        socketRef.current.emit("send-chat-message", message);
      } else {
        toast.error("Not connected to chat service");
      }
    },
    [],
  );

  const markMessageAsRead = useCallback((messageId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("mark-message-read", { messageId });
    }
  }, []);

  const fetchChatRooms = useCallback(() => {
    if (!socketRef.current?.connected) {
      toast.error("Not connected to chat service");
      return;
    }

    const now = Date.now();

    // Prevent duplicate requests if already fetching
    if (isFetchingRef.current) {
     
      return;
    }

    // Rate limiting: prevent requests too close together
    if (now - lastFetchTimeRef.current < fetchCooldownMs) {
     
      return;
    }

    isFetchingRef.current = true;
    lastFetchTimeRef.current = now;

   
    socketRef.current.emit("fetch-chat-rooms");

    // Reset fetching flag after a short delay
    setTimeout(() => {
      isFetchingRef.current = false;
    }, 1000);
  }, []);

  const fetchMessages = useCallback(
    (data: {
      roomId: string;
      cursor?: string;
      direction?: "before" | "after";
      limit?: number;
    }) => {
      if (socketRef.current?.connected) {
        socketRef.current.emit("fetch-messages", data);
      } else {
        toast.error("Not connected to chat service");
      }
    },
    [],
  );

  // Event listeners
  const onChatMessage = useCallback(
    (callback: (message: ChatMessage) => void) => {
      if (!socketRef.current) return () => {};

      socketRef.current.on("chat-message", callback);
      return () => {
        socketRef.current?.off("chat-message", callback);
      };
    },
    [],
  );

  const onNotification = useCallback(
    (callback: (notification: NotificationData) => void) => {
      if (!socketRef.current) return () => {};

      socketRef.current.on("notification", (notification: NotificationData) => {
        // Show toast notification
        toast.success(`${notification.title}: ${notification.body}`, {
          duration: 4000,
          position: "top-right",
        });

        callback(notification);
      });

      return () => {
        socketRef.current?.off("notification", callback);
      };
    },
    [],
  );

  const onChatRoomHistory = useCallback(
    (callback: (data: { roomId: string; messages: ChatMessage[] }) => void) => {
      if (!socketRef.current) return () => {};

      socketRef.current.on("chat-room-history", callback);
      return () => {
        socketRef.current?.off("chat-room-history", callback);
      };
    },
    [],
  );

  const onChatRoomsUpdate = useCallback(
    (callback: (data: ChatRoomsUpdateData) => void) => {
      if (!socketRef.current) return () => {};

      socketRef.current.on("chat-rooms-update", (data: ChatRoomsUpdateData) => {
        // Reset fetching flag when we receive chat rooms
        isFetchingRef.current = false;
        callback(data);
      });

      return () => {
        socketRef.current?.off("chat-rooms-update", callback);
      };
    },
    [],
  );

  const onChatRoomJoined = useCallback(
    (callback: (data: ChatRoomJoinedData) => void) => {
      if (!socketRef.current) return () => {};

      socketRef.current.on("chat-room-joined", (data: ChatRoomJoinedData) => {
        callback(data);
      });

      return () => {
        socketRef.current?.off("chat-room-joined", callback);
      };
    },
    [],
  );

  const onMessagesUpdate = useCallback(
    (callback: (data: FetchMessagesData) => void) => {
      if (!socketRef.current) return () => {};

      socketRef.current.on("messages-fetched", (data: FetchMessagesData) => {
        callback(data);
      });

      return () => {
        socketRef.current?.off("messages-fetched", callback);
      };
    },
    [],
  );

  const onUnreadMessagesUpdate = useCallback(
    (callback: (data: { userId: string; unreadCount: number }) => void) => {
      if (!socketRef.current) return () => {};

      socketRef.current.on("unread-messages-update", callback);
      return () => {
        socketRef.current?.off("unread-messages-update", callback);
      };
    },
    [],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    socket: socketRef.current,
    isConnected,
    connectionStatus,

    // Chat functions
    joinChatRoom,
    leaveChatRoom,
    sendChatMessage,
    markMessageAsRead,
    fetchChatRooms,
    fetchMessages,

    // Event listeners
    onChatMessage,
    onNotification,
    onChatRoomHistory,
    onChatRoomsUpdate,
    onChatRoomJoined,
    onMessagesUpdate,
    onUnreadMessagesUpdate,

    // Connection management
    connect,
    disconnect,
    reconnect,
  };
};
