"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Layout from "@/components/Layout";
import { NotificationsScreen } from "@/components/notifications/NotificationsScreen";
import { useTeacherOnboarding } from "@/app/context/OnboardingContext";
import { parseNotificationTab } from "@/hooks/notifications/notifications.logic";

/**
 * Reads `?tab=all|unread|academics|attendance|announcements` for the tab to open.
 *
 * @returns The screen.
 */
function NotificationsFromQuery() {
  const params = useSearchParams();
  return <NotificationsScreen initialTab={parseNotificationTab(params.get("tab"))} />;
}

/**
 * Notifications (`/notifications?tab=`): school announcements and Talim
 * alerts in one inbox. Data: `GET /notifications`, the announcements list,
 * `GET /notifications/counts`, and the read calls. Visiting it completes the
 * "view notifications" onboarding step.
 *
 * @returns The page.
 */
export default function NotificationsPage() {
  const { markStepComplete } = useTeacherOnboarding();

  useEffect(() => {
    markStepComplete("view-notifications");
  }, [markStepComplete]);

  return (
    <Layout>
      <Suspense fallback={null}>
        <NotificationsFromQuery />
      </Suspense>
    </Layout>
  );
}
