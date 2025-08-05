"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { 
  Search, 
  ChevronDown, 
  CheckCheck, 
  Loader2, 
  Users, 
  MessageCircle, 
  Wifi, 
  WifiOff,
  Plus,
  Filter
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState, useEffect } from "react";
import CreateGroupModal from "./CreateGroupModal";
import { useChat } from "@/app/context/ChatContext";
import { RealtimeChatRoom } from "@/app/hooks/useRealtimeChat";
import { generateColorFromString, getUserInitials } from "@/lib/colorUtils";

interface ChatSidebarProps {
  onSelectChat: (chat: { type: "private" | "group"; room?: RealtimeChatRoom }) => void;
  className?: string; // For responsive hiding/showing
}

export default function ChatSidebar({ onSelectChat, className = "" }: ChatSidebarProps) {
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
    <div className={`w-full h-full border-r bg-white flex flex-col ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 sm:p-4 border-b border-gray-100 bg-white">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 flex items-center gap-2">
          Messages
          {isConnected ? (
            <Wifi className="w-4 h-4 text-green-500" />
          ) : (
            <WifiOff className="w-4 h-4 text-red-500" />
          )}
        </h2>
        {isLoading && <Loader2 className="w-4 h-4 animate-spin text-gray-500" />}
      </div>

      {/* Search Section */}
      <div className="p-3 sm:p-4 space-y-3 bg-white border-b border-gray-50">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
          <Input
            className="pl-9 pr-4 py-3 sm:py-2.5 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-blue-500 transition-all duration-200 text-sm placeholder:text-gray-500 touch-manipulation"
            placeholder="Search conversations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-2 text-gray-600 border-gray-200 hover:bg-gray-50 active:bg-gray-100 capitalize rounded-lg px-3 py-2.5 sm:py-2 text-xs touch-manipulation"
              >
                <Filter size={12} />
                {filterType}
                <ChevronDown size={12} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-32">
              <DropdownMenuItem onClick={() => handleFilterChange('all')}>
                All Chats
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
      </div>

      {/* Error Display */}
      {error && (
        <div className="mx-3 sm:mx-4 mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
          <button 
            onClick={refreshChatRooms}
            className="text-xs text-red-700 underline mt-1 hover:text-red-800"
          >
            Retry
          </button>
        </div>
      )}

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto bg-white">
        {/* Create Group Button */}
        <div className="px-3 sm:px-4 mb-2">
          <button
            className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 active:bg-gray-100 rounded-xl transition-colors text-left group touch-manipulation"
            onClick={() => setIsCreateGroupModalOpen(true)}
          >
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 group-hover:bg-blue-200 group-active:bg-blue-300 transition-colors">
              <Plus className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 text-sm">Create Group</p>
              <p className="text-xs text-gray-500 truncate">Add students in one place</p>
            </div>
          </button>
        </div>

        {/* Connection Status */}
        {!isConnected && (
          <div className="flex items-center justify-center p-6 text-gray-500">
            <div className="text-center">
              <WifiOff className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm">Connecting to chat...</p>
            </div>
          </div>
        )}

        {/* Empty State */}
        {isConnected && displayRooms.length === 0 && !isLoading && (
          <div className="flex items-center justify-center p-6 text-gray-500">
            <div className="text-center">
              <MessageCircle className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm">
                {searchTerm ? 'No chats found' : 'No chats yet'}
              </p>
              {!searchTerm && (
                <p className="text-xs text-gray-400 mt-1">
                  Start by creating a group chat
                </p>
              )}
            </div>
          </div>
        )}

        {/* Chat Items */}
        <div className="px-2 sm:px-3">
          {displayRooms.map((room) => {
            const roomInitials = getUserInitials(room.displayName);
            const roomBgColor = generateColorFromString(room.displayName);
            
            return (
              <div
                key={room.roomId}
                className={`flex items-center gap-3 p-3 mx-1 hover:bg-gray-50 active:bg-gray-100 rounded-xl cursor-pointer transition-all duration-200 ${
                  selectedRoomId === room.roomId 
                    ? 'bg-blue-50 border border-blue-200 shadow-sm' 
                    : ''
                } touch-manipulation`}
                onClick={() => handleSelectChat(room)}
              >
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  {room.avatarInfo.type === 'image' ? (
                    <Avatar className="w-11 h-11">
                      <AvatarImage src={room.avatarInfo.value} />
                      <AvatarFallback 
                        className="text-white font-medium text-sm"
                        style={{ backgroundColor: roomBgColor }}
                      >
                        {roomInitials}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <div
                      className="w-11 h-11 rounded-full flex items-center justify-center text-white font-semibold text-sm"
                      style={{ backgroundColor: room.avatarInfo.bgColor || roomBgColor }}
                    >
                      {room.avatarInfo.value || roomInitials}
                    </div>
                  )}
                  
                  {/* Online indicator for private chats */}
                  {room.type === 'one_to_one' && (
                    <span 
                      className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 border-2 border-white rounded-full ${
                        room.isOnline ? 'bg-green-500' : 'bg-gray-400'
                      }`}
                    />
                  )}
                  
                  {/* Group indicator */}
                  {room.type !== 'one_to_one' && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-blue-500 border-2 border-white rounded-full flex items-center justify-center">
                      <Users className="w-2 h-2 text-white" />
                    </span>
                  )}
                </div>

                {/* Chat Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <h3 className="font-medium text-gray-900 truncate text-sm">
                      {room.displayName}
                    </h3>
                    {room.lastMessage?.timestamp && (
                      <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                        {formatTime(room.lastMessage.timestamp)}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500 truncate pr-2">
                      {room.lastMessage?.content || "No messages yet"}
                    </p>
                    {room.unreadCount > 0 && (
                      <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-xs font-medium text-white bg-blue-600 rounded-full">
                        {room.unreadCount > 99 ? '99+' : room.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <CreateGroupModal
        open={isCreateGroupModalOpen}
        onOpenChange={setIsCreateGroupModalOpen}
      />
    </div>
  );
}
