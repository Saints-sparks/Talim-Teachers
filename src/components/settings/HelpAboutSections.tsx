"use client";

import React from "react";
import Link from "next/link";
import { Info, MessageSquare, Play } from "lucide-react";
import { useAuth } from "@/app/context/AuthContext";
import { ActionCard, Card, CardHeader, SectionHeader } from "./primitives";

/**
 * Support links and quick actions.
 *
 * @returns The Help section element.
 */
export function HelpSection() {
  return (
    <div className="space-y-6">
      <SectionHeader title="Help" desc="Get support and learn more about Talim Teachers." />

      <Card>
        <CardHeader title="Support" />
        <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
          <ActionCard
            icon={<MessageSquare size={22} />}
            iconBg="bg-[#E7F0FF] dark:bg-blue-900/30"
            iconColor="text-[#003366] dark:text-blue-400"
            title="Contact Support"
            desc="Send a message to the Talim support team"
            action={
              <a href="mailto:support@talim.io" className="text-sm font-semibold text-[#003366] hover:underline dark:text-blue-400">
                Email Support
              </a>
            }
          />
          <ActionCard
            icon={<Info size={22} />}
            iconBg="bg-emerald-50 dark:bg-emerald-900/30"
            iconColor="text-emerald-600 dark:text-emerald-400"
            title="About Talim Teachers"
            desc="View app, school and platform information"
            action={
              <Link href="/settings?tab=about" className="text-sm font-semibold text-[#003366] hover:underline dark:text-blue-400">
                Open About
              </Link>
            }
          />
        </div>
      </Card>

      <Card>
        <CardHeader title="Common Actions" />
        <div className="flex flex-wrap gap-3 p-5">
          <Link
            href="/onboarding/setup"
            className="flex items-center gap-2 rounded-lg bg-[#003366] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#002244] dark:bg-blue-600 dark:hover:bg-blue-700"
          >
            <Play size={14} />
            Open Setup Checklist
          </Link>
          <Link
            href="/profile"
            className="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            View Profile
          </Link>
        </div>
      </Card>
    </div>
  );
}

const APP_INFO: Array<{ label: string; value: string }> = [
  { label: "App", value: "Talim Teachers" },
  { label: "Version", value: "2.0.0" },
  { label: "Platform", value: "Web (Next.js)" },
  { label: "Support", value: "support@talim.io" },
];

/**
 * School and application information.
 *
 * @returns The About section element.
 */
export function AboutSection() {
  const { user } = useAuth();
  const schoolName = user?.schoolName || "Your School";

  return (
    <div className="space-y-6">
      <SectionHeader title="About" desc="App information and support." />

      <Card>
        <CardHeader title="School" />
        <div className="flex items-center gap-4 p-5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#003366] dark:bg-blue-700">
            <span className="text-lg font-bold text-white">{schoolName.charAt(0)}</span>
          </div>
          <div>
            <p className="font-semibold text-gray-900 dark:text-slate-100">{schoolName}</p>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-slate-400">
              School info is managed by your administrator.
            </p>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Application" />
        <div className="divide-y divide-gray-50 px-5 py-2 dark:divide-slate-700">
          {APP_INFO.map(({ label, value }) => (
            <div key={label} className="flex flex-col gap-1 py-3 sm:flex-row sm:justify-between">
              <span className="text-sm text-gray-500 dark:text-slate-400">{label}</span>
              <span className="break-words text-sm font-medium text-gray-800 dark:text-slate-200 sm:text-right">{value}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <div className="flex flex-wrap gap-3 p-5">
          <a
            href="mailto:support@talim.io"
            className="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            Contact Support
          </a>
        </div>
      </Card>
    </div>
  );
}
