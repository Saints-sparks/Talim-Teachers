import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/app/hooks/useAuth";
import { useWebSocketContext } from "@/app/contexts/WebSocketContext";
import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageBubble from "./PrivateMessageBubble";
import ReplyPreview from "./ReplyPreview";
import { Loader2 } from "lucide-react";
import { getChatMessages } from "@/app/services/chat.service";
import { ChatMessage as WebSocketChatMessage } from "@/app/hooks/useWebSocket";

// Define the message structure for our UI
interface Message {
  _id?: string;
  id?: string;
  sender: string;
  senderId?: string;
  senderName?: string;
  text?: string;
  content?: string;
  time?: string;
  createdAt?: string;
  type: string;
  senderType: string;
  avatar?: string;
  color?: string;
  roomId?: string;
  replyTo?: string;
}

interface PrivateChatProps {
  replyingMessage: { sender: string; text: string } | null;
  setReplyingMessage: (msg: any) => void;
  openSubMenu: { index: number; type: string } | null;
  toggleSubMenu: (index: number, type: string) => void;
  room?: any; // The selected chat room
}

export default function PrivateChat({
  replyingMessage,
  setReplyingMessage,
  openSubMenu,
  toggleSubMenu,
  room,
}: PrivateChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);
  
  // For cursor-based pagination
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [oldestMessageId, setOldestMessageId] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  
  // Refs for scroll management
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  
  const { getAccessToken, user } = useAuth();
  const webSocket = useWebSocketContext();
  
  // Cleanup function reference
  const cleanupRef = useRef<(() => void) | null>(null);
  
  // Fetch initial messages and join the chat room when a room is selected
  useEffect(() => {
    if (!room?._id && !room?.id) return;
    
    const roomId = room._id || room.id;
    let isMounted = true;
    
    setIsLoading(true);
    setError(null);
    
    // Join the chat room via WebSocket
    const joinChatRoom = () => {
      if (!webSocket.isConnected) {
        console.log('⚠️ WebSocket not connected. Will join room when connected.');
        return { messageListener: null, roomJoinedListener: null };
      }
      
      console.log(`🚪 Joining chat room: ${roomId}`);
      
      // Set up room history listener to receive initial messages
      const roomHistoryListener = (data: any) => {
        console.log('📥 Room history received:', data);
        
        if (!isMounted || data.roomId !== roomId) return;
        
        if (data.messages && Array.isArray(data.messages)) {
          const formattedMessages = data.messages.map((msg: any) => {
            // Handle different message structures
            const sender = msg.senderId && typeof msg.senderId === 'object' 
              ? `${msg.senderId.firstName || ''} ${msg.senderId.lastName || ''}`.trim() 
              : msg.senderName || 'Unknown';
              
            const senderId = msg.senderId && typeof msg.senderId === 'object'
              ? msg.senderId._id
              : msg.senderId;
              
            return {
              _id: msg._id || msg.id,
              sender: sender,
              senderId: senderId,
              text: msg.text || msg.content,
              time: new Date(msg.createdAt || msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              type: msg.type || 'text',
              senderType: senderId === user?.userId ? 'me' : 'other',
              color: senderId === user?.userId ? 'green' : 'blue',
            };
          });
          
          setMessages(formattedMessages);
          
          // Set oldest message ID for pagination
          if (formattedMessages.length > 0) {
            setOldestMessageId(formattedMessages[0]._id);
          }
          
          // Check if there are more messages to load
          setHasMore(data.hasMore || false);
        }
        
        setIsLoading(false);
      };
      
      // Register room history listener
      webSocket.socket?.on('chat-room-history', roomHistoryListener);
      
      // Join chat room using the WebSocketContextType method
      webSocket.joinChatRoom(roomId);
      
      // Set up chat message listener
      const messageListener = webSocket.onChatMessage(handleNewMessage);
      
      return { 
        messageListener, 
        roomHistoryListener: () => {
          webSocket.socket?.off('chat-room-history', roomHistoryListener);
        }
      };
    };
    
    const listeners = joinChatRoom();
    
    if (listeners.messageListener) {
      cleanupRef.current = listeners.messageListener;
    }
    
    // Clean up event listeners when component unmounts or room changes
    return () => {
      isMounted = false;
      if (webSocket.isConnected && roomId) {
        console.log(`🚪 Leaving chat room: ${roomId}`);
        webSocket.leaveChatRoom(roomId);
        
        if (cleanupRef.current) {
          cleanupRef.current();
          cleanupRef.current = null;
        }
        
        // Clean up room history listener
        if (listeners.roomHistoryListener) {
          listeners.roomHistoryListener();
        }
      }
    };
  }, [room, webSocket.isConnected]);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  // Handle WebSocket connection changes
  useEffect(() => {
    if (webSocket.isConnected && room) {
      const roomId = room._id || room.id;
      console.log(`🔄 WebSocket reconnected, rejoining room: ${roomId}`);
      
      webSocket.joinChatRoom(roomId);
      
      // Set up chat message listener and store cleanup function
      const unsubscribe = webSocket.onChatMessage(handleNewMessage);
      cleanupRef.current = unsubscribe;
      
      // Return cleanup function
      return unsubscribe;
    }
  }, [webSocket.isConnected]);
  
  // Handle new incoming messages via WebSocket
  const handleNewMessage = (newMessage: WebSocketChatMessage) => {
    console.log('📨 New message received:', newMessage);
    
    // Format the incoming message
    const formattedMessage: Message = {
      _id: newMessage._id,
      sender: newMessage.senderName || 'Unknown',
      senderId: newMessage.senderId,
      text: newMessage.content,
      time: new Date(newMessage.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: newMessage.type || 'text',
      senderType: newMessage.senderId === user?.userId ? 'me' : 'other',
      color: newMessage.senderId === user?.userId ? 'green' : 'blue',
    };
    
    setMessages(prevMessages => [...prevMessages, formattedMessage]);
  };
  
  // Handle sending a new message
  const handleSendMessage = () => {
    if (!messageInput.trim() || !room || isSending) return;
    
    const roomId = room._id || room.id;
    setIsSending(true);
    
    try {
      // Create message payload
      const messagePayload = {
        content: messageInput.trim(),
        roomId,
        senderName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'Unknown User' : 'Unknown User',
        type: 'text' as const
      };
      
      console.log('📤 Sending message:', messagePayload);
      
      // Send via WebSocket
      webSocket.sendChatMessage(messagePayload);
      
      // Clear input field
      setMessageInput('');
    } catch (err: any) {
      console.error('Error sending message:', err);
      // Display error toast/notification
    } finally {
      setIsSending(false);
    }
  };
  
  // Load older messages with pagination using WebSockets
  const loadMoreMessages = async () => {
    if (!room || !oldestMessageId || !hasMore || isLoadingMore) return;
    
    setIsLoadingMore(true);
    
    try {
      const roomId = room._id || room.id;
      
      // Store scroll position
      const scrollContainer = messagesContainerRef.current;
      const scrollHeight = scrollContainer?.scrollHeight;
      
      // Create a unique listener for this fetch operation
      const fetchMessagesListener = (data: any) => {
        console.log('📥 Fetched older messages:', data);
        
        if (data && Array.isArray(data.messages) && data.messages.length > 0) {
          const formattedMessages = data.messages.map((msg: any) => ({
            _id: msg._id || msg.id,
            sender: msg.senderName || 'Unknown',
            senderId: msg.senderId,
            text: msg.content,
            time: new Date(msg.createdAt || msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            type: msg.type || 'text',
            senderType: msg.senderId === user?.userId ? 'me' : 'other',
            color: msg.senderId === user?.userId ? 'green' : 'blue',
          }));
          
          // Update oldest message ID for next pagination
          if (formattedMessages.length > 0) {
            setOldestMessageId(formattedMessages[0]._id);
          }
          
          // Prepend older messages
          setMessages(prevMessages => [...formattedMessages, ...prevMessages]);
          
          // Check if there are more messages to load
          setHasMore(data.hasMore || false);
          
          // Restore scroll position
          if (scrollContainer && scrollHeight) {
            setTimeout(() => {
              scrollContainer.scrollTop = scrollContainer.scrollHeight - scrollHeight;
            }, 0);
          }
        } else {
          setHasMore(false);
        }
        
        setIsLoadingMore(false);
        
        // Remove the listener after we receive the response
        webSocket.socket?.off('messages-fetched', fetchMessagesListener);
      };
      
      // Register the listener
      webSocket.socket?.on('messages-fetched', fetchMessagesListener);
      
      // Emit fetch-messages event with cursor
      webSocket.socket?.emit('fetch-messages', {
        roomId,
        cursor: oldestMessageId,
        direction: 'before',
        limit: 20
      });
      
      // Set a timeout to clean up the listener if no response is received
      setTimeout(() => {
        webSocket.socket?.off('messages-fetched', fetchMessagesListener);
        setIsLoadingMore(false);
      }, 10000);
      
    } catch (err: any) {
      console.error('Error loading more messages:', err);
      setIsLoadingMore(false);
    }
  };
  
  // Handle scroll to load more messages
  const handleScroll = () => {
    const scrollContainer = messagesContainerRef.current;
    if (scrollContainer && scrollContainer.scrollTop === 0 && hasMore && !isLoadingMore) {
      loadMoreMessages();
    }
  };
  
  // Get the other participant's name and avatar
  const getOtherParticipant = () => {
    // For private chat, find the other user in the participants
    if (room?.participants && Array.isArray(room.participants)) {
      const otherUser = room.participants.find(
        (p: any) => p.userId !== user?.userId || p.id !== user?.userId
      );
      
      if (otherUser) {
        return {
          name: otherUser.name || 'Private Chat',
          avatar: otherUser.avatar || '/icons/direct-message.svg',
          status: room.status || ''
        };
      }
    }
    
    return {
      name: room?.name || 'Private Chat',
      avatar: '/icons/direct-message.svg',
      status: ''
    };
  };
  
  const otherParticipant = getOtherParticipant();
  
  return (
    <div className="lg:w-3/5 xl:w-2/3 flex flex-col relative">
      <div className="flex items-center rounded-tr-lg p-4 border-b bg-white">
        <ChatHeader
          avatar={otherParticipant.avatar}
          name={otherParticipant.name}
          status={otherParticipant.status}
        />
      </div>
      <div 
        className="flex-1 overflow-y-auto p-4 space-y-2 bg-[#F8F9FA]"
        ref={messagesContainerRef}
        onScroll={handleScroll}
      >
        {/* Loading indicator for more messages */}
        {isLoadingMore && (
          <div className="flex justify-center py-2">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
          </div>
        )}
        
        {/* Date divider */}
        <div className="text-center px-4 py-2 bg-white rounded-md w-fit mx-auto text-xs text-[#030E18] my-4">
          Today
        </div>
        
        {/* Main loading state */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-48">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-2" />
            <p className="text-sm text-gray-500">Loading messages...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-48">
            <p className="text-sm text-red-500 mb-2">{error}</p>
            <button 
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm"
              onClick={() => window.location.reload()}
            >
              Retry
            </button>
          </div>
        ) : !room ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="text-center p-8">
              <p className="text-sm text-gray-500 mb-2">Select a chat to start messaging</p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48">
            <p className="text-sm text-gray-500 mb-2">No messages yet</p>
            <p className="text-xs text-gray-400">Send a message to start the conversation</p>
          </div>
        ) : (
          messages.map((msg, index) => (
            <MessageBubble
              key={msg._id || index}
              msg={{
                sender: msg.sender,
                text: msg.text || msg.content || '',
                time: msg.time || '',
                type: msg.type,
                senderType: msg.senderType,
                avatar: msg.avatar || '/icons/user-placeholder.svg',
                color: msg.color || 'blue',
              }}
              index={index}
              openSubMenu={openSubMenu}
              toggleSubMenu={toggleSubMenu}
              setReplyingMessage={setReplyingMessage}
            />
          ))
        )}
        
        {/* Invisible element to scroll to */}
        <div ref={messagesEndRef} />
      </div>
      
      {replyingMessage && (
        <ReplyPreview
          replyingMessage={replyingMessage}
          onCancel={() => setReplyingMessage(null)}
        />
      )}
      
      <MessageInput 
        value={messageInput}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMessageInput(e.target.value)}
        onSend={handleSendMessage}
        disabled={!room || isSending || !webSocket.isConnected}
        placeholder={
          !webSocket.isConnected 
            ? "Connecting..." 
            : !room 
              ? "Select a chat to start messaging" 
              : "Type a message..."
        }
      />
    </div>
  );
}
