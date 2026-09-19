"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { sessionStore } from "@/lib/session";
import { io, Socket } from "socket.io-client";
import { API_BASE_URL } from "../lib/api/config";
import { refreshAccessToken } from "../lib/api/apiClient";
import type { ChatAttachmentView } from "../lib/chat/normalizeMessage";

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
  /** Attachment objects, or bare URLs from older servers. */
  attachments?: Array<ChatAttachmentView | string>;
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

/** An in-app notification pushed over the socket (`notification` event). */
export interface NotificationData {
  _id: string;
  title: string;
  body?: string;
  message?: string;
  type: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  [key: string]: unknown;
}

/** A member of a chat room, with live presence. */
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

/** The preview line a room list shows for its newest message. */
export interface ChatLastMessage {
  _id?: string;
  senderId: string;
  senderName: string;
  type: string;
  preview: string;
  createdAt: string;
}

/** A chat room as the socket and REST list it, after normalisation. */
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
  /** Groups only. */
  description?: string;
  /** Groups only: picture uploaded through POST /upload/chat-attachment. */
  avatarUrl?: string | null;
  createdBy?: string;
  /** When the current user last read this room. */
  lastReadAt?: string;
}

/** Payload of `chat-rooms-update`: the user's whole room list. */
export interface ChatRoomsUpdateData {
  rooms: ChatRoomData[];
  totalRooms: number;
}

/** Payload of `chat-room-joined`: a room's first page of messages after joining. */
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

/** Payload of `messages-update`: one page of a room's history. */
export interface FetchMessagesData {
  roomId: string;
  messages: ChatMessage[];
  hasMore: boolean;
  nextCursor?: string | null;
  prevCursor?: string | null;
  direction: "before" | "after";
  cursor?: string;
}

/** Payload of `chat-room-activity`: a room has a new last message. */
export interface ChatRoomActivityData {
  roomId: string;
  lastMessage: ChatLastMessage;
}

/** Another member read the room up to a message (they share read receipts). */
export interface MessagesReadData {
  roomId: string;
  userId: string;
  upToMessageId: string;
  readAt: string;
}

/** I read the room on one of my devices. */
export type RoomReadData = MessagesReadData;

/** Payload of `room-updated`: a group's name, description or picture changed. */
export interface RoomUpdatedData {
  roomId: string;
  name: string;
  description: string;
  avatarUrl: string | null;
  updatedBy: string;
}

/** Payload of `participants-changed`: members were added to or removed from a room. */
export interface ParticipantsChangedData {
  roomId: string;
  added: string[];
  removed: string[];
  by: string;
  participants: ChatParticipant[];
}

/** Payload of the socket's `error` event. */
export interface ChatErrorData {
  code?: string;
  message?: string;
  roomId?: string;
  messageId?: string;
  clientMessageId?: string;
}

/**
 * The server's acknowledgement of a socket emit. `ok` and `error` are on every
 * ack; the rest depend on the event (`send-chat-message` returns the saved
 * `message`, `fetch-messages` the paging fields).
 */
export interface ChatAck {
  ok: boolean;
  error?: { code: string; message: string };
  /** `send-chat-message`: the message as saved. */
  message?: unknown;
  /** `fetch-messages`: whether more pages exist in that direction. */
  hasMore?: boolean;
  nextCursor?: string | null;
  prevCursor?: string | null;
}

/** Body of `send-chat-message`. */
export interface SendChatMessagePayload {
  roomId: string;
  text: string;
  clientMessageId: string;
  type?: string;
  attachments?: ChatAttachmentView[];
  duration?: number;
}

/** Where the socket connection stands. */
export type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error";

type Unsubscribe = () => void;

/** A socket listener as stored and handed to Socket.IO, whatever its payload type. */
type SocketListener = (...args: unknown[]) => void;

/** What everything the hook consumes from the shared socket looks like. */
export interface WebSocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  connectionStatus: ConnectionStatus;
  /** Live connection state, safe to read inside event handlers. */
  isSocketConnected: () => boolean;

  // Chat functions
  joinChatRoom: (roomId: string) => Promise<ChatAck>;
  leaveChatRoom: (roomId: string) => void;
  sendChatMessage: (payload: SendChatMessagePayload) => Promise<ChatAck>;
  /** Reads the room up to a message (and everything before it). */
  markRoomRead: (roomId: string, upToMessageId: string) => Promise<ChatAck>;
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
  onMessagesRead: (callback: (data: MessagesReadData) => void) => Unsubscribe;
  onRoomRead: (callback: (data: RoomReadData) => void) => Unsubscribe;
  onRoomUpdated: (callback: (data: RoomUpdatedData) => void) => Unsubscribe;
  onParticipantsChanged: (callback: (data: ParticipantsChangedData) => void) => Unsubscribe;

  // Connection management
  connect: (userId: string) => void;
  disconnect: () => void;
  reconnect: () => void;
}

const offlineAck = (): ChatAck => ({
  ok: false,
  error: { code: "OFFLINE", message: "You're offline." },
});

/** The shapes a refused socket or a failed handshake reports its reason in. */
interface AuthFailurePayload {
  error?: { code?: string };
  code?: string;
  data?: { code?: string };
  message?: string;
}

/**
 * Whether a socket error means the server refused our token, judged by the
 * server's `UNAUTHENTICATED` code first and the message only as a fallback.
 *
 * @param payload - A `connect_error`, its `data`, or an error event body.
 * @returns True when the token was refused.
 */
const isUnauthenticated = (payload: unknown): boolean => {
  const failure = (payload ?? {}) as AuthFailurePayload;
  const code = failure.error?.code ?? failure.code ?? failure.data?.code;
  if (code === "UNAUTHENTICATED") return true;
  const message = String(failure.message ?? "").toLowerCase();
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
  const listenersRef = useRef<Map<string, Set<SocketListener>>>(new Map());
  const authRetryUsedRef = useRef(false);
  const authRetryResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const roomsFetchRef = useRef<{ lastAt: number; trailing: ReturnType<typeof setTimeout> | null }>({
    lastAt: 0,
    trailing: null,
  });

  const subscribe = useCallback(<Args extends unknown[]>(event: string, callback: (...args: Args) => void): Unsubscribe => {
    // The registry holds listeners of many payload types; each `onX` wrapper
    // below pins its own payload type, so widening here is the one safe cast.
    const listener = callback as unknown as SocketListener;
    let set = listenersRef.current.get(event);
    if (!set) {
      set = new Set();
      listenersRef.current.set(event, set);
    }
    set.add(listener);
    socketRef.current?.on(event, listener);
    return () => {
      listenersRef.current.get(event)?.delete(listener);
      socketRef.current?.off(event, listener);
    };
  }, []);

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
        auth: (cb) => cb({ token: sessionStore.getToken() }),
        query: { userId },
        transports: ["websocket", "polling"],
        timeout: 20000,
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 10000,
      });

      next.on("connect", () => {
        setIsConnected(true);
        setConnectionStatus("connected");
        // A connection that stays authenticated earns a fresh token-refresh attempt.
        if (authRetryResetRef.current) clearTimeout(authRetryResetRef.current);
        authRetryResetRef.current = setTimeout(() => {
          authRetryUsedRef.current = false;
        }, 5000);
      });

      next.on("connect_error", (error: Error & { data?: unknown }) => {
        setIsConnected(false);
        if (isUnauthenticated(error) || isUnauthenticated(error.data)) {
          void recoverFromAuthFailure(next);
          return;
        }
        // Socket.IO keeps retrying on its own.
        setConnectionStatus("connecting");
      });

      next.on("disconnect", (reason) => {
        setIsConnected(false);
        if (authRetryResetRef.current) clearTimeout(authRetryResetRef.current);
        if (reason === "io client disconnect") {
          setConnectionStatus("disconnected");
          return;
        }
        if (reason === "io server disconnect") {
          // The server drops a socket like this when it refuses the token (after an
          // UNAUTHENTICATED exception), and Socket.IO won't reconnect by itself.
          // Refresh once and reconnect; the attempt is only re-armed after a
          // connection has stayed up for 5 s, so a refused token can't loop.
          setConnectionStatus("connecting");
          void recoverFromAuthFailure(next);
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

  const isSocketConnected = useCallback(() => Boolean(socketRef.current?.connected), []);

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

  const markRoomRead = useCallback(
    (roomId: string, upToMessageId: string) =>
      emitWithAck("mark-room-read", { roomId, upToMessageId }),
    [emitWithAck],
  );

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
  const onMessagesRead = useCallback(
    (cb: (data: MessagesReadData) => void) => subscribe("messages-read", cb),
    [subscribe],
  );
  const onRoomRead = useCallback(
    (cb: (data: RoomReadData) => void) => subscribe("room-read", cb),
    [subscribe],
  );
  const onRoomUpdated = useCallback(
    (cb: (data: RoomUpdatedData) => void) => subscribe("room-updated", cb),
    [subscribe],
  );
  const onParticipantsChanged = useCallback(
    (cb: (data: ParticipantsChangedData) => void) => subscribe("participants-changed", cb),
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
    isSocketConnected,

    // Chat functions
    joinChatRoom,
    leaveChatRoom,
    sendChatMessage,
    markRoomRead,
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
    onMessagesRead,
    onRoomRead,
    onRoomUpdated,
    onParticipantsChanged,

    // Connection management
    connect,
    disconnect,
    reconnect,
  };
};
