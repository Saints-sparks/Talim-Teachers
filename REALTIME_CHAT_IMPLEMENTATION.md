# Real-time Chat Implementation Guide

## Overview

This implementation provides a WhatsApp-like real-time chat experience with:
- **Automatic chat room fetching and sorting**
- **Real-time message notifications**
- **Online status indicators**
- **Unread message counts**
- **Seamless WebSocket connection management**

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌───────────────────┐
│   ChatSidebar   │◄──►│   ChatContext    │◄──►│ useRealtimeChat   │
└─────────────────┘    └──────────────────┘    └───────────────────┘
                                │                          │
                                ▼                          ▼
                       ┌──────────────────┐    ┌───────────────────┐
                       │ WebSocketContext │◄──►│   useWebSocket    │
                       └──────────────────┘    └───────────────────┘
                                │                          │
                                ▼                          ▼
                       ┌──────────────────┐    ┌───────────────────┐
                       │   Socket.IO      │◄──►│  Backend Gateway  │
                       │   Connection     │    │   (NestJS)        │
                       └──────────────────┘    └───────────────────┘
```

## Key Features

### 1. Automatic Connection Management
- Auto-connects when user is authenticated
- Handles reconnection on network issues
- Graceful disconnection on logout

### 2. Real-time Chat Room Updates
- Fetches all user's chat rooms on connection
- Automatically sorts by latest message
- Updates in real-time when new messages arrive

### 3. WhatsApp-like UI Features
- Online status indicators
- Unread message counts
- Last message preview
- Smart time formatting
- Visual connection status

### 4. Message Handling
- Real-time message delivery
- Toast notifications for new messages
- Automatic unread count updates
- Message read receipts

## Usage Examples

### Basic Chat Component

```tsx
import { useChat } from '@/app/context/ChatContext';
import { ChatMessage } from '@/app/hooks/useWebSocket';

export function ChatComponent() {
  const {
    chatRooms,
    isConnected,
    selectedRoomId,
    selectRoom,
    sendMessage,
    onNewMessage
  } = useChat();

  // Listen for new messages
  useEffect(() => {
    const unsubscribe = onNewMessage((message: ChatMessage) => {
      console.log('New message received:', message);
      // Handle new message (update UI, play sound, etc.)
    });

    return unsubscribe;
  }, [onNewMessage]);

  return (
    <div>
      <h2>Chats ({chatRooms.length})</h2>
      <div>Status: {isConnected ? '🟢 Connected' : '🔴 Disconnected'}</div>
      
      {chatRooms.map(room => (
        <div 
          key={room.roomId}
          onClick={() => selectRoom(room.roomId)}
          className={selectedRoomId === room.roomId ? 'selected' : ''}
        >
          <div>{room.displayName}</div>
          <div>{room.lastMessage?.content}</div>
          {room.unreadCount > 0 && (
            <span className="badge">{room.unreadCount}</span>
          )}
        </div>
      ))}
    </div>
  );
}
```

### Sending Messages

```tsx
import { useState } from 'react';
import { useChat } from '@/app/context/ChatContext';

export function MessageInput() {
  const [message, setMessage] = useState('');
  const { sendMessage, selectedRoomId } = useChat();

  const handleSend = () => {
    if (message.trim() && selectedRoomId) {
      sendMessage(message.trim());
      setMessage('');
    }
  };

  return (
    <div>
      <input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && handleSend()}
        placeholder="Type a message..."
      />
      <button onClick={handleSend}>Send</button>
    </div>
  );
}
```

### Real-time Search and Filtering

```tsx
import { useState } from 'react';
import { useChat } from '@/app/context/ChatContext';

export function ChatSearch() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'teachers' | 'groups'>('all');
  const { searchChatRooms, getFilteredChatRooms } = useChat();

  const displayRooms = searchTerm 
    ? searchChatRooms(searchTerm)
    : getFilteredChatRooms(filter);

  return (
    <div>
      <input
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Search chats..."
      />
      
      <select value={filter} onChange={(e) => setFilter(e.target.value as any)}>
        <option value="all">All Chats</option>
        <option value="teachers">Teachers</option>
        <option value="groups">Groups</option>
      </select>

      {displayRooms.map(room => (
        <div key={room.roomId}>{room.displayName}</div>
      ))}
    </div>
  );
}
```

## WebSocket Events

### Outgoing Events (Client → Server)

```typescript
// Fetch all chat rooms
socket.emit('fetch-chat-rooms');

// Join a specific chat room
socket.emit('join-chat-room', { roomId: 'room-123' });

// Send a message
socket.emit('send-chat-message', {
  content: 'Hello!',
  roomId: 'room-123',
  senderName: 'John Doe',
  type: 'text'
});

// Mark message as read
socket.emit('mark-message-read', { messageId: 'msg-123' });

// Fetch message history
socket.emit('fetch-messages', {
  roomId: 'room-123',
  limit: 20,
  cursor: 'msg-cursor',
  direction: 'before'
});
```

### Incoming Events (Server → Client)

```typescript
// Receive chat rooms update
socket.on('chat-rooms-update', (data) => {
  // data.rooms: Array of chat rooms sorted by latest message
  // Automatically triggers UI update
});

// Receive new message
socket.on('chat-message', (message) => {
  // Real-time message delivery
  // Automatically updates chat list order and unread counts
});

// Receive room data when joining
socket.on('chat-room-joined', (data) => {
  // Comprehensive room data with participants and message history
});

// Receive notifications
socket.on('notification', (notification) => {
  // System notifications (not just chat messages)
});
```

## Configuration

### Environment Variables

```env
# WebSocket server URL
NEXT_PUBLIC_WEBSOCKET_URL=http://localhost:3000

# Enable WebSocket debugging
NEXT_PUBLIC_WS_DEBUG=true
```

### Connection Settings

The WebSocket connection is configured with:
- **Auto-reconnection**: Up to 10 attempts
- **Fallback transport**: WebSocket → Polling
- **Timeout**: 20 seconds
- **Reconnection delay**: 1-3 seconds

## Best Practices

### 1. Error Handling
```tsx
const { error, isConnected, refreshChatRooms } = useChat();

if (error) {
  return (
    <div className="error-banner">
      <p>Connection error: {error}</p>
      <button onClick={refreshChatRooms}>Retry</button>
    </div>
  );
}
```

### 2. Loading States
```tsx
const { isLoading, chatRooms } = useChat();

if (isLoading) {
  return <div>Loading chats...</div>;
}
```

### 3. Optimistic Updates
```tsx
const { sendMessage, selectedRoomId } = useChat();

const handleSend = async (content: string) => {
  // Optimistically add message to UI
  const tempMessage = {
    content,
    senderId: currentUserId,
    timestamp: new Date(),
    _id: 'temp-' + Date.now()
  };
  
  // Add to local state immediately
  addMessageToChat(tempMessage);
  
  // Send to server
  sendMessage(content);
};
```

### 4. Memory Management
```tsx
useEffect(() => {
  const unsubscribe = onNewMessage(handleMessage);
  
  // Always clean up event listeners
  return unsubscribe;
}, [onNewMessage]);
```

## Troubleshooting

### Common Issues

1. **Connection not establishing**
   - Check `NEXT_PUBLIC_WEBSOCKET_URL` environment variable
   - Verify backend server is running
   - Check network connectivity

2. **Messages not appearing in real-time**
   - Ensure user is properly joined to the chat room
   - Check WebSocket connection status
   - Verify event listeners are properly set up

3. **Chat rooms not loading**
   - Check if user is authenticated
   - Verify `fetch-chat-rooms` event is being emitted
   - Check server logs for errors

### Debug Mode

Enable debugging by setting `NEXT_PUBLIC_WS_DEBUG=true` to see detailed console logs for:
- Connection attempts and status
- Event emissions and receptions
- State changes and updates
- Error conditions

## Performance Considerations

- **Pagination**: Message history is loaded with cursor-based pagination
- **Memory**: Old messages are automatically cleaned up
- **Network**: Only essential data is transmitted
- **Caching**: Online status and room data is cached efficiently

This implementation provides a production-ready, scalable chat system that handles all the complexities of real-time messaging while providing a smooth user experience similar to WhatsApp.
