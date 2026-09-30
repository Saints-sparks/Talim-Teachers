"use client";

import { useParams } from "next/navigation";
import Layout from "@/components/Layout";
import { NotificationDetailScreen } from "@/components/notifications/NotificationDetailScreen";

/**
 * One notification on its own page (`/notifications/[id]`), where push
 * notifications link. Data: the inbox's cached copy, else
 * `GET /notifications/:id`; opening it marks it read.
 *
 * @returns The page.
 */
export default function NotificationPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <Layout>
      <NotificationDetailScreen id={id} />
    </Layout>
  );
}
