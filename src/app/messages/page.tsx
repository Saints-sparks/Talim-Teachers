"use client";
import { Suspense, useState } from "react";
import Layout from "@/components/Layout";
import MessagesLayout from "@/components/messages/MessagesLayout";

export default function ChatUI() {
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
      <div className="h-full font-manrope text-[#030E18] flex flex-col bg-gray-50" data-guide="messages-shell">
        {/* MessagesLayout reads the open room from ?room=<id>. */}
        <Suspense fallback={null}>
          <MessagesLayout
            openSubMenu={openSubMenu}
            toggleSubMenu={toggleSubMenu}
          />
        </Suspense>
      </div>
    </Layout>
  );
}
