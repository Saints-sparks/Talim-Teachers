# WebSocket Integration Documentation

## Overview

This document describes the WebSocket implementation for the Talim Teachers application, enabling real-time notifications and chat functionality.

## Architecture

### Backend
- **Unified WebSocket Gateway**: Located at `talim/src/modules/shared/gateways/unified-websocket.gateway.ts`
- **Connection URL**: `ws://localhost:3000`
- **Features**: Chat messaging, notifications, real-time updates

### Frontend
- **WebSocket Hook**: `src/app/hooks/useWebSocket.ts`
- **WebSocket Context**: `src/app/contexts/WebSocketContext.tsx`
- **Components**: Status display and chat components

## Implementation Details

### 1. WebSocket Hook (`useWebSocket.ts`)

The main hook provides:
- Connection management (connect/disconnect/reconnect)
- Chat functionality (join/leave rooms, send messages)
- Event listeners for messages and notifications
- Automatic reconnection with exponential backoff

### 2. WebSocket Context (`WebSocketContext.tsx`)

Provides WebSocket functionality across the app:
- Auto-connects when user is authenticated
- Auto-disconnects when user logs out
- Provides hook for components to access WebSocket functions

### 3. Integration with Authentication

The WebSocket automatically:
- Connects when user logs in (using user._id)
- Disconnects when user logs out
- Maintains connection state synchronized with auth state

## Usage Examples

### Basic Integration

```tsx
import { useWebSocketContext } from '@/app/contexts/WebSocketContext';

const MyComponent = () => {
  const { isConnected, connectionStatus } = useWebSocketContext();
  
  return (
    <div>
      Status: {connectionStatus}
      {isConnected ? '🟢' : '🔴'}
    </div>
  );
};
```

### Chat Functionality

```tsx
import { useWebSocketContext } from '@/app/contexts/WebSocketContext';

const ChatExample = () => {
  const { 
    joinChatRoom, 
    sendChatMessage, 
    onChatMessage 
  } = useWebSocketContext();

  // Join a room
  useEffect(() => {
    joinChatRoom('room-123');
  }, []);

  // Listen for messages
  useEffect(() => {
    const unsubscribe = onChatMessage((message) => {
      console.log('New message:', message);
    });
    return unsubscribe;
  }, []);

  // Send a message
  const sendMessage = () => {
    sendChatMessage({
      content: 'Hello!',
      roomId: 'room-123',
      senderName: 'Teacher Name',
      type: 'text'
    });
  };
};
```

### Notification Handling

```tsx
const NotificationExample = () => {
  const { onNotification } = useWebSocketContext();

  useEffect(() => {
    const unsubscribe = onNotification((notification) => {
      // Notification automatically shows as toast
      // Additional custom handling can be done here
      console.log('Received notification:', notification);
    });
    return unsubscribe;
  }, []);
};
```

## Components

### WebSocketStatus Component

Shows real-time connection status in the header:
- 🟢 Connected
- 🟡 Connecting
- ⚫ Disconnected
- 🔴 Error (with retry button)

### ChatComponent (Demo)

A full-featured chat component that demonstrates:
- Room joining/leaving
- Message sending/receiving
- Message history
- Real-time updates

## Configuration

### Environment Variables

Create `.env.local`:
```env
NEXT_PUBLIC_WEBSOCKET_URL=ws://localhost:3000
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
```

### Backend Requirements

Ensure the backend WebSocket gateway is running:
1. Redis server (for WebSocket scaling)
2. MongoDB (for message storage)
3. NestJS application with WebSocket gateway

## Events

### Client to Server
- `join-chat-room`: Join a chat room
- `leave-chat-room`: Leave a chat room
- `send-chat-message`: Send a message to a room
- `mark-message-read`: Mark a message as read

### Server to Client
- `chat-message`: New chat message received
- `chat-room-history`: Chat room message history
- `notification`: New notification received
- `error`: Error occurred

## Error Handling

The WebSocket implementation includes:
- Automatic reconnection on connection loss
- Exponential backoff for reconnection attempts
- Toast notifications for connection status
- Graceful degradation when WebSocket is unavailable

## Security

- Authentication required for WebSocket connection
- User ID passed in connection query
- Message validation on backend
- Room-based access control

## Testing

To test the WebSocket functionality:

1. **Connection Test**: Check the WebSocket status indicator in the header
2. **Chat Test**: Use the ChatComponent with a test room ID
3. **Notification Test**: Trigger notifications from backend and verify toast display
4. **Reconnection Test**: Disconnect internet and verify auto-reconnection

## Production Considerations

1. **WebSocket URL**: Update `NEXT_PUBLIC_WEBSOCKET_URL` for production
2. **SSL/TLS**: Use `wss://` for secure WebSocket connections
3. **Load Balancing**: Configure sticky sessions for WebSocket connections
4. **Rate Limiting**: Implement rate limiting for message sending
5. **Monitoring**: Monitor WebSocket connection health and message throughput

## Troubleshooting

### Common Issues

1. **Connection Failed**: Check backend is running and WebSocket URL is correct
2. **Auto-disconnect**: Verify user authentication state
3. **Messages Not Received**: Check room joining and message event listeners
4. **Toast Overflow**: Notifications automatically show as toasts - limit frequency if needed

### Debug Logging

WebSocket events are logged to console with prefixes:
- `🔌` Connection events
- `📨` Chat events  
- `📡` Notification events
- `🔄` Reconnection events

## Future Enhancements

Potential improvements:
1. **Message Encryption**: End-to-end encryption for sensitive messages
2. **File Sharing**: Support for file attachments in chat
3. **Voice Messages**: Voice note recording and playback
4. **Typing Indicators**: Show when users are typing
5. **Read Receipts**: Show message read status
6. **Push Notifications**: Integration with browser push notifications
