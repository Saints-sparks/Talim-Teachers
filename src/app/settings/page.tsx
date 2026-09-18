"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Bell,
  BookOpen,
  GraduationCap,
  HelpCircle,
  Info,
  MessageSquare,
  Palette,
  Shield,
  UserCircle,
} from "lucide-react";
import Layout from "@/components/Layout";
import { AccountSection } from "@/components/settings/AccountSection";
import { NotificationsSection } from "@/components/settings/NotificationsSection";
import { MessagesSection, TeachingSection } from "@/components/settings/PreferenceSections";
import { OnboardingSection } from "@/components/settings/OnboardingSection";
import { SecuritySection } from "@/components/settings/SecuritySection";
import { AppearanceSection } from "@/components/settings/AppearanceSection";
import { HelpSection, AboutSection } from "@/components/settings/HelpAboutSections";

type Section =
  | "account"
  | "notifications"
  | "messages"
  | "teaching"
  | "onboarding"
  | "security"
  | "appearance"
  | "help"
  | "about";

const SECTIONS: Array<{ id: Section; label: string; desc: string; icon: React.ElementType }> = [
  { id: "account", label: "Account", desc: "Profile and account info", icon: UserCircle },
  { id: "notifications", label: "Notifications", desc: "Alerts and notification settings", icon: Bell },
  { id: "messages", label: "Messages", desc: "Messaging preferences", icon: MessageSquare },
  { id: "teaching", label: "Teaching Preferences", desc: "Workspace and display options", icon: GraduationCap },
  { id: "onboarding", label: "Onboarding & Guides", desc: "Setup progress and help guides", icon: BookOpen },
  { id: "security", label: "Security", desc: "Password and account security", icon: Shield },
  { id: "appearance", label: "Appearance", desc: "Theme and display preferences", icon: Palette },
  { id: "help", label: "Help", desc: "Support and help resources", icon: HelpCircle },
  { id: "about", label: "About", desc: "App information and support", icon: Info },
];

const SECTION_MAP: Record<Section, React.ComponentType> = {
  account: AccountSection,
  notifications: NotificationsSection,
  messages: MessagesSection,
  teaching: TeachingSection,
  onboarding: OnboardingSection,
  security: SecuritySection,
  appearance: AppearanceSection,
  help: HelpSection,
  about: AboutSection,
};

/**
 * The Settings page: a rail of sections, each its own component with its own
 * data hook. See `src/components/settings/**` for the sections and
 * `src/hooks/settings/**` for the queries behind them.
 *
 * @returns The Settings page element.
 */
export default function SettingsPage() {
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get("tab") as Section | null;
  const [active, setActive] = useState<Section>(requestedTab && SECTION_MAP[requestedTab] ? requestedTab : "account");

  useEffect(() => {
    if (requestedTab && SECTION_MAP[requestedTab]) setActive(requestedTab);
  }, [requestedTab]);

  const ActiveSection = SECTION_MAP[active];

  return (
    <Layout>
      <div className="flex h-full min-h-0 flex-col bg-gray-50 dark:bg-slate-950 md:flex-row">
        <aside className="shrink-0 border-b border-gray-100 bg-white dark:border-slate-800 dark:bg-slate-900 md:flex md:w-[340px] md:flex-col md:border-b-0 md:border-r">
          <div className="px-5 py-5 md:border-b md:border-gray-100 md:dark:border-slate-800">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Settings</h1>
                <p className="mt-1 max-w-[260px] text-sm leading-5 text-gray-500 dark:text-slate-400">
                  Manage your account, preferences and teaching workspace
                </p>
              </div>
              <Link
                href="/profile"
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-semibold text-[#003366] hover:bg-gray-50 hover:underline dark:text-blue-400 dark:hover:bg-slate-800 md:hidden"
              >
                <UserCircle size={16} />
                Profile
              </Link>
            </div>
          </div>

          <nav className="hidden flex-1 overflow-y-auto p-3 md:block">
            {SECTIONS.map((s) => {
              const Icon = s.icon;
              const isActive = active === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setActive(s.id)}
                  aria-current={isActive ? "page" : undefined}
                  className={`mb-1 flex w-full items-start gap-3 rounded-lg px-4 py-3 text-left transition-colors ${
                    isActive
                      ? "bg-[#EEF3F9] text-[#003366] dark:bg-slate-800 dark:text-blue-400"
                      : "text-gray-600 hover:bg-gray-50 dark:text-slate-400 dark:hover:bg-slate-800"
                  }`}
                >
                  <Icon size={18} className={`mt-0.5 shrink-0 ${isActive ? "text-[#003366] dark:text-blue-400" : "text-gray-400 dark:text-slate-500"}`} />
                  <div className="min-w-0">
                    <p className={`truncate text-sm font-semibold ${isActive ? "text-[#003366] dark:text-blue-400" : "text-gray-700 dark:text-slate-300"}`}>
                      {s.label}
                    </p>
                    <p className="mt-0.5 truncate text-xs leading-tight text-gray-400 dark:text-slate-500">{s.desc}</p>
                  </div>
                </button>
              );
            })}
          </nav>

          <div className="hidden border-t border-gray-100 px-5 py-4 dark:border-slate-800 md:block">
            <p className="text-xs text-gray-400 dark:text-slate-600">Talim Teachers v2.0</p>
          </div>

          <div className="flex gap-1 overflow-x-auto border-t border-gray-100 px-4 dark:border-slate-800 md:hidden">
            {SECTIONS.map((s) => {
              const Icon = s.icon;
              const isActive = active === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setActive(s.id)}
                  aria-current={isActive ? "page" : undefined}
                  className={`flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-3 text-xs font-semibold transition-colors ${
                    isActive
                      ? "border-[#003366] text-[#003366] dark:border-blue-500 dark:text-blue-400"
                      : "border-transparent text-gray-500 dark:text-slate-400"
                  }`}
                >
                  <Icon size={14} />
                  {s.label}
                </button>
              );
            })}
          </div>
        </aside>

        <main className="min-h-0 flex-1 overflow-y-auto bg-gray-50 dark:bg-slate-950">
          <div className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-6 lg:px-10 lg:py-8">
            <div className="mb-6 hidden items-center justify-end md:flex">
              <Link
                href="/profile"
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-[#003366] hover:bg-white hover:underline dark:text-blue-400 dark:hover:bg-slate-900"
              >
                <UserCircle size={16} />
                View Profile
              </Link>
            </div>
            <ActiveSection />
          </div>
        </main>
      </div>
    </Layout>
  );
}
