import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage } from "@radix-ui/react-avatar";
import { Search, ChevronDown, CheckCheck } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Image from "next/image";

const conversations = [
  {
    name: "Mrs. Yetunde Adebayo",
    lastMessage: "typing...",
    time: "4:00pm",
    avatar: "/image/teachers/english.png",
    unread: true,
    online: true,
  },
  {
    name: "JSS 1",
    lastMessage: "Good evening everyone.",
    type: "group",
    time: "6:00pm",
    avatar: "/image/teachers/mathematics.png",
    unread: false,
    lastSender: "me",
  },
  {
    name: "Mrs Chisom Okechukwu",
    lastMessage: "Brilliant",
    time: "6:00pm",
    avatar: "/image/teachers/civic.png",
    unread: false,
    lastSender: "me",
    online: "false",
  },
  {
    name: "Fatima Abubakar",
    lastMessage: "typing...",
    time: "6:00pm",
    avatar: "/image/teachers/mathematics.png",
    unread: false,
    lastSender: "other",
    online: true,
  },
  {
    name: "Mrs. Yetunde Adebayo",
    lastMessage: "I'm happy you understand",
    time: "4:00pm",
    avatar: "/image/teachers/english.png",
    unread: true,
    online: "false",
  },
  {
    name: "Mrs Chisom Okechukwu",
    lastMessage: "I'm waiting for the question",
    time: "6:00pm",
    avatar: "/image/teachers/civic.png",
    unread: false,
    lastSender: "me",
    online: "false",
  },
  {
    name: "Maryan yusuf",
    lastMessage: "typing...",
    time: "5:00pm",
    avatar: "/image/teachers/english.png",
    unread: true,
    online: "true",
  },
  {
    name: "Mrs. Yetunde Adebayo",
    lastMessage: "typing...",
    time: "5:00pm",
    avatar: "/image/teachers/civic.png",
    unread: true,
    online: "true",
  },
  {
    name: "Mrs. Yetunde Adebayo",
    lastMessage: "typing...",
    time: "5:00pm",
    avatar: "/image/teachers/english.png",
    unread: true,
    online: "true",
  },
  {
    name: "Mrs. Yetunde Adebayo",
    lastMessage: "typing...",
    time: "5:00pm",
    avatar: "/image/teachers/english.png",
    unread: true,
    online: "true",
  },
  {
    name: "Mrs. Yetunde Adebayo",
    lastMessage: "typing...",
    time: "5:00pm",
    avatar: "/image/teachers/english.png",
    unread: true,
    online: "true",
  },
];

interface ChatSidebarProps {
  onSelectChat: (chat: { type: "private" | "group" }) => void;
}

export default function ChatSidebar({ onSelectChat }: ChatSidebarProps) {
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
        <div className="flex gap-4 p-3 px-5 hover:bg-gray-200 rounded cursor-pointer">
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
        {conversations.map((conv, index) => (
          <div
            key={index}
            className="flex items-start gap-3 p-3 hover:bg-gray-200 rounded cursor-pointer"
            onClick={() =>
              onSelectChat({ type: conv.type as "private" | "group" })
            }
          >
            <div className="relative w-10 h-10">
              <Avatar className="w-10 h-10 rounded-full bg-gray-300">
                <AvatarImage src={conv.avatar} />
              </Avatar>
              {conv.online === true && (
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
              )}
            </div>
            <div className="flex-1">
              <p className="font-medium text-[#030E18] ">{conv.name}</p>
              <div className="flex items-center gap-1 max-w-[155px] truncate">
                {conv.lastSender === "me" && (
                  <CheckCheck className="w-4 h-4 text-[#7B7B7B]" />
                )}
                <p className="text-sm text-[#7B7B7B] truncate">
                  {conv.lastMessage}
                </p>
              </div>
            </div>
            <div className="flex flex-col justify-between gap-2 items-end">
              <span className="text-xs text-[#646464]">{conv.time}</span>
              {conv.unread && (
                <span className="w-3 h-[12px] bg-[#003366] rounded-full" />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
