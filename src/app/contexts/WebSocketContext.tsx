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

  // Auto-connect when user is authenticated
  useEffect(() => {
    const userId = user?.userId || user?._id;
    
    if (isAuthenticated && userId && !webSocket.isConnected && webSocket.connectionStatus !== 'connecting') {
      webSocket.connect(userId);
    } else if (!isAuthenticated && webSocket.isConnected) {
      webSocket.disconnect();
    }
  }, [isAuthenticated, user?.userId, user?._id, webSocket.isConnected, webSocket.connectionStatus, webSocket.connect, webSocket.disconnect]);

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
