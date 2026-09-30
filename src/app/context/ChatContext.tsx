"use client";

import React, { createContext, useContext, ReactNode } from 'react';
import {
  useRealtimeChat,
  RealtimeChatRoom,
  UseRealtimeChatReturn,
} from '@/app/hooks/useRealtimeChat';
import { useChatAlerts } from '@/app/hooks/useChatAlerts';
import { useTeacherPreferences } from '@/hooks/settings/useTeacherSettings';

interface ChatContextType extends UseRealtimeChatReturn {
  selectedRoom: RealtimeChatRoom | null;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

interface ChatProviderProps {
  children: ReactNode;
}

/**
 * Holds the live chat for the whole app: the realtime engine, the app-wide
 * alerts (toasts, the new-message sound with the teacher's "Sound for new
 * messages" preference, the tab title, push clicks) and the selected room.
 *
 * @param props - The app tree.
 * @param props.children - Everything under the provider.
 * @returns The provider.
 */
export const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
  const realtimeChat = useRealtimeChat();
  const { preferences } = useTeacherPreferences();

  // App-wide chat toasts, the new-message sound, tab title, notification events and push clicks.
  useChatAlerts({
    currentUserId: realtimeChat.currentUserId,
    totalUnread: realtimeChat.totalUnread,
    isRoomOpen: realtimeChat.isRoomOpen,
    soundEnabled: preferences.messages?.soundEnabled === true,
  });

  // Find selected room
  const selectedRoom = realtimeChat.selectedRoomId
    ? realtimeChat.chatRooms.find(room => room.roomId === realtimeChat.selectedRoomId) || null
    : null;

  const contextValue: ChatContextType = {
    ...realtimeChat,
    selectedRoom,
  };

  return (
    <ChatContext.Provider value={contextValue}>
      {children}
    </ChatContext.Provider>
  );
};

/**
 * The live chat: rooms, the open room's actions and the connection.
 *
 * @returns The chat context.
 * @throws When used outside `ChatProvider`.
 */
export const useChat = (): ChatContextType => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

export default ChatContext;
