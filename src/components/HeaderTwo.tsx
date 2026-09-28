"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { useAuth } from "@/app/context/AuthContext";
import { focusRing } from "@/components/tl/styles";

/** Props for {@link Header}. */
export interface HeaderProps {
  onMenuClick: () => void;
  menuOpen: boolean;
  schoolName: string;
  /** The school's logo URL, when it has one. */
  schoolLogo?: string;
  /** "Fri, 25 Sep 2026" on the school's calendar. */
  dateLine: string;
  unreadNotifications: number;
}

/**
 * Initials for the avatar: first letters of the first and last names.
 *
 * @param first - First name.
 * @param last - Last name.
 * @returns One or two capitals, or "T".
 */
export function initialsOf(first?: string, last?: string): string {
  return `${first?.trim()[0] ?? ""}${last?.trim()[0] ?? ""}`.toUpperCase() || "T";
}

/**
 * The redesign's top bar: the menu button (below 960px), the school, today's
 * date, notifications with an unread badge, and the teacher's initials
 * linking to their account settings.
 *
 * @param props - See {@link HeaderProps}.
 * @returns The header.
 */
export function Header({ onMenuClick, menuOpen, schoolName, schoolLogo, dateLine, unreadNotifications }: HeaderProps) {
  const { user } = useAuth();
  const initials = initialsOf(user?.firstName, user?.lastName);
  const unread = unreadNotifications > 0 ? unreadNotifications : 0;

  return (
    <header
      data-print-hide
      className="sticky top-0 z-20 flex flex-wrap items-center gap-3 border-b border-tl-line bg-tl-surface px-[clamp(14px,3vw,26px)] py-3.5"
    >
      <button
        type="button"
        onClick={onMenuClick}
        aria-label={menuOpen ? "Close the menu" : "Open the menu"}
        aria-expanded={menuOpen}
        aria-controls="app-sidebar"
        className={`flex h-11 w-11 shrink-0 flex-col items-center justify-center gap-1 rounded-xl border border-tl-line min-[960px]:hidden ${focusRing}`}
      >
        <span aria-hidden className="h-0.5 w-[18px] rounded bg-tl-brand" />
        <span aria-hidden className="h-0.5 w-[18px] rounded bg-tl-brand" />
        <span aria-hidden className="h-0.5 w-[18px] rounded bg-tl-brand" />
      </button>

      <div className="flex min-w-[120px] flex-1 items-center gap-2.5">
        {schoolLogo ? (
          <img src={schoolLogo} alt="" className="h-7 w-7 shrink-0 rounded-[9px] object-cover" />
        ) : (
          <span aria-hidden className="h-7 w-7 shrink-0 rounded-[9px] bg-tl-success-bg" />
        )}
        <div className="truncate text-[15px] font-bold text-tl-ink">{schoolName}</div>
      </div>

      <div className="hidden whitespace-nowrap text-sm text-tl-muted min-[420px]:block">{dateLine}</div>

      <Link
        href="/notifications"
        title="School announcements and reminders"
        aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
        className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-tl-line hover:bg-tl-bg ${focusRing}`}
      >
        <Bell className="h-[19px] w-[19px] text-tl-brand" aria-hidden />
        {unread ? (
          <span
            aria-hidden
            className="absolute -right-1 -top-1 flex h-[19px] min-w-[19px] items-center justify-center rounded-full border-2 border-tl-surface bg-tl-danger px-[5px] text-[11px] font-extrabold text-white dark:text-tl-bg"
          >
            {unread > 99 ? "99+" : unread}
          </span>
        ) : null}
      </Link>

      <Link
        href="/settings?tab=account"
        title="Your account and settings"
        aria-label="Your account and settings"
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-tl-select text-[13px] font-extrabold text-tl-brand ${focusRing}`}
      >
        {initials}
      </Link>
    </header>
  );
}
