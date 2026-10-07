"use client";

import React from "react";
import { useAuth } from "@/app/context/AuthContext";
import { APP_VERSION } from "@/lib/appVersion";
import { useTeacherSettings } from "@/hooks/settings/useTeacherSettings";
import { LinkRow, SettingsGroup, ValueRow } from "./SettingsRows";

/** Talim's published legal pages (the app has no copies of its own). */
export const PRIVACY_POLICY_URL = "https://mytalim.com/privacy";
export const TERMS_OF_SERVICE_URL = "https://mytalim.com/terms";

/**
 * Settings → About: the app and its version ("Version 1.5.0", read from
 * `package.json`), the school, and links to the privacy policy and terms
 * (opened in a new tab).
 *
 * @returns The panel content.
 */
export function AboutPanel() {
  const { user } = useAuth();
  const { data } = useTeacherSettings();
  const school = data?.profile?.schoolName || user?.schoolName || "—";

  return (
    <>
      <SettingsGroup heading="Application">
        <ValueRow label="Talim Teachers" description="The teacher portal" value={`Version ${APP_VERSION}`} />
        <ValueRow label="School" value={school} />
      </SettingsGroup>
      <SettingsGroup heading="Legal">
        <LinkRow label="Privacy Policy" description="How staff and student data is handled" href={PRIVACY_POLICY_URL} external />
        <LinkRow label="Terms of Service" description="The rules for using Talim as a teacher" href={TERMS_OF_SERVICE_URL} external />
      </SettingsGroup>
    </>
  );
}
