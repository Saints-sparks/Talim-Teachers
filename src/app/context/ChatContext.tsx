"use client";

import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { useRealtimeChat, RealtimeChatRoom } from '@/app/hooks/useRealtimeChat';
import { ChatMessage } from '@/app/hooks/useWebSocket';

interface ChatContextType {
  // Chat state
  chatRooms: RealtimeChatRoom[];
  isLoading: boolean;
  isConnected: boolean;
  error: string | null;
  
  // Current chat selection
  selectedRoomId: string | null;
  selectedRoom: RealtimeChatRoom | null;
  
  // Chat operations
  refreshChatRooms: () => void;
  searchChatRooms: (searchTerm: string) => RealtimeChatRoom[];
  getFilteredChatRooms: (type?: string) => RealtimeChatRoom[];
  
  // Room management
  selectRoom: (roomId: string) => void;
  unselectRoom: () => void;
  
  // Message operations
  sendMessage: (content: string, type?: 'text' | 'voice', duration?: number) => void;
  markAsRead: (messageId: string) => void;
  
  // Event handlers
  onNewMessage: (callback: (message: ChatMessage) => void) => () => void;
  onRoomUpdate: (callback: (roomId: string, room: RealtimeChatRoom) => void) => () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

interface ChatProviderProps {
  children: ReactNode;
}

export const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
  const realtimeChat = useRealtimeChat();
  
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
