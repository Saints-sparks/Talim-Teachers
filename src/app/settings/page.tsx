"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Layout from "@/components/Layout";
import { SettingsScreen } from "@/components/settings/SettingsScreen";
import { parseSettingsTab } from "@/hooks/settings/settings.logic";

/**
 * Reads `?tab=` (with its aliases: `alerts`, `prefs`, `onboarding`,
 * `profile`) for the tab to open.
 *
 * @returns The screen.
 */
function SettingsFromQuery() {
  const params = useSearchParams();
  return <SettingsScreen initialTab={parseSettingsTab(params.get("tab"))} />;
}

/**
 * Settings (`/settings?tab=account|notifications|messages|teaching|appearance|security|help|about`):
 * the teacher's account, alerts and workspace defaults. Data:
 * `GET /teacher/settings`, `GET /notifications/preferences`,
 * `GET /auth/sessions`, `GET /auth/password-policy` and
 * `GET /teachers/me/school`.
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
