"use client";
import { Suspense } from "react";
import Layout from "@/components/Layout";
import { MessagesScreen } from "@/components/messages/MessagesScreen";

/**
 * Messages (`/messages?room=`): parents, colleagues, class groups and the
 * school office. The screen reads the open room from `?room=`.
 *
 * @returns The page.
 */
export default function MessagesPage() {
  return (
    <Layout>
      <Suspense fallback={null}>
        <MessagesScreen />
      </Suspense>
    </Layout>
  );
}
