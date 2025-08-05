"use client";
import { useState } from "react";
import Layout from "@/components/Layout";
import MessagesLayout from "@/components/messages/MessagesLayout";

export default function ChatUI() {
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
      <div className="h-screen font-manrope text-[#030E18] flex flex-col bg-gray-50">
        <div className="flex-1 overflow-hidden">
          <MessagesLayout
            replyingMessage={replyingMessage}
            setReplyingMessage={setReplyingMessage}
            openSubMenu={openSubMenu}
            toggleSubMenu={toggleSubMenu}
          />
        </div>
      </div>
    </Layout>
  );
}
