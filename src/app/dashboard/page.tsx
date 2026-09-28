"use client";

import React from "react";
import Layout from "@/components/Layout";
import { TodayScreen } from "@/components/today/TodayScreen";

/**
 * Today (the `/dashboard` route, where the "landing page" preference and the
 * sign-in redirect point). Data: `GET /teachers/today`; see
 * `src/components/today/**` and `src/hooks/today/**`.
 *
 * @returns The page.
 */
export default function DashboardPage() {
  return (
    <Layout>
      <TodayScreen />
    </Layout>
  );
}
