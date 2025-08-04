"use client";

import React, { useState, useEffect } from 'react';
import { useWebSocketContext } from '@/app/contexts/WebSocketContext';
import { ChatMessage } from '@/app/hooks/useWebSocket';
import { useAuth } from '@/app/hooks/useAuth';

interface ChatComponentProps {
  roomId: string;
}

export const ChatComponent: React.FC<ChatComponentProps> = ({ roomId }) => {
  const { user } = useAuth();
  const { 
    isConnected, 
    joinChatRoom, 
    leaveChatRoom, 
    sendChatMessage, 
    onChatMessage, 
    onChatRoomHistory 
  } = useWebSocketContext();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isInRoom, setIsInRoom] = useState(false);

  // Join room when component mounts and WebSocket is connected
  useEffect(() => {
    if (isConnected && roomId && !isInRoom) {
      joinChatRoom(roomId);
      setIsInRoom(true);
    }

    return () => {
      if (isInRoom) {
        leaveChatRoom(roomId);
        setIsInRoom(false);
      }
    };
  }, [isConnected, roomId, isInRoom, joinChatRoom, leaveChatRoom]);

  // Listen for new messages
  useEffect(() => {
    const unsubscribe = onChatMessage((message: ChatMessage) => {
      if (message.roomId === roomId) {
        setMessages(prev => [...prev, message]);
      }
    });

    return unsubscribe;
  }, [onChatMessage, roomId]);

  // Listen for room history
  useEffect(() => {
    const unsubscribe = onChatRoomHistory((data) => {
      if (data.roomId === roomId) {
        setMessages(data.messages);
      }
    });

    return unsubscribe;
  }, [onChatRoomHistory, roomId]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !user || !isConnected) return;

    sendChatMessage({
      content: newMessage.trim(),
      roomId,
      senderName: `${user.firstName} ${user.lastName}`,
      type: 'text',
    });

    setNewMessage('');
  };

  if (!isConnected) {
    return (
      <div className="p-4 text-center text-gray-500">
        Not connected to chat service. Please wait...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-96 border rounded-lg bg-white">
      {/* Header */}
      <div className="p-3 border-b bg-gray-50 rounded-t-lg">
        <h3 className="font-medium">Chat Room: {roomId}</h3>
        <p className="text-xs text-gray-500">
          {isInRoom ? '✅ Joined' : '⏳ Joining...'}
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 p-3 overflow-y-auto space-y-2">
        {messages.length === 0 ? (
          <p className="text-gray-500 text-center">No messages yet</p>
        ) : (
          messages.map((message) => (
            <div
              key={message._id}
              className={`p-2 rounded max-w-xs ${
                message.senderId === user?._id
                  ? 'bg-blue-500 text-white ml-auto'
                  : 'bg-gray-100'
              }`}
            >
              <div className="text-xs opacity-75 mb-1">
                {message.senderName}
              </div>
              <div>{message.content}</div>
              <div className="text-xs opacity-75 mt-1">
                {new Date(message.timestamp).toLocaleTimeString()}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSendMessage} className="p-3 border-t">
        <div className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={!isConnected || !isInRoom}
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || !isConnected || !isInRoom}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
};
