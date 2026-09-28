"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import { focusRing } from "@/components/tl/styles";

/** One destination in the sidebar. */
export interface NavItem {
  label: string;
  href: string;
  /** Hover text (the design's `title` tips). */
  tip: string;
  badge?: number;
  /** Indented, smaller: pages kept reachable that the redesign has not reached yet. */
  secondary?: boolean;
}

/** A titled group of destinations. */
export interface NavGroup {
  title: string;
  items: NavItem[];
}

/** Badge counts shown beside Attendance, Messages and Notifications. */
export interface NavCounts {
  pendingRegisters: number;
  unreadMessages: number;
  unreadNotifications: number;
}

/**
 * The sidebar's groups. Today is the `/dashboard` route. Curriculum and
 * Resources are not redesigned yet and stay reachable as secondary items
 * under Subjects.
 *
 * @param counts - Badge counts.
 * @returns The groups, in order.
 */
export function navGroups(counts: NavCounts): NavGroup[] {
  return [
    {
      title: "Teach",
      items: [
        { label: "Today", href: "/dashboard", tip: "Your lessons now and what needs you" },
        { label: "Timetable", href: "/timetable", tip: "The week period by period" },
        { label: "Attendance", href: "/attendance", tip: "Morning registers", badge: counts.pendingRegisters },
        { label: "Grading", href: "/grading", tip: "Scores and class reports" },
      ],
    },
    {
      title: "Classes",
      items: [
        { label: "Students", href: "/students", tip: "Rosters, guardians and student records" },
        { label: "Subjects", href: "/subjects", tip: "Scheme of work and resources" },
        { label: "Curriculum", href: "/curriculum", tip: "Write and share each course's curriculum", secondary: true },
        { label: "Resources", href: "/resources", tip: "Worksheets, slides and videos you have shared", secondary: true },
      ],
    },
    {
      title: "Inbox",
      items: [
        { label: "Messages", href: "/messages", tip: "Parents, colleagues and class groups", badge: counts.unreadMessages },
        { label: "Notifications", href: "/notifications", tip: "Announcements and deadlines", badge: counts.unreadNotifications },
      ],
    },
  ];
}

/**
 * Whether a nav link is the current page (or a page beneath it).
 *
 * @param pathname - The current path.
 * @param href - The link.
 * @returns True when active.
 */
export function isActivePath(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  if (href === "/dashboard") return false;
  return pathname.startsWith(`${href}/`);
}

/** Props for {@link Sidebar}. */
interface SidebarProps {
  /** The drawer is open (below 960px). */
  open: boolean;
  /** Called after a link is followed, to close the drawer. */
  onNavigate: () => void;
  counts: NavCounts;
  schoolName: string;
}

/**
 * The redesign's sidebar: brand and school, the Teach / Classes / Inbox
 * groups with badges, and Settings and Log out at the bottom. At 960px and
 * wider it sits beside the page; below, it is a drawer opened from the top
 * bar's menu button.
 *
 * @param props - See {@link SidebarProps}.
 * @returns The sidebar.
 */
const Sidebar: React.FC<SidebarProps> = ({ open, onNavigate, counts, schoolName }) => {
  const pathname = usePathname() ?? "";
  const { logout } = useAuth();

  const link = (item: NavItem) => {
    const active = isActivePath(pathname, item.href);
    const badge = item.badge && item.badge > 0 ? item.badge : 0;
    return (
      <li key={item.href}>
        <Link
          href={item.href}
          title={item.tip}
          onClick={onNavigate}
          aria-current={active ? "page" : undefined}
          className={`flex min-h-[44px] items-center gap-3 rounded-[14px] transition-colors ${focusRing} ${
            item.secondary ? "py-2 pl-[33px] pr-3.5 text-sm" : "px-3.5 py-[11px] text-[15px]"
          } ${active ? "bg-tl-select font-extrabold text-tl-brand" : "font-semibold text-tl-muted hover:bg-tl-bg hover:text-tl-ink"}`}
        >
          {item.secondary ? null : (
            <span aria-hidden className={`h-[7px] w-[7px] shrink-0 rounded-full ${active ? "bg-tl-brand" : "bg-tl-control"}`} />
          )}
          <span className="flex-1 truncate">{item.label}</span>
          {badge ? (
            <span
              aria-label={`${badge} ${item.label === "Attendance" ? "pending" : "unread"}`}
              className={`flex h-[22px] min-w-[22px] items-center justify-center rounded-full px-[7px] text-xs font-extrabold ${
                active ? "bg-tl-brand-fill text-tl-on-brand" : "bg-tl-select text-tl-brand"
              }`}
            >
              {badge > 99 ? "99+" : badge}
            </span>
          ) : null}
        </Link>
      </li>
    );
  };

  const settingsActive = isActivePath(pathname, "/settings");

  return (
    <aside
      id="app-sidebar"
      aria-label="Main"
      data-print-hide
      className={`fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col overflow-y-auto border-r border-tl-line bg-tl-surface px-3.5 pb-4 pt-[22px] transition-transform duration-[250ms] ease-out min-[960px]:static min-[960px]:z-auto min-[960px]:h-full min-[960px]:w-[264px] min-[960px]:shrink-0 min-[960px]:translate-x-0 ${
        open ? "translate-x-0" : "-translate-x-[105%] invisible min-[960px]:visible"
      }`}
    >
      <div className="flex items-center gap-2.5 px-3 pb-2 pt-1">
        <Image src="/icons/talim.svg" alt="" width={32} height={32} className="h-8 w-8 shrink-0 rounded-[10px]" priority />
        <div className="min-w-0">
          <div className="text-[19px] font-extrabold leading-tight tracking-[-0.2px] text-tl-ink">Talim</div>
          <div className="truncate text-xs font-semibold text-tl-muted" title={schoolName}>
            {schoolName}
          </div>
        </div>
      </div>

      <nav aria-label="Teacher portal" className="flex-1">
        {navGroups(counts).map((group, i) => (
          <div key={group.title} className={i === 0 ? "mt-5" : "mt-[18px]"}>
            <h2 className="px-3 pb-2 text-[11px] font-extrabold uppercase tracking-[0.08em] text-tl-faint">{group.title}</h2>
            <ul className="flex flex-col gap-0.5">{group.items.map(link)}</ul>
          </div>
        ))}
      </nav>

      <div className="mt-auto flex flex-col gap-0.5 border-t border-tl-line-soft pt-3.5">
        <Link
          href="/settings"
          title="Your profile, alerts, preferences and security"
          onClick={onNavigate}
          aria-current={settingsActive ? "page" : undefined}
          className={`flex min-h-[44px] items-center gap-3 rounded-[14px] px-3.5 py-3 text-[15px] ${focusRing} ${
            settingsActive ? "bg-tl-select font-extrabold text-tl-brand" : "font-semibold text-tl-muted hover:bg-tl-bg hover:text-tl-ink"
          }`}
        >
          <span aria-hidden className={`h-[7px] w-[7px] rounded-full ${settingsActive ? "bg-tl-brand" : "bg-tl-control"}`} />
          <span>Settings</span>
        </Link>
        <button
          type="button"
          title="Sign out of the teacher portal"
          onClick={() => void logout()}
          className={`flex min-h-[44px] items-center gap-3 rounded-[14px] px-3.5 py-3 text-left text-[15px] font-semibold text-tl-muted hover:bg-tl-danger-bg hover:text-tl-danger ${focusRing}`}
        >
          <span aria-hidden className="h-[7px] w-[7px] rounded-full bg-tl-line" />
          <span>Log out</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
