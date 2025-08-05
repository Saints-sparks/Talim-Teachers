"use client";

import { useWebSocketContext } from '@/app/contexts/WebSocketContext';
import { useChat } from '@/app/context/ChatContext';
import { useAuth } from '@/app/hooks/useAuth';

export default function WebSocketDebug() {
  const { isAuthenticated, user } = useAuth();
  const webSocket = useWebSocketContext();
  const chat = useChat();

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  const handleManualRefresh = () => {
    console.log('🔄 Manual refresh triggered');
    console.log('🔍 Current webSocket state:', {
      socket: webSocket.socket,
      connected: webSocket.socket?.connected,
      isConnected: webSocket.isConnected,
      fetchChatRoomsFunction: typeof webSocket.fetchChatRooms
    });
    
    try {
      webSocket.fetchChatRooms();
      console.log('✅ Manual fetchChatRooms called successfully');
    } catch (error) {
      console.error('❌ Error calling fetchChatRooms:', error);
    }
  };

  const handleChatRefresh = () => {
    console.log('🔄 Chat refresh triggered');
    try {
      chat.refreshChatRooms();
      console.log('✅ Chat refreshChatRooms called successfully');
    } catch (error) {
      console.error('❌ Error calling chat refreshChatRooms:', error);
    }
  };

  const handleSocketTest = () => {
    console.log('🧪 Testing socket connection...');
    console.log('Socket state:', {
      socket: webSocket.socket,
      connected: webSocket.socket?.connected,
      id: webSocket.socket?.id,
      url: webSocket.socket?.io?.uri || 'unknown'
    });
    
    // Test emitting a simple event
    if (webSocket.socket?.connected) {
      console.log('🧪 Emitting test event...');
      webSocket.socket.emit('test-event', { test: 'data' });
    } else {
      console.log('❌ Socket not connected for test');
    }
  };

  return (
    <div className="fixed bottom-4 right-4 bg-black text-white p-4 rounded-lg text-xs max-w-sm z-50">
      <h3 className="font-bold mb-2">🔍 Connection Debug</h3>
      
      <div className="mb-2">
        <strong>Auth:</strong>
        <div>Authenticated: {isAuthenticated ? '✅' : '❌'}</div>
        <div>User ID: {user?._id || user?.userId || 'None'}</div>
      </div>
      
      <div className="mb-2">
        <strong>WebSocket:</strong>
        <div>Connected: {webSocket.isConnected ? '✅' : '❌'}</div>
        <div>Status: {webSocket.connectionStatus}</div>
        <div>Socket: {webSocket.socket ? '✅' : '❌'}</div>
        <div>URL: {process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'http://localhost:5000'}</div>
      </div>
      
      <div className="mb-2">
        <strong>Chat:</strong>
        <div>Connected: {chat.isConnected ? '✅' : '❌'}</div>
        <div>Loading: {chat.isLoading ? '⏳' : '✅'}</div>
        <div>Rooms: {chat.chatRooms.length}</div>
        <div>Error: {chat.error || 'None'}</div>
      </div>

      <div className="flex gap-1 mt-2">
        <button 
          onClick={handleManualRefresh}
          className="px-2 py-1 bg-blue-600 rounded text-xs"
        >
          WS
        </button>
        <button 
          onClick={handleChatRefresh}
          className="px-2 py-1 bg-purple-600 rounded text-xs"
        >
          Chat
        </button>
        <button 
          onClick={handleSocketTest}
          className="px-2 py-1 bg-green-600 rounded text-xs"
        >
          Test
        </button>
      </div>
    </div>
  );
}
