"use client";

import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useWebSocket, WebSocketContextType } from '../hooks/useWebSocket';

const WebSocketContext = createContext<WebSocketContextType | null>(null);

interface WebSocketProviderProps {
  children: ReactNode;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const webSocket = useWebSocket();

  // Add debugging for auth state
  console.log('🔍 WebSocketProvider state:', { 
    isAuthenticated, 
    userId: user?._id || user?.userId, // Check both _id and userId
    isConnected: webSocket.isConnected,
    connectionStatus: webSocket.connectionStatus,
    userObject: user
  });

  // Auto-connect when user is authenticated
  useEffect(() => {
    // Use either _id or userId property
    const userId = user?._id || user?.userId;
    
    console.log('🔍 WebSocket useEffect triggered:', { 
      isAuthenticated, 
      userId: userId, 
      isConnected: webSocket.isConnected,
      connectionStatus: webSocket.connectionStatus
    });
    
    if (isAuthenticated && userId && !webSocket.isConnected && webSocket.connectionStatus !== 'connecting') {
      console.log('🔌 Auto-connecting WebSocket for user:', userId);
      console.log('🔌 WebSocket URL:', process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'http://localhost:5000');
      webSocket.connect(userId);
    } else if (!isAuthenticated && webSocket.isConnected) {
      console.log('🔌 Auto-disconnecting WebSocket - user not authenticated');
      webSocket.disconnect();
    } else {
      console.log('🔍 No WebSocket action needed:', {
        isAuthenticated,
        hasUserId: !!userId,
        isConnected: webSocket.isConnected,
        connectionStatus: webSocket.connectionStatus
      });
    }
  }, [isAuthenticated, user?._id, user?.userId, webSocket.isConnected, webSocket.connectionStatus]);

  return (
    <WebSocketContext.Provider value={webSocket}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocketContext = (): WebSocketContextType => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocketContext must be used within a WebSocketProvider');
  }
  return context;
};
