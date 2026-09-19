"use client";

import { ChevronLeft } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { ApiErrorState, LoadingState } from "@/components/states";
import { NotificationDetail } from "@/components/notifications/NotificationDetail";
import { useNotificationDetail } from "@/hooks/notifications/useNotificationDetail";

/**
 * One notification on its own page (`/notifications/[id]`), reusing the inbox's
 * detail panel so it reads the same in both themes.
 *
 * @returns The notification page element.
 */
export default function NotificationPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { notification, isLoading, error, refetch, markAsRead } = useNotificationDetail(id);

  return (
    <Layout>
      <div className="flex h-full max-h-full flex-col gap-4 overflow-y-auto p-4">
        <div>
          <Button
            className="bg-transparent text-[#6F6F6F] shadow-none hover:bg-gray-200 dark:hover:bg-slate-800"
            onClick={() => router.back()}
            aria-label="Go back"
          >
            <ChevronLeft />
          </Button>
        </div>

        {isLoading ? (
          <LoadingState message="Loading notification..." fullHeight />
        ) : error ? (
          <ApiErrorState error={error} fallback="We couldn't load this notification." onRetry={() => void refetch()} />
        ) : (
          <section className="flex min-h-[420px] flex-1 flex-col rounded-2xl border border-[#E5EAF2] bg-white shadow-sm">
            <NotificationDetail notification={notification} onBack={() => router.back()} onMarkAsRead={markAsRead} />
          </section>
        )}
      </div>
    </Layout>
  );
}
