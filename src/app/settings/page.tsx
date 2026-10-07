"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Layout from "@/components/Layout";
import { SettingsScreen } from "@/components/settings/SettingsScreen";
import { parseSettingsTab } from "@/hooks/settings/settings.logic";
import { parseTicketParam } from "@/hooks/support/tickets.logic";

/**
 * Reads `?tab=` (with its aliases: `alerts`, `prefs`, `onboarding`,
 * `profile`) for the tab to open, and `?ticket=` for a support ticket to
 * open on the Help tab (a support notification's link).
 *
 * @returns The screen.
 */
function SettingsFromQuery() {
  const params = useSearchParams();
  return <SettingsScreen initialTab={parseSettingsTab(params.get("tab"))} ticketId={parseTicketParam(params.get("ticket"))} />;
}

/**
 * Settings (`/settings?tab=account|notifications|messages|teaching|appearance|security|help|about`,
 * plus `&ticket=<id>` on Help):
 * the teacher's account, alerts and workspace defaults. Data:
 * `GET /teacher/settings`, `GET /notifications/preferences`,
 * `GET /auth/sessions`, `GET /auth/password-policy`,
 * `GET /teachers/me/school` and `GET /tickets/mine`.
 *
 * @returns The page.
 */
export default function SettingsPage() {
  return (
    <Layout>
      <Suspense fallback={null}>
        <SettingsFromQuery />
      </Suspense>
    </Layout>
  );
}
