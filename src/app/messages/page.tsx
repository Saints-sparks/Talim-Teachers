"use client";
import { useState } from "react";
import { Header } from "@/components/HeaderTwo";
import ChatSidebar from "@/components/messages/ChatSidebar";
import GroupChat from "@/components/messages/GroupChat";
import PrivateChat from "@/components/messages/PrivateChat";



export default function ChatUI() {
  // Default selected chat is private.
  const [selectedChat, setSelectedChat] = useState<{
    type: "private" | "group";
  }>({
    type: "private",
  });
  const [replyingMessage, setReplyingMessage] = useState<{
    sender: string;
    text: string;
  } | null>(null);
  const [openSubMenu, setOpenSubMenu] = useState<{
    index: number;
    type: string;
  } | null>(null);

  const toggleSubMenu = (index: number, type: string) => {
    if (
      openSubMenu &&
      openSubMenu.index === index &&
      openSubMenu.type === type
    ) {
      setOpenSubMenu(null);
    } else {
      setOpenSubMenu({ index, type });
    }
  };

  return (
   
      <div className="h-screen font-manrope text-[#030E18] flex flex-col">
        <Header />
        <div className="flex flex-1 overflow-hidden gap-1 px-8 pt-8 relative">
          <ChatSidebar onSelectChat={setSelectedChat} />
          {selectedChat.type === "group" ? (
            <GroupChat
              replyingMessage={replyingMessage}
              setReplyingMessage={setReplyingMessage}
              openSubMenu={openSubMenu}
              toggleSubMenu={toggleSubMenu}
            />
          ) : (
            <PrivateChat
              replyingMessage={replyingMessage}
              setReplyingMessage={setReplyingMessage}
              openSubMenu={openSubMenu}
              toggleSubMenu={toggleSubMenu}
            />
          )}
        </div>
      </div>

  );
}
