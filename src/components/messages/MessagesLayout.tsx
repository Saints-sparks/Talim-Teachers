"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import ChatSidebar from "./ChatSidebar";
import GroupChat from "./GroupChat";
import PrivateChat from "./PrivateChat";
import { RealtimeChatRoom } from "@/app/hooks/useRealtimeChat";
import { useChat } from "@/app/context/ChatContext";
import { useChatRoom } from "@/app/hooks/useChatRoom";
import { messagesRoomUrl } from "@/app/hooks/useChatAlerts";

type ReplyingMessage = { sender: string; text: string } | null;

interface MessagesLayoutProps {
  openSubMenu: { index: number; type: string } | null;
  toggleSubMenu: (index: number, type: string) => void;
}

export default function MessagesLayout({
  openSubMenu,
  toggleSubMenu,
}: MessagesLayoutProps) {
  const [isMobile, setIsMobile] = useState(false);
  // Reply previews belong to the chat they were started in.
  const [repliesByRoom, setRepliesByRoom] = useState<Record<string, ReplyingMessage>>({});
  const router = useRouter();
  const searchParams = useSearchParams();
  const { chatRooms, selectRoom, unselectRoom } = useChat();

  // The open chat lives in the URL (/messages?room=<id>), so deep links, push
  // clicks, toasts and the browser back button all open the same way.
  const roomId = searchParams.get("room");
  const room = roomId ? chatRooms.find((r) => r.roomId === roomId) ?? null : null;
  const thread = useChatRoom(roomId);
  const roomType = room?.type ?? thread.room?.type ?? null;

  // Selecting a room is what joins it; exactly once per open chat.
  useEffect(() => {
    if (roomId) selectRoom(roomId);
    else unselectRoom();
  }, [roomId, selectRoom, unselectRoom]);

  // Leaving the messages page leaves the room.
  useEffect(() => () => unselectRoom(), [unselectRoom]);

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024); // lg breakpoint
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleSelectChat = (chat: { room?: RealtimeChatRoom }) => {
    if (chat.room && chat.room.roomId !== roomId) {
      router.push(messagesRoomUrl(chat.room.roomId));
    }
  };

  const handleBackToChats = () => {
    router.replace("/messages");
  };

  const setReplyingMessage = useCallback(
    (msg: ReplyingMessage) => {
      if (!roomId) return;
      setRepliesByRoom((prev) => ({ ...prev, [roomId]: msg }));
    },
    [roomId],
  );

  const selectedChat = Boolean(roomId);
  const threadProps = roomId
    ? {
        roomId,
        room,
        replyingMessage: repliesByRoom[roomId] ?? null,
        setReplyingMessage,
        openSubMenu,
        toggleSubMenu,
        onBack: handleBackToChats,
      }
    : null;

  return (
    <div className="flex h-full w-full bg-gray-50 relative">
      {/* Sidebar - Mobile: Take full container, Desktop: Fixed width panel */}
      <div className={`${
        isMobile 
          ? selectedChat 
            ? 'hidden' 
            : 'block w-full'
          : 'relative w-96 xl:w-80'
      } bg-white ${
        !isMobile ? 'border-r border-gray-200' : ''
      } flex flex-col h-full`}>
        <ChatSidebar onSelectChat={handleSelectChat} />
      </div>

      {/* Chat Area - Mobile: Take full container when shown, Desktop: Flexible width */}
      <div className={`${
        isMobile 
          ? selectedChat 
            ? 'block w-full' 
            : 'hidden'
          : selectedChat 
            ? 'flex flex-1' 
            : 'hidden lg:flex lg:flex-1'
      } flex-col bg-white h-full`} data-guide="messages-chat-area">
        {threadProps ? (
          roomType === "one_to_one" ? (
            <PrivateChat key={threadProps.roomId} {...threadProps} />
          ) : roomType ? (
            <GroupChat key={threadProps.roomId} {...threadProps} />
          ) : thread.joinStatus === "error" ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
              <p className="text-sm text-red-500">{thread.joinError || "Couldn't load this chat"}</p>
              <div className="flex gap-2">
                <button
                  className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm"
                  onClick={thread.retryJoin}
                >
                  Retry
                </button>
                <button
                  className="px-4 py-2 border border-gray-200 rounded-md text-sm"
                  onClick={handleBackToChats}
                >
                  Back to chats
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-2" />
              <p className="text-sm text-gray-500">Loading chat...</p>
            </div>
          )
        ) : (
          // Empty state for desktop when no chat is selected
          <div className="hidden lg:flex flex-1 items-center justify-center bg-gray-50">
            <div className="text-center text-gray-500">
              <div className="w-24 h-24 mx-auto mb-4 bg-gray-200 rounded-full flex items-center justify-center">
                <svg 
                  className="w-12 h-12 text-gray-400" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={1.5} 
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" 
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No chat selected
              </h3>
              <p className="text-sm text-gray-500 max-w-sm">
                Select a conversation from the sidebar to start messaging, or create a new group chat.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
