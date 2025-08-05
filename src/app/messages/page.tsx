"use client";
import { useState } from "react";
import ChatSidebar from "@/components/messages/ChatSidebar";
import GroupChat from "@/components/messages/GroupChat";
import PrivateChat from "@/components/messages/PrivateChat";
import Layout from "@/components/Layout";

export default function ChatUI() {
  // State for the selected chat (can be null when no chat is selected)
  const [selectedChat, setSelectedChat] = useState<{
    type: "private" | "group";
    room?: any;
  } | null>(null);
  
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
    <Layout>
      <div className="h-screen font-manrope text-[#030E18] flex flex-col">
        <div className="flex flex-1 overflow-hidden gap-1 px-8 pt-8 relative">
          <ChatSidebar onSelectChat={setSelectedChat} />
          
          {selectedChat ? (
            selectedChat.type === "group" ? (
              <GroupChat
                replyingMessage={replyingMessage}
                setReplyingMessage={setReplyingMessage}
                openSubMenu={openSubMenu}
                toggleSubMenu={toggleSubMenu}
                room={selectedChat.room}
              />
            ) : (
              <PrivateChat
                replyingMessage={replyingMessage}
                setReplyingMessage={setReplyingMessage}
                openSubMenu={openSubMenu}
                toggleSubMenu={toggleSubMenu}
                room={selectedChat.room}
              />
            )
          ) : (
            <div className="lg:w-3/5 xl:w-2/3 flex flex-col items-center justify-center bg-white rounded-tr-lg">
              <div className="text-center p-8">
                <img 
                  src="/icons/chat.svg" 
                  alt="Select a chat" 
                  className="w-24 h-24 mx-auto mb-4 opacity-50"
                />
                <h2 className="text-2xl font-semibold mb-2 text-gray-700">No chat selected</h2>
                <p className="text-gray-500">
                  Select a conversation from the sidebar to start messaging
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
