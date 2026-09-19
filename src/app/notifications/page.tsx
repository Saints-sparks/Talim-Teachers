"use client";

import React from "react";
import Layout from "@/components/Layout";
import useNotifications from "@/app/hooks/useNotifications";
import { useNotificationFilters } from "@/hooks/notifications/useNotificationFilters";
import { useTeacherOnboarding } from "@/app/context/OnboardingContext";
import { cn } from "@/app/lib/utils";
import { NotificationsHeader } from "@/components/notifications/NotificationsHeader";
import { NotificationTabs } from "@/components/notifications/NotificationTabs";
import { NotificationToolbar } from "@/components/notifications/NotificationToolbar";
import { NotificationList } from "@/components/notifications/NotificationList";
import { NotificationDetail } from "@/components/notifications/NotificationDetail";

/**
 * The teacher's notification inbox: school announcements and system
 * notifications in one list, with the open item beside it. Data comes from the
 * shared `useNotifications` query; this page only owns the view state.
 *
 * @returns The notifications page element.
 */
function Page() {
  const { markStepComplete } = useTeacherOnboarding();
  const { notifications, loading, isRefreshing, error, isPartial, counts, refetch, markAsRead, markAllAsRead } =
    useNotifications();
  const view = useNotificationFilters(notifications);
  const { selected, mobileDetailOpen } = view;

  React.useEffect(() => {
    markStepComplete("view-notifications");
  }, [markStepComplete]);

  // With data on screen, a failed refresh is a banner, not a replacement of the list.
  const hasStaleError = Boolean(error) && notifications.length > 0;

  return (
    <Layout>
      <div className="h-full overflow-hidden bg-[#F7F9FC]">
        <div className="flex h-full flex-col gap-4 overflow-hidden px-3 py-4 sm:px-5 lg:px-6">
          <NotificationsHeader
            unreadCount={counts.unread}
            refreshing={isRefreshing}
            onRefresh={() => void refetch()}
            onMarkAllAsRead={() => void markAllAsRead()}
          />

          <div className="flex min-h-0 flex-1 flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[minmax(0,1fr)_430px]">
            <section
              className={cn(
                "min-h-0 flex-col rounded-2xl border border-[#E5EAF2] bg-white shadow-sm",
                mobileDetailOpen && selected ? "hidden lg:flex" : "flex",
              )}
            >
              <NotificationTabs activeTab={view.activeTab} counts={counts} onTabChange={view.setActiveTab} />
              <NotificationToolbar
                searchQuery={view.searchQuery}
                onSearchChange={view.setSearchQuery}
                sortKey={view.sortKey}
                onSortChange={view.setSortKey}
              />
              <NotificationList
                notifications={view.filtered}
                selectedId={selected?.id}
                loading={loading}
                error={error}
                partial={isPartial || hasStaleError}
                totalCount={notifications.length}
                onSelect={view.select}
                onRetry={() => void refetch()}
              />
            </section>

            <section
              className={cn(
                "min-h-0 flex-col rounded-2xl border border-[#E5EAF2] bg-white shadow-sm lg:flex",
                mobileDetailOpen && selected ? "flex" : "hidden",
              )}
            >
              <NotificationDetail
                notification={selected}
                onBack={view.closeDetail}
                onMarkAsRead={() => selected && void markAsRead(selected.id)}
              />
            </section>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default Page;
