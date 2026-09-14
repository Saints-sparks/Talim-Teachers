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
  MessagesReadData,
  ParticipantsChangedData,
  RoomReadData,
  RoomUpdatedData,
  WebSocketContextType,
} from "./useWebSocket";
import { useWebSocketContextSafe } from "../contexts/WebSocketContext";
import { useAuth } from "./useAuth";
import {
  fileKind,
  messageTypeFor,
  uploadAttachments,
  type AttachmentKind,
  type ChatUploadFn,
  type UploadItem,
} from "@/components/chat-kit";
import { uploadChatAttachment } from "../services/chat.service";
import {
  ChatMessageView,
  createClientMessageId,
  normalizeMessage,
  normalizeMessages,
} from "../lib/chat/normalizeMessage";
import {
  EMPTY_ROOM,
  mergeMessages,
  newestServerMessageId,
  roomStore,
} from "../lib/chat/roomStore";
import {
  ReadPosition,
  applyMessagesRead,
  newestReadableMessage,
  shouldSendReadPosition,
} from "../lib/chat/readModel";

/**
 * Fired on window when I stop being a member of a room (removed, or I left),
 * so the app-wide alerts can tell the user and leave the chat if it is open.
 */
export const CHAT_ROOM_REMOVED_EVENT = "talim:chat-room-removed";

export interface ChatRoomRemovedDetail {
  roomId: string;
  name: string;
  /** I removed myself (left the group). */
  byMe: boolean;
  /** The room was open when it happened. */
  wasOpen: boolean;
}

/** Files picked in the composer, or a recorded voice note. */
export interface OutgoingMedia {
  files?: File[];
  voice?: { file: File; duration: number };
}

/** A pending message's files: kept outside the store so a retry re-uploads only what failed. */
interface OutboxEntry {
  items: UploadItem[];
  duration?: number;
  /** Object URLs behind the pending bubble's previews. */
  previewUrls: string[];
}

/** The app's upload helper in the shape the chat kit expects. */
const uploadChatFile: ChatUploadFn = (file, onProgress) => uploadChatAttachment(file, onProgress);

const revokePreviews = (entry: OutboxEntry) => {
  entry.previewUrls.forEach((url) => URL.revokeObjectURL(url));
  entry.previewUrls = [];
};

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
  /** Sends text, or files / a voice note with `text` as the caption. */
  sendMessage: (roomId: string, text: string, media?: OutgoingMedia) => void;
  retryMessage: (roomId: string, clientMessageId: string) => void;
  deleteMessage: (roomId: string, clientMessageId: string) => void;
  loadOlderMessages: (roomId: string) => void;
  setDraft: (roomId: string, text: string) => void;

  /**
   * Forgets a room I'm no longer a member of: drops it from the list and leaves
   * it if open. Safe to call more than once (participants-changed also does it).
   */
  dropRoom: (roomId: string, options?: { byMe?: boolean }) => void;
  /** Applies saved group details right away (room-updated brings the same). */
  applyRoomDetails: (
    roomId: string,
    details: { name?: string; description?: string | null; avatarUrl?: string | null },
  ) => void;
}

const JOIN_TIMEOUT_MS = 10000;
const JOIN_ERROR = "Couldn't load this chat";
const MAX_BACKFILL_PAGES = 5;

const isWindowActive = () =>
  typeof document === "undefined" ||
  (document.visibilityState === "visible" && document.hasFocus());

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
  markRoomRead: offline,
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
  onMessagesRead: noopSubscribe,
  onRoomRead: noopSubscribe,
  onRoomUpdated: noopSubscribe,
  onParticipantsChanged: noopSubscribe,
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
  description: typeof raw.description === "string" ? raw.description : "",
  avatarUrl: raw.avatarUrl || null,
  createdBy: raw.createdBy ? idOf(raw.createdBy) : undefined,
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
    default: {
      displayName =
        room.name ||
        (room.type === "class_group"
          ? "Class Group"
          : room.type === "course_group"
            ? "Course Group"
            : "Group Chat");
      avatarInfo = room.avatarUrl
        ? { type: "image", value: room.avatarUrl }
        : {
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
    markRoomRead: emitMarkRoomRead,
    fetchMessages,
    onConnect,
    onChatRoomsUpdate,
    onChatRoomJoined,
    onMessagesUpdate,
    onChatMessage,
    onChatRoomActivity,
    onChatError,
    onUnreadMessagesUpdate,
    onMessagesRead,
    onRoomRead,
    onRoomUpdated,
    onParticipantsChanged,
  } = webSocket;

  // Event handlers read these refs so they never act on a stale room or user.
  const selectedRoomIdRef = useRef<string | null>(null);
  const currentUserIdRef = useRef<string | null>(currentUserId);
  const userRef = useRef(user);
  const chatRoomsRef = useRef<RealtimeChatRoom[]>([]);
  const joinTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const inFlightSendsRef = useRef<Set<string>>(new Set());
  const outboxRef = useRef<Map<string, OutboxEntry>>(new Map());
  /** The read position last sent (or being sent) per room. */
  const readSentRef = useRef<Map<string, ReadPosition>>(new Map());
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
      readSentRef.current.clear();
      outboxRef.current.forEach(revokePreviews);
      outboxRef.current.clear();
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
   * Reads the open room up to the newest message from someone else, with one
   * `mark-room-read`. Only while the room is open and the window is visible and
   * focused; never re-sends a position already sent or an older one.
   */
  const markRoomRead = useCallback(
    (roomId: string) => {
      const me = currentUserIdRef.current;
      if (!me || selectedRoomIdRef.current !== roomId || !isSocketConnected()) return;
      if (!isWindowActive()) return;

      const newest = newestReadableMessage(roomStore.get(roomId).messages, me);
      if (!newest) return;
      const position: ReadPosition = { messageId: newest._id, createdAt: newest.createdAt };
      const previous = readSentRef.current.get(roomId);
      if (!shouldSendReadPosition(position, previous)) return;

      readSentRef.current.set(roomId, position);
      emitMarkRoomRead(roomId, newest._id).then((ack) => {
        if (ack.ok) {
          updateRooms((prev) =>
            prev.some((r) => r.roomId === roomId && r.unreadCount)
              ? prev.map((r) => (r.roomId === roomId ? { ...r, unreadCount: 0 } : r))
              : prev,
          );
          return;
        }
        // Not stored: forget it, so the next chance (reconnect, focus) sends it again.
        if (readSentRef.current.get(roomId)?.messageId === position.messageId) {
          if (previous) readSentRef.current.set(roomId, previous);
          else readSentRef.current.delete(roomId);
        }
      });
    },
    [emitMarkRoomRead, isSocketConnected, updateRooms],
  );

  const applyRoomDetails = useCallback(
    (
      roomId: string,
      details: { name?: string; description?: string | null; avatarUrl?: string | null },
    ) => {
      const patch: Partial<ChatRoomData> = {};
      if (details.name !== undefined) patch.name = details.name ?? "";
      if (details.description !== undefined) patch.description = details.description ?? "";
      if (details.avatarUrl !== undefined) patch.avatarUrl = details.avatarUrl || null;
      const me = currentUserIdRef.current;
      updateRooms((prev) =>
        prev.map((r) => (r.roomId === roomId ? transformChatRoom({ ...r, ...patch }, me) : r)),
      );
      roomStore.update(roomId, (s) => (s.room ? { ...s, room: { ...s.room, ...patch } } : s));
    },
    [updateRooms],
  );

  const dropRoom = useCallback(
    (roomId: string, options?: { byMe?: boolean }) => {
      const listed = chatRoomsRef.current.find((r) => r.roomId === roomId);
      const wasOpen = selectedRoomIdRef.current === roomId;
      if (!listed && !wasOpen) return;
      const name = listed?.displayName || roomStore.get(roomId).room?.name || "the group";

      if (wasOpen) {
        leaveChatRoom(roomId);
        const timer = joinTimersRef.current.get(roomId);
        if (timer) clearTimeout(timer);
        joinTimersRef.current.delete(roomId);
        selectedRoomIdRef.current = null;
        setSelectedRoomId(null);
      }
      updateRooms((prev) => prev.filter((r) => r.roomId !== roomId));
      roomStore.update(roomId, () => EMPTY_ROOM);
      readSentRef.current.delete(roomId);
      fetchUnreadCount();

      if (typeof window !== "undefined") {
        const detail: ChatRoomRemovedDetail = {
          roomId,
          name,
          byMe: Boolean(options?.byMe),
          wasOpen,
        };
        window.dispatchEvent(new CustomEvent(CHAT_ROOM_REMOVED_EVENT, { detail }));
      }
    },
    [leaveChatRoom, updateRooms, fetchUnreadCount],
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

  /** Forgets a message's files once it is stored or deleted. */
  const finishOutbox = useCallback((clientMessageId: string) => {
    const entry = outboxRef.current.get(clientMessageId);
    if (!entry) return;
    revokePreviews(entry);
    outboxRef.current.delete(clientMessageId);
  }, []);

  /** Records a pending bubble's upload progress for one file. */
  const setUploadProgress = useCallback(
    (roomId: string, clientMessageId: string, index: number, fraction: number) => {
      roomStore.update(roomId, (s) => {
        let changed = false;
        const messages = s.messages.map((m) => {
          if (m.clientMessageId !== clientMessageId || m.status !== "pending") return m;
          if (m.uploadProgress?.[index] === fraction) return m;
          const uploadProgress = [...(m.uploadProgress ?? [])];
          uploadProgress[index] = fraction;
          changed = true;
          return { ...m, uploadProgress };
        });
        return changed ? { ...s, messages } : s;
      });
    },
    [],
  );

  const emitSend = useCallback(
    async (message: ChatMessageView) => {
      const clientMessageId = message.clientMessageId;
      if (!clientMessageId || inFlightSendsRef.current.has(clientMessageId)) return;
      // Offline: stays pending and is sent on the next `connect`.
      if (!isSocketConnected()) return;

      inFlightSendsRef.current.add(clientMessageId);
      const entry = outboxRef.current.get(clientMessageId);
      let attachments: Awaited<ReturnType<typeof uploadAttachments>> = [];
      if (entry?.items.length) {
        try {
          // Items that already uploaded are skipped, so a retry only uploads the rest.
          attachments = await uploadAttachments(entry.items, uploadChatFile, {
            onProgress: (index, fraction) =>
              setUploadProgress(message.roomId, clientMessageId, index, fraction),
          });
        } catch (error) {
          inFlightSendsRef.current.delete(clientMessageId);
          markFailed(
            message.roomId,
            clientMessageId,
            error instanceof Error && error.message ? error.message : "Couldn't upload the file",
          );
          return;
        }
      }

      sendChatMessage({
        roomId: message.roomId,
        text: message.text,
        type: message.type,
        clientMessageId,
        ...(attachments.length ? { attachments } : {}),
        ...(message.type === "voice" && entry?.duration !== undefined
          ? { duration: entry.duration }
          : {}),
      }).then((ack) => {
        inFlightSendsRef.current.delete(clientMessageId);
        if (ack.ok && ack.message) {
          finishOutbox(clientMessageId);
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
        // The stored copy may already have replaced the bubble (chat-message came first).
        const stillLocal = roomStore
          .get(message.roomId)
          .messages.some((m) => m.clientMessageId === clientMessageId && m.status !== "sent");
        if (!stillLocal) finishOutbox(clientMessageId);
      });
    },
    [sendChatMessage, markFailed, isSocketConnected, setUploadProgress, finishOutbox],
  );

  // Subscriptions. The socket's listener registry keeps these across reconnects.
  useEffect(() => {
    const handleConnect = () => {
      // Rejoin + backfill the open room, then refresh the list and unread total.
      // A read mark lost in the drop failed its ack, so the rejoin sends it again.
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
      // Only a room being looked at right now stays at zero; otherwise it is read on focus.
      const isOpen = data.roomId === selectedRoomIdRef.current && isWindowActive();
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

    const handleMessagesRead = (data: MessagesReadData) => {
      if (!data?.roomId || !data.userId || !data.readAt) return;
      roomStore.update(data.roomId, (s) => {
        const messages = applyMessagesRead(s.messages, data.userId, data.readAt);
        return messages === s.messages ? s : { ...s, messages };
      });
    };

    const handleRoomRead = (data: RoomReadData) => {
      if (!data?.roomId) return;
      // Read on another device (or this one): clear the badge.
      updateRooms((prev) =>
        prev.some((r) => r.roomId === data.roomId && r.unreadCount)
          ? prev.map((r) => (r.roomId === data.roomId ? { ...r, unreadCount: 0 } : r))
          : prev,
      );
    };

    const handleRoomUpdated = (data: RoomUpdatedData) => {
      if (!data?.roomId) return;
      applyRoomDetails(data.roomId, data);
    };

    const handleParticipantsChanged = (data: ParticipantsChangedData) => {
      if (!data?.roomId) return;
      const me = currentUserIdRef.current;
      if (me && Array.isArray(data.removed) && data.removed.includes(me)) {
        dropRoom(data.roomId, { byMe: data.by === me });
        return;
      }
      const participants = Array.isArray(data.participants) ? data.participants : [];
      if (!chatRoomsRef.current.some((r) => r.roomId === data.roomId)) {
        // I was just added to this room.
        fetchChatRooms();
        return;
      }
      updateRooms((prev) =>
        prev.map((r) =>
          r.roomId === data.roomId ? transformChatRoom({ ...r, participants }, me) : r,
        ),
      );
      roomStore.update(data.roomId, (s) =>
        s === EMPTY_ROOM
          ? s
          : { ...s, participants, room: s.room ? { ...s.room, participants } : s.room },
      );
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
      onMessagesRead(handleMessagesRead),
      onRoomRead(handleRoomRead),
      onRoomUpdated(handleRoomUpdated),
      onParticipantsChanged(handleParticipantsChanged),
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
    onMessagesRead,
    onRoomRead,
    onRoomUpdated,
    onParticipantsChanged,
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
    dropRoom,
    applyRoomDetails,
    updateRooms,
  ]);

  // Coming back to the tab or window reads what arrived in the open room meanwhile.
  useEffect(() => {
    const readOpenRoom = () => {
      const roomId = selectedRoomIdRef.current;
      if (roomId) markRoomRead(roomId);
    };
    document.addEventListener("visibilitychange", readOpenRoom);
    window.addEventListener("focus", readOpenRoom);
    return () => {
      document.removeEventListener("visibilitychange", readOpenRoom);
      window.removeEventListener("focus", readOpenRoom);
    };
  }, [markRoomRead]);

  useEffect(() => {
    const timers = joinTimersRef.current;
    const outbox = outboxRef.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
      outbox.forEach(revokePreviews);
      outbox.clear();
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
          return chatRooms.filter((room) => room.type !== "one_to_one");
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
    (roomId: string, text: string, media?: OutgoingMedia) => {
      const trimmed = text.trim();
      const voice = media?.voice;
      const files = voice ? [voice.file] : media?.files ?? [];
      if (!roomId || (!trimmed && files.length === 0)) return;

      const me = userRef.current;
      const clientMessageId = createClientMessageId();

      // Files: local previews in the pending bubble until the stored message replaces it.
      const kinds: AttachmentKind[] = files.map((file) => (voice ? "audio" : fileKind(file)));
      const type = messageTypeFor(kinds, Boolean(voice));
      const duration = voice?.duration;
      const previewUrls: string[] = [];
      const attachments = files.map((file, i) => {
        const kind = kinds[i];
        let url = "";
        if (kind === "image" || kind === "video" || kind === "audio") {
          url = URL.createObjectURL(file);
          previewUrls.push(url);
        }
        return {
          url,
          type: kind,
          name: file.name,
          mimeType: file.type,
          size: file.size,
          ...(kind === "audio" && duration !== undefined ? { duration } : {}),
        };
      });
      if (files.length) {
        outboxRef.current.set(clientMessageId, {
          items: files.map((file, i) => ({ file, kind: kinds[i], duration })),
          duration,
          previewUrls,
        });
      }

      const pending: ChatMessageView = {
        _id: `local:${clientMessageId}`,
        roomId,
        clientMessageId,
        senderId: currentUserIdRef.current || "",
        senderName: `${me?.firstName || ""} ${me?.lastName || ""}`.trim() || "You",
        senderAvatar: me?.userAvatar ?? null,
        text: trimmed,
        type,
        attachments,
        duration,
        readBy: [],
        createdAt: new Date().toISOString(),
        status: "pending",
        uploadProgress: files.length ? files.map(() => 0) : undefined,
      };

      // The text (or caption) now lives in the bubble, so the composer can be cleared.
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

  const deleteMessage = useCallback(
    (roomId: string, clientMessageId: string) => {
      // A send already on its way can't be taken back.
      if (inFlightSendsRef.current.has(clientMessageId)) return;
      finishOutbox(clientMessageId);
      roomStore.update(roomId, (s) => ({
        ...s,
        messages: s.messages.filter(
          (m) => m.clientMessageId !== clientMessageId || m.status === "sent",
        ),
      }));
    },
    [finishOutbox],
  );

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
    dropRoom,
    applyRoomDetails,
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
