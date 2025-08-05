import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage } from "@radix-ui/react-avatar";
import { Search, ChevronDown, CheckCheck, Loader2, Users, MessageCircle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Image from "next/image";
import { useState, useEffect } from "react";
import CreateGroupModal from "./CreateGroupModal";
import { useChat } from "@/app/hooks/useChat";
import { ChatRoomType } from "@/types/chat";
import { useAppContext } from "@/app/context/AppContext";

interface ChatSidebarProps {
  onSelectChat: (chat: { type: "private" | "group"; room?: any }) => void;
}

export default function ChatSidebar({ onSelectChat }: ChatSidebarProps) {
  const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "teachers" | "students">("all");
  
  const { chatRooms, isLoading, error, refreshChatRooms, getFilteredChatRooms } = useChat();
  const { classes, courses } = useAppContext();

  // Function to get display name for chat room
  const getRoomDisplayName = (room: any) => {
    if (room.name) return room.name;
    
    if (room.type === ChatRoomType.CLASS_GROUP) {
      const classInfo = classes?.find(c => c._id === room.classId || c.id === room.classId);
      return classInfo?.name || `Class Group`;
    }
    
    if (room.type === ChatRoomType.COURSE_GROUP) {
      const courseInfo = courses?.find(c => c._id === room.courseId || c.id === room.courseId);
      return courseInfo?.title || courseInfo?.name || `Course Group`;
    }
    
    if (room.type === ChatRoomType.ONE_TO_ONE) {
      // For one-to-one chats, you might want to show the other participant's name
      return "Direct Message";
    }
    
    return "Chat Room";
  };

  // Function to get room avatar
  const getRoomAvatar = (room: any) => {
    if (room.type === ChatRoomType.ONE_TO_ONE) {
      const otherParticipant = room.participants?.find((p: any) => p.id !== room.currentUserId);
      if (otherParticipant?.avatar) {
        return otherParticipant.avatar;
      }
      const initials = otherParticipant?.name
        ? otherParticipant.name.split(" ").map((n: string) => n[0]).join("")
        : "DM";
      const bgColor = `#${Math.floor(Math.random() * 16777215).toString(16)}`;
      return { initials, bgColor };
    }

    if (room.type === ChatRoomType.CLASS_GROUP || room.type === ChatRoomType.COURSE_GROUP) {
      if (room.avatar) {
        return room.avatar;
      }
      const initials = room.name
        ? room.name.split(" ").map((n: string) => n[0]).join("")
        : "GC";
      const bgColor = `#${Math.floor(Math.random() * 16777215).toString(16)}`;
      return { initials, bgColor };
    }

    return "/icons/chat.svg";
  };

  // Filter chat rooms based on search and filter type
  const getFilteredRooms = () => {
    let filtered = chatRooms;

    // Apply search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(room => 
        getRoomDisplayName(room).toLowerCase().includes(term)
      );
    }

    // Apply type filter
    if (filterType === "teachers") {
      filtered = filtered.filter(room => room.type === ChatRoomType.ONE_TO_ONE);
    } else if (filterType === "students") {
      filtered = filtered.filter(room => 
        room.type === ChatRoomType.CLASS_GROUP || room.type === ChatRoomType.COURSE_GROUP
      );
    }

    return filtered;
  };

  const filteredRooms = getFilteredRooms();

  const handleSelectChat = (room: any) => {
    onSelectChat({ type: room.type === ChatRoomType.ONE_TO_ONE ? "private" : "group", room });
  };

  return (
    <div className="lg:w-2/5 xl:w-1/3 border-r p-4 bg-white rounded-tl-lg flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg text-[#030E18]">Messages</h2>
      </div>
      <div className="flex items-center gap-2 mb-4">
        <div className="flex items-center border border-[#F0F0F0] shadow-none rounded-lg px-3 w-full bg-white">
          <Search className="text-[#898989]" size={18} />
          <Input
            className="border-0 shadow-none focus-visible:ring-0 focus:outline-none flex-1"
            placeholder="Search"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="flex text-[#595959] h-full rounded-lg shadow-none border-[#F0F0F0] hover:bg-[#F0F0F0] bg-transparent items-center gap-1"
            >
              All <ChevronDown size={16} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="font-manrope" align="end">
            <DropdownMenuItem>Teachers</DropdownMenuItem>
            <DropdownMenuItem>Students</DropdownMenuItem>
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
            <p className="font-medium ">Create Group</p>
            <p className="text-[#7B7B7B] text-sm">Add students in one place</p>
          </div>
        </div>
        {filteredRooms.map((room) => (
          <div
            key={room._id || room.id}
            className="flex items-start gap-3 p-3 hover:bg-gray-200 rounded cursor-pointer"
            onClick={() => handleSelectChat(room)}
          >
            <div className="relative w-10 h-10">
              {typeof getRoomAvatar(room) === "string" ? (
                <Avatar className="w-10 h-10 rounded-full bg-gray-300">
                  <AvatarImage src={getRoomAvatar(room)} />
                </Avatar>
              ) : (
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                  style={{ backgroundColor: getRoomAvatar(room).bgColor }}
                >
                  {getRoomAvatar(room).initials}
                </div>
              )}
              {room.type === ChatRoomType.ONE_TO_ONE && (
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
              )}
            </div>
            <div className="flex-1">
              <p className="font-medium text-[#030E18] ">{getRoomDisplayName(room)}</p>
              <div className="flex items-center gap-1 max-w-[155px] truncate">
                <p className="text-sm text-[#7B7B7B] truncate">
                  {(typeof room.lastMessage === 'string' ? room.lastMessage : (room.lastMessage?.content || '')) || "No messages yet"}
                </p>
              </div>
            </div>
            <div className="flex flex-col justify-between gap-2 items-end">
              <span className="text-xs text-[#646464]">
                {room.lastMessage ? new Date(room.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
              </span>
              {room.unreadCount && room.unreadCount > 0 && (
                <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-medium text-white bg-blue-600 rounded-full">
                  {room.unreadCount}
                </span>
              )}
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
