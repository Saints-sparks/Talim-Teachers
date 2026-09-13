"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import nookies from "nookies";
import { io, Socket } from "socket.io-client";
import { API_BASE_URL } from "../lib/api/config";
import { refreshAccessToken } from "../lib/api/apiClient";

// WebSocket connection configuration - Socket.IO can handle HTTP/HTTPS URLs directly
const WEBSOCKET_URL = API_BASE_URL;

/** How long an emit waits for the server's acknowledgement. */
export const ACK_TIMEOUT_MS = 10000;

/**
 * Raw message as the server sends it. See talimBE-V2 docs/chat-realtime-contract.md.
 * Read it through normalizeMessage() rather than touching these fields directly.
 */
export interface ChatMessage {
  _id: string;
  roomId: string;
  chatRoomId?: string;
  clientMessageId?: string;
  senderId: string | { _id: string; firstName?: string; lastName?: string };
  sender?: { _id: string; name: string; role?: string; avatar?: string | null };
  text?: string;
  type: string;
  attachments?: any[];
  duration?: number;
  readBy?: string[];
  createdAt?: string;
  /** @deprecated use text */
  content?: string;
  /** @deprecated use createdAt */
  timestamp?: string;
  /** @deprecated use sender.name */
  senderName?: string;
}

export interface NotificationData {
  _id: string;
  title: string;
  body?: string;
  message?: string;
  type: string;
  metadata?: Record<string, any>;
  createdAt: string;
  [key: string]: any;
}

export interface ChatParticipant {
  _id: string;
  userId?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  userAvatar?: string | null;
  isActive?: boolean;
  isOnline: boolean;
}

export interface ChatLastMessage {
  _id?: string;
  senderId: string;
  senderName: string;
  type: string;
  preview: string;
  createdAt: string;
}

export interface ChatRoomData {
  roomId: string;
  _id?: string;
  name: string;
  type: string;
  participants: ChatParticipant[];
  lastMessage?: ChatLastMessage | null;
  unreadCount: number;
  updatedAt: string;
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
  room?: ChatRoomData;
  participants: ChatParticipant[];
  messages: ChatMessage[];
  hasMore: boolean;
  nextCursor?: string | null;
  prevCursor?: string | null;
  totalParticipants: number;
}

export interface FetchMessagesData {
  roomId: string;
  messages: ChatMessage[];
  hasMore: boolean;
  nextCursor?: string | null;
  prevCursor?: string | null;
  direction: "before" | "after";
  cursor?: string;
}

export interface ChatRoomActivityData {
  roomId: string;
  lastMessage: ChatLastMessage;
}

export interface ChatErrorData {
  code?: string;
  message?: string;
  roomId?: string;
  messageId?: string;
  clientMessageId?: string;
}

export interface ChatAck {
  ok: boolean;
  error?: { code: string; message: string };
  [key: string]: any;
}

export interface SendChatMessagePayload {
  roomId: string;
  text: string;
  clientMessageId: string;
  type?: string;
  attachments?: any[];
  duration?: number;
}

export type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error";

type Unsubscribe = () => void;

export interface WebSocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  connectionStatus: ConnectionStatus;

  // Chat functions
  joinChatRoom: (roomId: string) => Promise<ChatAck>;
  leaveChatRoom: (roomId: string) => void;
  sendChatMessage: (payload: SendChatMessagePayload) => Promise<ChatAck>;
  markMessageAsRead: (messageId: string) => void;
  fetchChatRooms: () => void;
  fetchUnreadCount: () => void;
  fetchMessages: (data: {
    roomId: string;
    cursor?: string;
    direction?: "before" | "after";
    limit?: number;
  }) => Promise<ChatAck>;

  // Event listeners. Each returns a function that removes exactly that listener.
  onConnect: (callback: () => void) => Unsubscribe;
  onChatMessage: (callback: (message: ChatMessage) => void) => Unsubscribe;
  onNotification: (callback: (notification: NotificationData) => void) => Unsubscribe;
  onChatRoomsUpdate: (callback: (data: ChatRoomsUpdateData) => void) => Unsubscribe;
  onChatRoomJoined: (callback: (data: ChatRoomJoinedData) => void) => Unsubscribe;
  onMessagesUpdate: (callback: (data: FetchMessagesData) => void) => Unsubscribe;
  onChatRoomActivity: (callback: (data: ChatRoomActivityData) => void) => Unsubscribe;
  onChatError: (callback: (data: ChatErrorData) => void) => Unsubscribe;
  onUnreadMessagesUpdate: (
    callback: (data: { userId: string; unreadCount: number }) => void,
  ) => Unsubscribe;

  // Connection management
  connect: (userId: string) => void;
  disconnect: () => void;
  reconnect: () => void;
}

const offlineAck = (): ChatAck => ({
  ok: false,
  error: { code: "OFFLINE", message: "You're offline." },
});

const isUnauthenticated = (payload: any): boolean => {
  const code = payload?.error?.code ?? payload?.code ?? payload?.data?.code;
  if (code === "UNAUTHENTICATED") return true;
  const message = String(payload?.message ?? "").toLowerCase();
  return message.includes("unauthorized") || message.includes("unauthenticated");
};

/**
 * Owns the app's single Socket.IO connection. Socket.IO's own reconnection does
 * the retrying; listeners are kept in a registry so subscriptions made before
 * the socket exists, or across a new login, still receive events.
 */
export const useWebSocket = (): WebSocketContextType => {
  const socketRef = useRef<Socket | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("disconnected");
  const listenersRef = useRef<Map<string, Set<(...args: any[]) => void>>>(new Map());
  const authRetryUsedRef = useRef(false);
  const authFailedRef = useRef(false);
  const authRetryResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const roomsFetchRef = useRef<{ lastAt: number; trailing: ReturnType<typeof setTimeout> | null }>({
    lastAt: 0,
    trailing: null,
  });

  const subscribe = useCallback(
    (event: string, callback: (...args: any[]) => void): Unsubscribe => {
      let set = listenersRef.current.get(event);
      if (!set) {
        set = new Set();
        listenersRef.current.set(event, set);
      }
      set.add(callback);
      socketRef.current?.on(event, callback);
      return () => {
        listenersRef.current.get(event)?.delete(callback);
        socketRef.current?.off(event, callback);
      };
    },
    [],
  );

  /**
   * The server refused the token. Refresh it once through the API client's
   * refresh flow and reconnect; if that fails, the normal sign-out flow applies.
   */
  const recoverFromAuthFailure = useCallback(async (target: Socket) => {
    if (authRetryUsedRef.current) {
      setConnectionStatus("error");
      return;
    }
    authRetryUsedRef.current = true;
    try {
      await refreshAccessToken();
      if (socketRef.current === target) target.connect();
    } catch {
      if (socketRef.current === target) {
        target.disconnect();
        setConnectionStatus("error");
      }
    }
  }, []);

  // Connect to WebSocket
  const connect = useCallback(
    (userId: string) => {
      if (socketRef.current) return;

      setConnectionStatus("connecting");

      // The server authenticates the socket with the access token. The callback runs
      // on every connect and reconnect, so a refreshed token is always used.
      const next = io(WEBSOCKET_URL, {
        auth: (cb) => cb({ token: nookies.get(undefined).access_token }),
        query: { userId },
        transports: ["websocket", "polling"],
        timeout: 20000,
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 10000,
      });

      next.on("connect", () => {
        authFailedRef.current = false;
        setIsConnected(true);
        setConnectionStatus("connected");
        // A connection that stays authenticated earns a fresh token-refresh attempt.
        if (authRetryResetRef.current) clearTimeout(authRetryResetRef.current);
        authRetryResetRef.current = setTimeout(() => {
          authRetryUsedRef.current = false;
        }, 5000);
      });

      next.on("connect_error", (error: any) => {
        setIsConnected(false);
        if (isUnauthenticated(error) || isUnauthenticated(error?.data)) {
          void recoverFromAuthFailure(next);
          return;
        }
        // Socket.IO keeps retrying on its own.
        setConnectionStatus("connecting");
      });

      next.on("exception", (payload: any) => {
        if (isUnauthenticated(payload)) authFailedRef.current = true;
      });

      next.on("disconnect", (reason) => {
        setIsConnected(false);
        if (authRetryResetRef.current) clearTimeout(authRetryResetRef.current);
        if (reason === "io client disconnect") {
          setConnectionStatus("disconnected");
          return;
        }
        if (reason === "io server disconnect") {
          // The server only drops a socket like this when the token was refused;
          // Socket.IO won't reconnect by itself in that case.
          if (authFailedRef.current) {
            void recoverFromAuthFailure(next);
          } else {
            setConnectionStatus("connecting");
            next.connect();
          }
          return;
        }
        setConnectionStatus("connecting");
      });

      // Attach everything that subscribed before the socket existed.
      listenersRef.current.forEach((callbacks, event) => {
        callbacks.forEach((callback) => next.on(event, callback));
      });

      socketRef.current = next;
      setSocket(next);
    },
    [recoverFromAuthFailure],
  );

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    if (authRetryResetRef.current) clearTimeout(authRetryResetRef.current);
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
      setSocket(null);
    }
    authRetryUsedRef.current = false;
    authFailedRef.current = false;
    setIsConnected(false);
    setConnectionStatus("disconnected");
  }, []);

  // Manual retry (e.g. the header's Retry button). Normally Socket.IO reconnects by itself.
  const reconnect = useCallback(() => {
    const current = socketRef.current;
    if (current && !current.connected) {
      authRetryUsedRef.current = false;
      setConnectionStatus("connecting");
      current.connect();
    }
  }, []);

  const emitWithAck = useCallback(
    (event: string, payload: unknown, timeoutMs = ACK_TIMEOUT_MS): Promise<ChatAck> => {
      const current = socketRef.current;
      if (!current?.connected) return Promise.resolve(offlineAck());
      return new Promise((resolve) => {
        current.timeout(timeoutMs).emit(event, payload, (err: unknown, ack: ChatAck) => {
          if (err) {
            resolve({
              ok: false,
              error: { code: "TIMEOUT", message: "The server didn't respond." },
            });
          } else {
            resolve(ack ?? { ok: true });
          }
        });
      });
    },
    [],
  );

  // Chat functions
  const joinChatRoom = useCallback(
    (roomId: string) => emitWithAck("join-chat-room", { roomId }),
    [emitWithAck],
  );

  const leaveChatRoom = useCallback((roomId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("leave-chat-room", { roomId });
    }
  }, []);

  const sendChatMessage = useCallback(
    (payload: SendChatMessagePayload) => emitWithAck("send-chat-message", payload),
    [emitWithAck],
  );

  const markMessageAsRead = useCallback((messageId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("mark-message-read", { messageId });
    }
  }, []);

  // Coalesces bursts: at most one request a second, with a trailing request so the
  // last call is never lost.
  const fetchChatRooms = useCallback(() => {
    const state = roomsFetchRef.current;
    if (state.trailing) return;
    const wait = state.lastAt + 1000 - Date.now();
    const run = () => {
      state.trailing = null;
      state.lastAt = Date.now();
      if (socketRef.current?.connected) socketRef.current.emit("fetch-chat-rooms");
    };
    if (wait > 0) {
      state.trailing = setTimeout(run, wait);
    } else {
      run();
    }
  }, []);

  const fetchUnreadCount = useCallback(() => {
    if (socketRef.current?.connected) socketRef.current.emit("fetch-unread-count");
  }, []);

  const fetchMessages = useCallback(
    (data: {
      roomId: string;
      cursor?: string;
      direction?: "before" | "after";
      limit?: number;
    }) => emitWithAck("fetch-messages", data),
    [emitWithAck],
  );

  // Event listeners
  const onConnect = useCallback((cb: () => void) => subscribe("connect", cb), [subscribe]);
  const onChatMessage = useCallback(
    (cb: (message: ChatMessage) => void) => subscribe("chat-message", cb),
    [subscribe],
  );
  const onNotification = useCallback(
    (cb: (notification: NotificationData) => void) => subscribe("notification", cb),
    [subscribe],
  );
  const onChatRoomsUpdate = useCallback(
    (cb: (data: ChatRoomsUpdateData) => void) => subscribe("chat-rooms-update", cb),
    [subscribe],
  );
  const onChatRoomJoined = useCallback(
    (cb: (data: ChatRoomJoinedData) => void) => subscribe("chat-room-joined", cb),
    [subscribe],
  );
  const onMessagesUpdate = useCallback(
    (cb: (data: FetchMessagesData) => void) => subscribe("messages-update", cb),
    [subscribe],
  );
  const onChatRoomActivity = useCallback(
    (cb: (data: ChatRoomActivityData) => void) => subscribe("chat-room-activity", cb),
    [subscribe],
  );
  const onChatError = useCallback(
    (cb: (data: ChatErrorData) => void) => subscribe("error", cb),
    [subscribe],
  );
  const onUnreadMessagesUpdate = useCallback(
    (cb: (data: { userId: string; unreadCount: number }) => void) =>
      subscribe("unread-messages-update", cb),
    [subscribe],
  );

  // Cleanup on unmount
  useEffect(() => {
    const fetchState = roomsFetchRef.current;
    return () => {
      if (fetchState.trailing) clearTimeout(fetchState.trailing);
      disconnect();
    };
  }, [disconnect]);

  return {
    socket,
    isConnected,
    connectionStatus,

    // Chat functions
    joinChatRoom,
    leaveChatRoom,
    sendChatMessage,
    markMessageAsRead,
    fetchChatRooms,
    fetchUnreadCount,
    fetchMessages,

    // Event listeners
    onConnect,
    onChatMessage,
    onNotification,
    onChatRoomsUpdate,
    onChatRoomJoined,
    onMessagesUpdate,
    onChatRoomActivity,
    onChatError,
    onUnreadMessagesUpdate,

    // Connection management
    connect,
    disconnect,
    reconnect,
  };
};
