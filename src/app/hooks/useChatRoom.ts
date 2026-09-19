"use client";

import { useCallback, useSyncExternalStore } from "react";
import { useChat } from "../context/ChatContext";
import { EMPTY_ROOM, roomStore } from "../lib/chat/roomStore";
import type { OutgoingMedia } from "./useRealtimeChat";

/**
 * One chat thread: its messages, loading state and actions. Private and group
 * chats both read through this, so they behave the same. Joining and leaving is
 * done by selecting the room (see MessagesLayout), never here.
 */
export function useChatRoom(roomId: string | null) {
  const chat = useChat();
  const state = useSyncExternalStore(
    roomStore.subscribe,
    () => roomStore.get(roomId),
    () => EMPTY_ROOM,
  );

  const { sendMessage, retryMessage, deleteMessage, deleteStoredMessage, loadOlderMessages, retryJoin, setDraft } = chat;

  const send = useCallback(
    (text: string, media?: OutgoingMedia) => {
      if (roomId) sendMessage(roomId, text, media);
    },
    [roomId, sendMessage],
  );
  const retry = useCallback(
    (clientMessageId: string) => {
      if (roomId) retryMessage(roomId, clientMessageId);
    },
    [roomId, retryMessage],
  );
  const remove = useCallback(
    (clientMessageId: string) => {
      if (roomId) deleteMessage(roomId, clientMessageId);
    },
    [roomId, deleteMessage],
  );
  const removeStored = useCallback(
    (messageId: string) => (roomId ? deleteStoredMessage(roomId, messageId) : Promise.resolve()),
    [roomId, deleteStoredMessage],
  );
  const loadOlder = useCallback(() => {
    if (roomId) loadOlderMessages(roomId);
  }, [roomId, loadOlderMessages]);
  const retryLoad = useCallback(() => {
    if (roomId) retryJoin(roomId);
  }, [roomId, retryJoin]);
  const updateDraft = useCallback(
    (text: string) => {
      if (roomId) setDraft(roomId, text);
    },
    [roomId, setDraft],
  );

  return {
    ...state,
    isConnected: chat.isConnected,
    currentUserId: chat.currentUserId,
    send,
    retry,
    remove,
    removeStored,
    loadOlder,
    retryJoin: retryLoad,
    setDraft: updateDraft,
  };
}
