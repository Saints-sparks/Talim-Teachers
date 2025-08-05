"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage } from "@radix-ui/react-avatar";
import { Search, ChevronDown, CheckCheck, Loader2, Users, MessageCircle, Wifi, WifiOff } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Image from "next/image";
import { useState, useEffect } from "react";
import CreateGroupModal from "./CreateGroupModal";
import { useChat } from "@/app/context/ChatContext";
import { RealtimeChatRoom } from "@/app/hooks/useRealtimeChat";

interface ChatSidebarProps {
  onSelectChat: (chat: { type: "private" | "group"; room?: RealtimeChatRoom }) => void;
}

export default function ChatSidebar({ onSelectChat }: ChatSidebarProps) {
  const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "teachers" | "groups">("all");
  
  const { 
    chatRooms, 
    isLoading, 
    isConnected, 
    error, 
    refreshChatRooms, 
    searchChatRooms, 
    getFilteredChatRooms,
    selectRoom,
    selectedRoomId
  } = useChat();

  // Get filtered and searched rooms
  const getDisplayRooms = (): RealtimeChatRoom[] => {
    let rooms = getFilteredChatRooms(filterType);
    
    if (searchTerm.trim()) {
      rooms = searchChatRooms(searchTerm);
    }
    
    return rooms;
  };

  const displayRooms = getDisplayRooms();

  const handleSelectChat = (room: RealtimeChatRoom) => {
    selectRoom(room.roomId);
    onSelectChat({ 
      type: room.type === 'one_to_one' ? "private" : "group", 
      room 
    });
  };

  const handleFilterChange = (newFilter: "all" | "teachers" | "groups") => {
    setFilterType(newFilter);
  };

  const formatTime = (timestamp: Date | string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 24 * 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  return (
    <div className="lg:w-2/5 xl:w-1/3 border-r p-4 bg-white rounded-tl-lg flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg text-[#030E18] flex items-center gap-2">
          Messages
          {isConnected ? (
            <Wifi className="w-4 h-4 text-green-500" />
          ) : (
            <WifiOff className="w-4 h-4 text-red-500" />
          )}
        </h2>
        {isLoading && <Loader2 className="w-4 h-4 animate-spin text-gray-500" />}
      </div>

      {error && (
        <div className="mb-4 p-2 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
          <button 
            onClick={refreshChatRooms}
            className="text-xs text-red-700 underline mt-1"
          >
            Retry
          </button>
        </div>
      )}

      <div className="flex items-center gap-2 mb-4">
        <div className="flex items-center border border-[#F0F0F0] shadow-none rounded-lg px-3 w-full bg-white">
          <Search className="text-[#898989]" size={18} />
          <Input
            className="border-0 shadow-none focus-visible:ring-0 focus:outline-none flex-1"
            placeholder="Search messages..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="flex text-[#595959] h-full rounded-lg shadow-none border-[#F0F0F0] hover:bg-[#F0F0F0] bg-transparent items-center gap-1 capitalize"
            >
              {filterType} <ChevronDown size={16} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="font-manrope" align="end">
            <DropdownMenuItem onClick={() => handleFilterChange('all')}>
              All
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleFilterChange('teachers')}>
              Teachers
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleFilterChange('groups')}>
              Groups
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide">
        <div 
          className="flex gap-4 p-3 px-5 hover:bg-gray-200 rounded cursor-pointer"
          onClick={() => setIsCreateGroupModalOpen(true)}
        >
          <Image
            src="/icons/student.svg"
            alt="Students"
            width={20}
            height={20}
          />
          <div className="flex flex-col">
            <p className="font-medium">Create Group</p>
            <p className="text-[#7B7B7B] text-sm">Add students in one place</p>
          </div>
        </div>

        {!isConnected && (
          <div className="flex items-center justify-center p-4 text-gray-500">
            <div className="text-center">
              <WifiOff className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm">Connecting to chat...</p>
            </div>
          </div>
        )}

        {isConnected && displayRooms.length === 0 && !isLoading && (
          <div className="flex items-center justify-center p-4 text-gray-500">
            <div className="text-center">
              <MessageCircle className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm">
                {searchTerm ? 'No chats found' : 'No chats yet'}
              </p>
            </div>
          </div>
        )}

        {displayRooms.map((room) => (
          <div
            key={room.roomId}
            className={`flex items-start gap-3 p-3 hover:bg-gray-200 rounded cursor-pointer transition-colors ${
              selectedRoomId === room.roomId ? 'bg-blue-50 border-l-4 border-blue-500' : ''
            }`}
            onClick={() => handleSelectChat(room)}
          >
            <div className="relative w-10 h-10 flex-shrink-0">
              {room.avatarInfo.type === 'image' ? (
                <Avatar className="w-10 h-10 rounded-full bg-gray-300">
                  <AvatarImage src={room.avatarInfo.value} />
                </Avatar>
              ) : (
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
                  style={{ backgroundColor: room.avatarInfo.bgColor }}
                >
                  {room.avatarInfo.value}
                </div>
              )}
              {room.type === 'one_to_one' && (
                <span 
                  className={`absolute bottom-0 right-0 w-3 h-3 border-2 border-white rounded-full ${
                    room.isOnline ? 'bg-green-500' : 'bg-gray-400'
                  }`}
                />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="font-medium text-[#030E18] truncate">
                  {room.displayName}
                </p>
                <span className="text-xs text-[#646464] flex-shrink-0 ml-2">
                  {room.lastMessage?.timestamp && formatTime(room.lastMessage.timestamp)}
                </span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <p className="text-sm text-[#7B7B7B] truncate">
                  {room.lastMessage?.content || "No messages yet"}
                </p>
                {room.unreadCount > 0 && (
                  <span className="inline-flex items-center justify-center min-w-5 h-5 px-1 text-xs font-medium text-white bg-blue-600 rounded-full ml-2">
                    {room.unreadCount > 99 ? '99+' : room.unreadCount}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <CreateGroupModal
        open={isCreateGroupModalOpen}
        onOpenChange={setIsCreateGroupModalOpen}
      />
    </div>
  );
}
