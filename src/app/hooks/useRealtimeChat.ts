"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  ChatAck,
  ChatErrorData,
  ChatLastMessage,
  ChatRoomActivityData,
  ChatRoomData,
  ChatRoomJoinedData,
  ChatRoomsUpdateData,
  FetchMessagesData,
  WebSocketContextType,
} from "./useWebSocket";
import { useWebSocketContextSafe } from "../contexts/WebSocketContext";
import { useAuth } from "./useAuth";
import {
  ChatMessageView,
  createClientMessageId,
  normalizeMessage,
  normalizeMessages,
} from "../lib/chat/normalizeMessage";
import { mergeMessages, newestServerMessageId, roomStore } from "../lib/chat/roomStore";

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

export interface UseRealtimeChatReturn {
  chatRooms: RealtimeChatRoom[];
  isLoading: boolean;
  isConnected: boolean;
  error: string | null;
  currentUserId: string | null;
  /** Unread messages across all rooms, from the server when it has said so. */
  totalUnread: number;

  // Chat room operations
  refreshChatRooms: () => void;
  searchChatRooms: (searchTerm: string) => RealtimeChatRoom[];
  getFilteredChatRooms: (type?: string) => RealtimeChatRoom[];

  // Room selection and management. A room is joined only while it is selected.
  selectedRoomId: string | null;
  selectRoom: (roomId: string) => void;
  unselectRoom: () => void;
  retryJoin: (roomId: string) => void;
  isRoomOpen: (roomId: string) => boolean;

  // Message operations
  sendMessage: (roomId: string, text: string) => void;
  retryMessage: (roomId: string, clientMessageId: string) => void;
  deleteMessage: (roomId: string, clientMessageId: string) => void;
  loadOlderMessages: (roomId: string) => void;
  setDraft: (roomId: string, text: string) => void;
}

const JOIN_TIMEOUT_MS = 10000;
const JOIN_ERROR = "Couldn't load this chat";
const MAX_BACKFILL_PAGES = 5;
const MAX_MARK_READ = 50;

const offline = (): Promise<ChatAck> =>
  Promise.resolve({ ok: false, error: { code: "OFFLINE", message: "You're offline." } });
const noop = () => {};
const noopSubscribe = () => noop;

// Used outside a WebSocketProvider. Module-level so its functions are stable.
const NO_SOCKET: WebSocketContextType = {
  socket: null,
  isConnected: false,
  connectionStatus: "disconnected",
  isSocketConnected: () => false,
  joinChatRoom: offline,
  leaveChatRoom: noop,
  sendChatMessage: offline,
  markMessageAsRead: noop,
  fetchChatRooms: noop,
  fetchUnreadCount: noop,
  fetchMessages: offline,
  onConnect: noopSubscribe,
  onChatMessage: noopSubscribe,
  onNotification: noopSubscribe,
  onChatRoomsUpdate: noopSubscribe,
  onChatRoomJoined: noopSubscribe,
  onMessagesUpdate: noopSubscribe,
  onChatRoomActivity: noopSubscribe,
  onChatError: noopSubscribe,
  onUnreadMessagesUpdate: noopSubscribe,
  connect: noop,
  disconnect: noop,
  reconnect: noop,
};

const idOf = (value: unknown): string => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") return idOf((value as { _id?: unknown })._id);
  return String(value);
};

const normalizeLastMessage = (raw: any): ChatLastMessage | null => {
  if (!raw) return null;
  return {
    _id: raw._id ? idOf(raw._id) : undefined,
    senderId: idOf(raw.senderId),
    senderName: raw.senderName || "",
    type: raw.type || "text",
    preview: raw.preview ?? raw.content ?? raw.text ?? "",
    createdAt: raw.createdAt || raw.timestamp || "",
  };
};

/** Reads a room from `chat-rooms-update`, `chat-room-joined` or REST. */
const normalizeRoom = (raw: any): ChatRoomData => ({
  ...raw,
  roomId: idOf(raw.roomId) || idOf(raw._id),
  name: raw.name || "",
  participants: Array.isArray(raw.participants) ? raw.participants : [],
  lastMessage: normalizeLastMessage(raw.lastMessage),
  unreadCount: raw.unreadCount || 0,
  updatedAt: raw.updatedAt || raw.createdAt || "",
});

const roomTime = (room: ChatRoomData) =>
  new Date(room.lastMessage?.createdAt || room.updatedAt || 0).getTime() || 0;

const sortRooms = <T extends ChatRoomData>(rooms: T[]): T[] =>
  [...rooms].sort((a, b) => roomTime(b) - roomTime(a));

const initialsOf = (name: string) =>
  name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

// Transform chat room data for better UX
const transformChatRoom = (
  room: ChatRoomData,
  currentUserId: string | null,
): RealtimeChatRoom => {
  let displayName = room.name || "Chat Room";
  let avatarInfo: RealtimeChatRoom["avatarInfo"] = {
    type: "initials",
    value: "CR",
    bgColor: generateColorFromString(room.roomId),
  };
  let isOnline = false;

  switch (room.type) {
    case "one_to_one": {
      const otherParticipant = room.participants.find(
        (p) => (p.userId ?? p._id) !== currentUserId,
      );
      if (otherParticipant) {
        const otherId = otherParticipant.userId ?? otherParticipant._id;
        displayName =
          `${otherParticipant.firstName || ""} ${otherParticipant.lastName || ""}`.trim() ||
          "User";
        isOnline = otherParticipant.isOnline;

        if (otherParticipant.userAvatar) {
          avatarInfo = { type: "image", value: otherParticipant.userAvatar };
        } else {
          const initials =
            `${otherParticipant.firstName?.[0] || ""}${otherParticipant.lastName?.[0] || ""}` ||
            "U";
          avatarInfo = {
            type: "initials",
            value: initials.toUpperCase(),
            bgColor: generateColorFromString(otherId),
          };
        }
      }
      break;
    }
    case "class_group":
    case "course_group": {
      displayName =
        room.name || (room.type === "class_group" ? "Class Group" : "Course Group");
      avatarInfo = {
        type: "initials",
        value: initialsOf(displayName),
        bgColor: generateColorFromString(displayName),
      };
      break;
    }
  }

  return { ...room, displayName, avatarInfo, isOnline };
};

export const useRealtimeChat = (): UseRealtimeChatReturn => {
  const [chatRooms, setChatRooms] = useState<RealtimeChatRoom[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [serverUnread, setServerUnread] = useState<number | null>(null);

  const { user } = useAuth();
  const currentUserId = user?.userId || user?._id || null;

  // Called unconditionally so React's hook call order is stable across renders.
  const webSocket = useWebSocketContextSafe() ?? NO_SOCKET;
  const {
    isConnected,
    isSocketConnected,
    fetchChatRooms,
    fetchUnreadCount,
    joinChatRoom,
    leaveChatRoom,
    sendChatMessage,
    markMessageAsRead,
    fetchMessages,
    onConnect,
    onChatRoomsUpdate,
    onChatRoomJoined,
    onMessagesUpdate,
    onChatMessage,
    onChatRoomActivity,
    onChatError,
    onUnreadMessagesUpdate,
  } = webSocket;

  // Event handlers read these refs so they never act on a stale room or user.
  const selectedRoomIdRef = useRef<string | null>(null);
  const currentUserIdRef = useRef<string | null>(currentUserId);
  const userRef = useRef(user);
  const chatRoomsRef = useRef<RealtimeChatRoom[]>([]);
  const joinTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const inFlightSendsRef = useRef<Set<string>>(new Set());
  const markedReadRef = useRef<Set<string>>(new Set());
  const loadingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    chatRoomsRef.current = chatRooms;
  }, [chatRooms]);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // A different user on this browser starts with an empty chat state.
  useEffect(() => {
    const previous = currentUserIdRef.current;
    currentUserIdRef.current = currentUserId;
    if (previous && previous !== currentUserId) {
      roomStore.reset();
      markedReadRef.current.clear();
      setChatRooms([]);
      setServerUnread(null);
    }
  }, [currentUserId]);

  const updateRooms = useCallback(
    (updater: (rooms: RealtimeChatRoom[]) => RealtimeChatRoom[]) => {
      setChatRooms((prev) => {
        const next = updater(prev);
        chatRoomsRef.current = next;
        return next;
      });
    },
    [],
  );

  // The list spinner never outlives a request that got no answer.
  const beginLoading = useCallback(() => {
    setIsLoading(true);
    if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current);
    loadingTimerRef.current = setTimeout(() => setIsLoading(false), JOIN_TIMEOUT_MS);
  }, []);

  const clearJoinTimer = useCallback((roomId: string) => {
    const timer = joinTimersRef.current.get(roomId);
    if (timer) clearTimeout(timer);
    joinTimersRef.current.delete(roomId);
  }, []);

  const failJoin = useCallback(
    (roomId: string, message: string = JOIN_ERROR) => {
      clearJoinTimer(roomId);
      roomStore.update(roomId, (s) => ({
        ...s,
        joinStatus: "error",
        joinError: message,
        loadingOlder: false,
      }));
    },
    [clearJoinTimer],
  );

  /**
   * Marks messages from others that I haven't read, while the room is open and
   * the tab is visible. Bounded to the most recent ones; step 4 replaces this
   * with a bulk read.
   */
  const markRoomRead = useCallback(
    (roomId: string) => {
      const me = currentUserIdRef.current;
      if (!me || selectedRoomIdRef.current !== roomId || !isSocketConnected()) return;
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;

      const unread = roomStore
        .get(roomId)
        .messages.filter(
          (m) =>
            m.status === "sent" &&
            m.senderId &&
            m.senderId !== me &&
            !m.readBy.includes(me) &&
            !markedReadRef.current.has(m._id),
        )
        .slice(-MAX_MARK_READ);

      unread.forEach((message) => {
        markedReadRef.current.add(message._id);
        markMessageAsRead(message._id);
      });
    },
    [markMessageAsRead, isSocketConnected],
  );

  /** Keeps asking for newer messages after `cursor` until caught up. */
  const backfill = useCallback(
    (roomId: string, cursor: string, page = 0) => {
      fetchMessages({ roomId, cursor, direction: "after", limit: 100 }).then((ack) => {
        if (
          ack.ok &&
          ack.hasMore &&
          ack.prevCursor &&
          page + 1 < MAX_BACKFILL_PAGES &&
          selectedRoomIdRef.current === roomId
        ) {
          backfill(roomId, ack.prevCursor, page + 1);
        }
      });
    },
    [fetchMessages],
  );

  const startJoin = useCallback(
    (roomId: string) => {
      const backfillCursor = newestServerMessageId(roomStore.get(roomId).messages);
      roomStore.update(roomId, (s) => ({ ...s, joinStatus: "joining", joinError: null }));

      clearJoinTimer(roomId);
      joinTimersRef.current.set(
        roomId,
        setTimeout(() => {
          if (roomStore.get(roomId).joinStatus === "joining") failJoin(roomId);
        }, JOIN_TIMEOUT_MS),
      );

      // Offline: the timer runs, and the next `connect` joins again.
      if (!isSocketConnected()) return;

      joinChatRoom(roomId).then((ack) => {
        if (ack.ok || selectedRoomIdRef.current !== roomId) return;
        if (ack.error?.code === "OFFLINE") return;
        failJoin(roomId, ack.error?.code === "TIMEOUT" ? JOIN_ERROR : ack.error?.message);
      });

      // Catch up on anything newer than what we already hold for this room.
      if (backfillCursor) backfill(roomId, backfillCursor);
    },
    [joinChatRoom, backfill, clearJoinTimer, failJoin, isSocketConnected],
  );

  const markFailed = useCallback(
    (roomId: string | undefined, clientMessageId: string, message?: string) => {
      const apply = (id: string) =>
        roomStore.update(id, (s) => {
          if (!s.messages.some((m) => m.clientMessageId === clientMessageId && m.status === "pending")) {
            return s;
          }
          return {
            ...s,
            messages: s.messages.map((m) =>
              m.clientMessageId === clientMessageId && m.status === "pending"
                ? { ...m, status: "failed", error: message }
                : m,
            ),
          };
        });
      if (roomId) {
        apply(roomId);
      } else {
        roomStore.pendingMessages()
          .filter((m) => m.clientMessageId === clientMessageId)
          .forEach((m) => apply(m.roomId));
      }
    },
    [],
  );

  const emitSend = useCallback(
    (message: ChatMessageView) => {
      const clientMessageId = message.clientMessageId;
      if (!clientMessageId || inFlightSendsRef.current.has(clientMessageId)) return;
      // Offline: stays pending and is sent on the next `connect`.
      if (!isSocketConnected()) return;

      inFlightSendsRef.current.add(clientMessageId);
      sendChatMessage({
        roomId: message.roomId,
        text: message.text,
        type: message.type,
        clientMessageId,
      }).then((ack) => {
        inFlightSendsRef.current.delete(clientMessageId);
        if (ack.ok && ack.message) {
          const saved = normalizeMessage(ack.message);
          if (saved) {
            roomStore.update(message.roomId, (s) => ({
              ...s,
              messages: mergeMessages(s.messages, [
                { ...saved, clientMessageId: saved.clientMessageId ?? clientMessageId },
              ]),
            }));
          }
          return;
        }
        if (ack.error?.code === "OFFLINE") return;
        markFailed(message.roomId, clientMessageId, ack.error?.message);
      });
    },
    [sendChatMessage, markFailed, isSocketConnected],
  );

  // Subscriptions. The socket's listener registry keeps these across reconnects.
  useEffect(() => {
    const handleConnect = () => {
      // Rejoin + backfill the open room, then refresh the list and unread total.
      // Read marks sent before a drop may have been lost; the rejoin brings fresh readBy.
      markedReadRef.current.clear();
      const roomId = selectedRoomIdRef.current;
      if (roomId) startJoin(roomId);
      if (chatRoomsRef.current.length === 0) beginLoading();
      fetchChatRooms();
      fetchUnreadCount();
      roomStore.pendingMessages().forEach(emitSend);
    };

    const handleRoomsUpdate = (data: ChatRoomsUpdateData) => {
      if (!data || !Array.isArray(data.rooms)) {
        setError("Invalid chat rooms data received");
        setIsLoading(false);
        return;
      }
      const me = currentUserIdRef.current;
      const rooms = data.rooms.map((raw) => {
        const room = transformChatRoom(normalizeRoom(raw), me);
        // The open room is being read right now.
        return room.roomId === selectedRoomIdRef.current ? { ...room, unreadCount: 0 } : room;
      });
      updateRooms(() => sortRooms(rooms));
      setIsLoading(false);
      setError(null);
    };

    const handleRoomJoined = (data: ChatRoomJoinedData) => {
      const roomId = data?.roomId;
      if (!roomId) return;
      if (roomId !== selectedRoomIdRef.current) {
        // The user moved on before the join finished; don't stay in the room.
        leaveChatRoom(roomId);
        return;
      }
      clearJoinTimer(roomId);

      const incoming = normalizeMessages(data.messages);
      const room = normalizeRoom(
        data.room ?? {
          _id: roomId,
          name: data.roomName,
          type: data.roomType,
          participants: data.participants,
        },
      );
      roomStore.update(roomId, (s) => {
        // Keep an older cursor if older pages were already loaded.
        const firstPage = !s.messages.some((m) => m.status === "sent");
        return {
          ...s,
          messages: mergeMessages(s.messages, incoming),
          hasMore: firstPage ? Boolean(data.hasMore) : s.hasMore,
          nextCursor: firstPage ? data.nextCursor ?? null : s.nextCursor,
          joinStatus: "joined",
          joinError: null,
          room,
          participants: Array.isArray(data.participants) ? data.participants : s.participants,
        };
      });

      // Fresh participants and presence for the sidebar and header.
      const listed = chatRoomsRef.current.some((r) => r.roomId === roomId);
      if (data.room || !listed) {
        const fresh = { ...transformChatRoom(room, currentUserIdRef.current), unreadCount: 0 };
        updateRooms((prev) =>
          listed
            ? prev.map((r) => (r.roomId === roomId ? fresh : r))
            : sortRooms([...prev, fresh]),
        );
      }
      markRoomRead(roomId);
    };

    const handleMessagesUpdate = (data: FetchMessagesData) => {
      const roomId = data?.roomId;
      if (!roomId || roomId !== selectedRoomIdRef.current) return;
      const incoming = normalizeMessages(data.messages);
      roomStore.update(roomId, (s) => ({
        ...s,
        messages: mergeMessages(s.messages, incoming),
        ...(data.direction === "before"
          ? {
              hasMore: Boolean(data.hasMore),
              nextCursor: data.nextCursor ?? s.nextCursor,
              loadingOlder: false,
            }
          : {}),
      }));
      if (data.direction === "after") markRoomRead(roomId);
    };

    const handleChatMessage = (raw: unknown) => {
      const message = normalizeMessage(raw);
      if (!message || message.roomId !== selectedRoomIdRef.current) return;
      roomStore.update(message.roomId, (s) => ({
        ...s,
        messages: mergeMessages(s.messages, [message]),
      }));
      if (message.senderId !== currentUserIdRef.current) markRoomRead(message.roomId);
    };

    const handleActivity = (data: ChatRoomActivityData) => {
      if (!data?.roomId || !data.lastMessage) return;
      if (!chatRoomsRef.current.some((r) => r.roomId === data.roomId)) {
        // A room we don't list yet, e.g. a new group.
        fetchChatRooms();
        return;
      }
      const lastMessage = normalizeLastMessage(data.lastMessage)!;
      const isOpen = data.roomId === selectedRoomIdRef.current;
      const fromMe = lastMessage.senderId === currentUserIdRef.current;
      updateRooms((prev) =>
        sortRooms(
          prev.map((room) =>
            room.roomId === data.roomId
              ? {
                  ...room,
                  lastMessage,
                  updatedAt: lastMessage.createdAt || room.updatedAt,
                  unreadCount: isOpen ? 0 : fromMe ? room.unreadCount : (room.unreadCount || 0) + 1,
                }
              : room,
          ),
        ),
      );
    };

    const handleUnread = (data: { unreadCount: number }) => {
      if (typeof data?.unreadCount === "number") setServerUnread(data.unreadCount);
    };

    const handleError = (data: ChatErrorData) => {
      if (!data) return;
      if (data.clientMessageId) {
        markFailed(data.roomId, data.clientMessageId, data.message);
        return;
      }
      if (!data.roomId) return;
      roomStore.update(data.roomId, (s) => (s.loadingOlder ? { ...s, loadingOlder: false } : s));
      if (
        data.roomId === selectedRoomIdRef.current &&
        (data.code === "NOT_FOUND" || data.code === "FORBIDDEN") &&
        roomStore.get(data.roomId).joinStatus === "joining"
      ) {
        failJoin(data.roomId, data.message || JOIN_ERROR);
      }
    };

    const unsubscribers = [
      onConnect(handleConnect),
      onChatRoomsUpdate(handleRoomsUpdate),
      onChatRoomJoined(handleRoomJoined),
      onMessagesUpdate(handleMessagesUpdate),
      onChatMessage(handleChatMessage),
      onChatRoomActivity(handleActivity),
      onUnreadMessagesUpdate(handleUnread),
      onChatError(handleError),
    ];
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [
    onConnect,
    onChatRoomsUpdate,
    onChatRoomJoined,
    onMessagesUpdate,
    onChatMessage,
    onChatRoomActivity,
    onUnreadMessagesUpdate,
    onChatError,
    fetchChatRooms,
    fetchUnreadCount,
    leaveChatRoom,
    beginLoading,
    startJoin,
    emitSend,
    markFailed,
    failJoin,
    clearJoinTimer,
    markRoomRead,
    updateRooms,
  ]);

  // Coming back to the tab reads what arrived in the open room meanwhile.
  useEffect(() => {
    const handleVisibility = () => {
      const roomId = selectedRoomIdRef.current;
      if (roomId && document.visibilityState === "visible") markRoomRead(roomId);
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [markRoomRead]);

  useEffect(() => {
    const timers = joinTimersRef.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
      if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current);
    };
  }, []);

  // Chat room operations
  const refreshChatRooms = useCallback(() => {
    if (isSocketConnected()) {
      beginLoading();
      fetchChatRooms();
    }
  }, [fetchChatRooms, isSocketConnected, beginLoading]);

  const searchChatRooms = useCallback(
    (searchTerm: string): RealtimeChatRoom[] => {
      if (!searchTerm.trim()) return chatRooms;
      const term = searchTerm.toLowerCase();
      return chatRooms.filter(
        (room) =>
          room.displayName.toLowerCase().includes(term) ||
          room.lastMessage?.preview.toLowerCase().includes(term),
      );
    },
    [chatRooms],
  );

  const getFilteredChatRooms = useCallback(
    (type?: string): RealtimeChatRoom[] => {
      if (!type || type === "all") return chatRooms;

      switch (type) {
        case "teachers":
          return chatRooms.filter((room) => room.type === "one_to_one");
        case "groups":
          return chatRooms.filter(
            (room) => room.type === "class_group" || room.type === "course_group",
          );
        default:
          return chatRooms.filter((room) => room.type === type);
      }
    },
    [chatRooms],
  );

  // Room selection: the only place rooms are joined and left.
  const selectRoom = useCallback(
    (roomId: string) => {
      if (!roomId || selectedRoomIdRef.current === roomId) return;
      const previous = selectedRoomIdRef.current;
      if (previous) {
        leaveChatRoom(previous);
        clearJoinTimer(previous);
        roomStore.update(previous, (s) => ({ ...s, joinStatus: "idle", loadingOlder: false }));
      }
      selectedRoomIdRef.current = roomId;
      setSelectedRoomId(roomId);
      updateRooms((prev) =>
        prev.map((room) => (room.roomId === roomId ? { ...room, unreadCount: 0 } : room)),
      );
      startJoin(roomId);
    },
    [leaveChatRoom, clearJoinTimer, startJoin, updateRooms],
  );

  const unselectRoom = useCallback(() => {
    const previous = selectedRoomIdRef.current;
    if (!previous) return;
    leaveChatRoom(previous);
    clearJoinTimer(previous);
    roomStore.update(previous, (s) => ({ ...s, joinStatus: "idle", loadingOlder: false }));
    selectedRoomIdRef.current = null;
    setSelectedRoomId(null);
  }, [leaveChatRoom, clearJoinTimer]);

  const retryJoin = useCallback(
    (roomId: string) => {
      if (selectedRoomIdRef.current === roomId) startJoin(roomId);
    },
    [startJoin],
  );

  const isRoomOpen = useCallback(
    (roomId: string) => selectedRoomIdRef.current === roomId,
    [],
  );

  // Message operations
  const sendMessage = useCallback(
    (roomId: string, text: string) => {
      const trimmed = text.trim();
      if (!roomId || !trimmed) return;

      const me = userRef.current;
      const clientMessageId = createClientMessageId();
      const pending: ChatMessageView = {
        _id: `local:${clientMessageId}`,
        roomId,
        clientMessageId,
        senderId: currentUserIdRef.current || "",
        senderName: `${me?.firstName || ""} ${me?.lastName || ""}`.trim() || "You",
        senderAvatar: me?.userAvatar ?? null,
        text: trimmed,
        type: "text",
        attachments: [],
        readBy: [],
        createdAt: new Date().toISOString(),
        status: "pending",
      };

      // The text now lives in the bubble, so the composer can be cleared.
      roomStore.update(roomId, (s) => ({
        ...s,
        draft: "",
        messages: mergeMessages(s.messages, [pending]),
      }));
      emitSend(pending);
    },
    [emitSend],
  );

  const retryMessage = useCallback(
    (roomId: string, clientMessageId: string) => {
      const failed = roomStore
        .get(roomId)
        .messages.find((m) => m.clientMessageId === clientMessageId && m.status === "failed");
      if (!failed) return;
      // Same clientMessageId, so the server never stores it twice.
      const retried: ChatMessageView = { ...failed, status: "pending", error: undefined };
      roomStore.update(roomId, (s) => ({
        ...s,
        messages: s.messages.map((m) => (m._id === failed._id ? retried : m)),
      }));
      emitSend(retried);
    },
    [emitSend],
  );

  const deleteMessage = useCallback((roomId: string, clientMessageId: string) => {
    roomStore.update(roomId, (s) => ({
      ...s,
      messages: s.messages.filter(
        (m) => m.clientMessageId !== clientMessageId || m.status === "sent",
      ),
    }));
  }, []);

  const loadOlderMessages = useCallback(
    (roomId: string) => {
      const state = roomStore.get(roomId);
      if (state.loadingOlder || !state.hasMore || !state.nextCursor || !isSocketConnected()) return;
      roomStore.update(roomId, (s) => ({ ...s, loadingOlder: true }));
      fetchMessages({ roomId, cursor: state.nextCursor, direction: "before", limit: 20 }).then(
        (ack) => {
          if (!ack.ok) roomStore.update(roomId, (s) => ({ ...s, loadingOlder: false }));
        },
      );
    },
    [fetchMessages, isSocketConnected],
  );

  const setDraft = useCallback((roomId: string, text: string) => {
    roomStore.update(roomId, (s) => (s.draft === text ? s : { ...s, draft: text }));
  }, []);

  const totalUnread =
    serverUnread ?? chatRooms.reduce((sum, room) => sum + (room.unreadCount || 0), 0);

  return {
    chatRooms,
    isLoading,
    isConnected,
    error,
    currentUserId,
    totalUnread,

    // Chat room operations
    refreshChatRooms,
    searchChatRooms,
    getFilteredChatRooms,

    // Room selection and management
    selectedRoomId,
    selectRoom,
    unselectRoom,
    retryJoin,
    isRoomOpen,

    // Message operations
    sendMessage,
    retryMessage,
    deleteMessage,
    loadOlderMessages,
    setDraft,
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
