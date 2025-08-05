# WebSocket Debug Steps

## Issues Fixed:

### 1. User ID Consistency ✅

- **Problem**: Frontend was using `user._id` but backend expects the actual unique identifier
- **Solution**: Now consistently using `user?.userId || user?._id` throughout the application
- **Files Updated**:
  - `useRealtimeChat.ts`: All user ID references
  - `WebSocketContext.tsx`: Connection user ID
  - `useAuth.ts`: Added debug logs for user ID fields

### 2. Automatic Chat Rooms Fetch ✅

- **Problem**: Chat rooms were not fetching automatically on page load
- **Solution**: Added multiple fallback mechanisms:
  1. WebSocket auto-emits `fetch-chat-rooms` 1 second after connection
  2. useRealtimeChat triggers fetch immediately when connected
  3. Backup fetch after 2 seconds for reliability
- **Files Updated**:
  - `useWebSocket.ts`: Added auto-fetch in connection event
  - `useRealtimeChat.ts`: Enhanced connection effect with immediate + backup fetch

### 3. Enhanced Debug Logging ✅

- **Added comprehensive logging throughout the WebSocket flow**
- **Files Updated**:
  - All WebSocket-related files now have detailed console logs

## Debug Flow:

1. **Login** → User data stored with `_id` and `userId` fields
2. **WebSocketContext** → Detects auth, connects with `userId || _id`
3. **WebSocket Connection** → Auto-emits `fetch-chat-rooms` after 1s
4. **useRealtimeChat** → Also triggers fetch when connection detected
5. **Backend** → Receives event, processes with `userId`, emits `chat-rooms-update`
6. **Frontend** → Receives update, transforms data, displays rooms

## Expected Console Output:

```
🔍 Login - User ID fields: { _id: "...", userId: "...", preferredId: "..." }
🔌 Auto-connecting WebSocket for user: ...
WebSocket connected: [socket-id]
🔄 Auto-fetching chat rooms after WebSocket connection...
📨 fetchChatRooms called: { isConnected: true, socketId: "..." }
📨 Emitting fetch-chat-rooms event via WebSocket
🔍 useRealtimeChat: Connection effect triggered: { isConnected: true, userId: "...", socketConnected: true }
🔄 Fetching chat rooms automatically...
🔄 Backup fetch attempt...
📨 Chat rooms updated: [rooms data]
```

## Troubleshooting:

### If chat rooms still don't load automatically:

1. **Check WebSocket connection**: Look for "WebSocket connected: [id]" in console
2. **Check user ID**: Ensure `userId` or `_id` is present in user object
3. **Check backend**: Look for backend logs showing fetch-chat-rooms received
4. **Check network**: Verify WebSocket connection in browser dev tools Network tab

### If manual refresh works but auto doesn't:

- This suggests a timing issue - the multiple fallback mechanisms should resolve this

### Backend Issues to Check:

1. **User ID recognition**: Backend should receive correct userId in `client.handshake.query.userId`
2. **Chat rooms data**: Backend should find and return rooms for that user
3. **Error handling**: Check backend logs for any errors in `handleFetchChatRooms`

## Test Steps:

1. Clear browser cache/localStorage
2. Login fresh
3. Navigate to messages page
4. Watch console for the expected flow above
5. Chat rooms should populate within 2-3 seconds automatically
