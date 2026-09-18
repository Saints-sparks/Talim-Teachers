"use client";

import React, { createContext, useContext, useEffect, ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { useWebSocket, WebSocketContextType } from "../hooks/useWebSocket";

const WebSocketContext = createContext<WebSocketContextType | null>(null);

interface WebSocketProviderProps {
  children: ReactNode;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({
  children,
}) => {
  const { isAuthenticated, user } = useAuth();
  const webSocket = useWebSocket();
  const userId = user?.userId || user?._id;
  const { connect, disconnect } = webSocket;

  // One socket per signed-in user. Socket.IO reconnects it by itself, so this only
  // runs when the user signs in, switches or signs out.
  useEffect(() => {
    if (isAuthenticated && userId) {
      connect(userId);
      return () => disconnect();
    }
    disconnect();
  }, [isAuthenticated, userId, connect, disconnect]);

  return (
    <WebSocketContext.Provider value={webSocket}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocketContext = (): WebSocketContextType => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error(
      "useWebSocketContext must be used within a WebSocketProvider",
    );
  }
  return context;
};

// Safe variant — returns null instead of throwing when used outside the provider.
// Use this anywhere hooks must be called unconditionally (e.g. inside custom hooks
// that want to degrade gracefully rather than crash the tree).
export const useWebSocketContextSafe = (): WebSocketContextType | null => {
  return useContext(WebSocketContext);
};
