"use client";

import React, { createContext, useContext, ReactNode } from 'react';
import {
  useRealtimeChat,
  RealtimeChatRoom,
  UseRealtimeChatReturn,
} from '@/app/hooks/useRealtimeChat';
import { useChatAlerts } from '@/app/hooks/useChatAlerts';

interface ChatContextType extends UseRealtimeChatReturn {
  selectedRoom: RealtimeChatRoom | null;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

interface ChatProviderProps {
  children: ReactNode;
}

export const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
  const realtimeChat = useRealtimeChat();

  // App-wide chat toasts, tab title, notification events and push clicks.
  useChatAlerts({
    currentUserId: realtimeChat.currentUserId,
    totalUnread: realtimeChat.totalUnread,
    isRoomOpen: realtimeChat.isRoomOpen,
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

export const useChat = (): ChatContextType => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

export default ChatContext;
