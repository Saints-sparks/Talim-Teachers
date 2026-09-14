"use client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, MoreVertical, Search, X, Info } from "lucide-react";
import { useState } from "react";
import GroupInfoModal from "./GroupInfoModal";
import ContactCard, { type ContactInfo } from "./ContactCard";
import { generateColorFromString, getUserInitials } from "@/lib/colorUtils";

interface ChatHeaderProps {
  avatar: string;
  name: string;
  status?: string;
  subtext?: string; // For group members
  /** Groups: opens the group info panel. */
  roomId?: string;
  /** Direct messages: opens a contact card for the other person. */
  contact?: ContactInfo;
  onBack?: () => void; // Navigation back to chat list
  showBackButton?: boolean; // Whether to show back button (mobile)
}

export default function ChatHeader({
  avatar,
  name,
  status,
  subtext,
  roomId,
  contact,
  onBack,
  showBackButton = true,
}: ChatHeaderProps) {
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const hasInfo = Boolean(roomId || contact);

  return (
    <div className="flex w-full items-center bg-white border-b border-gray-200 px-3 py-2 sm:px-4 sm:py-3">
      <div className="flex w-full items-center gap-2 sm:gap-3">
        {/* Back Button - Mobile Only */}
        {showBackButton && onBack && (
          <button
            onClick={onBack}
            className="flex lg:hidden items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Back to chats"
          >
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
        )}

        {/* Avatar */}
        <div className="relative">
          <Avatar className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex-shrink-0">
            <AvatarImage src={avatar} />
            <AvatarFallback 
              className="text-white font-medium text-sm"
              style={{ backgroundColor: generateColorFromString(name) }}
            >
              {getUserInitials(name)}
            </AvatarFallback>
          </Avatar>
          {/* Online Indicator */}
          {(status === "Online" || status === "Active Now") && (
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-green-500 border-2 border-white rounded-full"></span>
          )}
        </div>

        {/* Chat Info */}
        <div
          className={`flex-1 min-w-0 ${hasInfo ? "cursor-pointer" : ""}`}
          onClick={hasInfo ? () => setIsModalOpen(true) : undefined}
          role={hasInfo ? "button" : undefined}
          tabIndex={hasInfo ? 0 : undefined}
          onKeyDown={
            hasInfo
              ? (event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setIsModalOpen(true);
                  }
                }
              : undefined
          }
        >
          <div className="flex items-center gap-1">
            <p className="font-medium text-sm sm:text-base text-gray-900 truncate">
              {name}
            </p>
            {hasInfo && <Info size={14} className="text-gray-400 flex-shrink-0 hidden sm:block" />}
          </div>
          {!isSearching && status && (
            <p className="text-xs text-gray-500 truncate">{status}</p>
          )}
          {!isSearching && subtext && (
            <p className="text-xs text-[#7B7B7B] truncate hidden sm:block">{subtext}</p>
          )}
        </div>

        {/* Action Icons */}
        <div className="flex items-center gap-1 sm:gap-3">
          {/* Search */}
          {isSearching ? (
            <div className="flex items-center gap-1 sm:gap-2">
              <div className="relative flex items-center border border-gray-300 rounded-full px-2 py-1 bg-gray-50 w-32 sm:w-44">
                <Search size={16} className="text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search"
                  className="w-full bg-transparent pl-2 text-sm focus:outline-none"
                  autoFocus
                />
                <button
                  onClick={() => {
                    setIsSearching(false);
                    setSearchQuery("");
                  }}
                  className="ml-1 text-gray-400 hover:text-gray-600"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Search Button */}
              <button
                onClick={() => setIsSearching(true)}
                className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100 transition-colors"
              >
                <Search size={18} className="text-gray-600" />
              </button>
              
              {/* More Options - Mobile */}
              <button className="flex sm:hidden items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100 transition-colors">
                <MoreVertical size={18} className="text-gray-600" />
              </button>
            </>
          )}
        </div>

        {/* Group Info Modal */}
        {!roomId && contact && (
          <ContactCard open={isModalOpen} onClose={() => setIsModalOpen(false)} contact={contact} />
        )}
        {roomId && (
          <GroupInfoModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            roomId={roomId}
            fallbackName={name}
          />
        )}
      </div>
    </div>
  );
}
