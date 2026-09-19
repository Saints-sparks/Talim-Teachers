"use client";
import { Suspense } from "react";
import Layout from "@/components/Layout";
import MessagesLayout from "@/components/messages/MessagesLayout";

export default function ChatUI() {
  return (
    <Layout>
      <div className="h-full font-manrope text-[#030E18] flex flex-col bg-gray-50" data-guide="messages-shell">
        {/* MessagesLayout reads the open room from ?room=<id>. */}
        <Suspense fallback={null}>
          <MessagesLayout />
        </Suspense>
      </div>
    </Layout>
  );
}
