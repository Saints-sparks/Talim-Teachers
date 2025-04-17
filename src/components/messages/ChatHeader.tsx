"use client";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import {
  ChevronLeft,
  ChevronRight,
  Phone,
  Search,
  Video,
  X,
} from "lucide-react";
import { useState } from "react";
import GroupInfoModal from "./GroupInfoModal";

interface ChatHeaderProps {
  avatar: string;
  name: string;
  status?: string;
  subtext?: string; // For group members
}

export default function ChatHeader({
  avatar,
  name,
  status,
  subtext,
}: ChatHeaderProps) {
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="flex w-full items-center rounded-tr-lg bg-white ">
      <div className="flex w-full justify-between items-center gap-3">
        {/* Avatar & Name / Search Bar */}
        <div className="flex items-center gap-3 flex-1">
          <Avatar className="w-10 h-10 rounded-full">
            <AvatarImage src={avatar} />
          </Avatar>

          <div
            className="max-w-lg cursor-pointer"
            onClick={() => setIsModalOpen(true)}
          >
            <p className="font-medium">{name}</p>
            {!isSearching && status && (
              <p className="text-xs text-gray-500">{status}</p>
            )}
            {!isSearching && subtext && (
              <p className="text-xs text-[#7B7B7B] truncate ">{subtext}</p>
            )}
          </div>
          <GroupInfoModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            avatar={avatar}
            name={name}
            description={`Welcome to the Class Group! \n
            This is your space to collaborate, share ideas, ask questions, and stay connected with your classmates. Whether you need help with an assignment, want to share resources, or just discuss what’s going on in class, feel free to engage here.`}
          />
        </div>

        {/* Action Icons */}
        <div className="flex items-center gap-4 text-[#878787]">
          <Phone
            className="cursor-pointer hover:text-gray-800"
            strokeWidth="1.5px"
            size={20}
          />
          <Video
            className="cursor-pointer hover:text-gray-800"
            strokeWidth="1.5px"
            size={20}
          />

          {isSearching ? (
            <>
              <div className="relative flex text-[#878787] items-center border px-2 py-1 rounded-md w-44">
                <Search strokeWidth="1px" size={20} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search"
                  className="w-full bg-transparent pl-2 text-sm focus:outline-none"
                />
                <X
                  className=" cursor-pointer ml-2"
                  size={16}
                  onClick={() => {
                    setIsSearching(false);
                    setSearchQuery(""); // Clear search when closing
                  }}
                />
              </div>
              <div className="flex">
                <ChevronLeft strokeWidth="1px" />
                <ChevronRight strokeWidth="1px" />
              </div>
            </>
          ) : (
            <Search
              className="cursor-pointer hover:text-gray-800"
              strokeWidth="1.5px"
              size={20}
              onClick={() => setIsSearching(true)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
