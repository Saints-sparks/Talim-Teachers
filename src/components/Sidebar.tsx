"use client";
import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  BookMarked,
  Users,
  FolderOpen,
  Calendar,
  ClipboardList,
  BarChart2,
  MessageSquare,
  Bell,
  BookOpen,
  Settings,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/app/hooks/useAuth";
import { useAppContext } from "@/app/context/AppContext";
import { useChat } from "@/app/context/ChatContext";
import useNotifications from "@/app/hooks/useNotifications";
import { Tooltip } from "@/components/ui/Tooltip";

type MenuItem = {
  label: string;
  icon: React.ElementType;
  link: string;
  badge?: "messages" | "notifications";
};

const menuItems: MenuItem[] = [
  { label: "Dashboard",     icon: LayoutDashboard, link: "/dashboard" },
  { label: "Students",      icon: Users,           link: "/students" },
  { label: "Subjects",      icon: BookMarked,      link: "/subjects" },
  { label: "Resources",     icon: FolderOpen,      link: "/resources" },
  { label: "Timetable",     icon: Calendar,        link: "/timetable" },
  { label: "Attendance",    icon: ClipboardList,   link: "/attendance" },
  { label: "Grading",       icon: BarChart2,       link: "/grading" },
  { label: "Curriculum",    icon: BookOpen,        link: "/curriculum" },
  { label: "Messages",      icon: MessageSquare,   link: "/messages",       badge: "messages" },
  { label: "Notifications", icon: Bell,            link: "/notifications",  badge: "notifications" },
  { label: "Settings",      icon: Settings,        link: "/settings" },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  onClose,
  collapsed = false,
  onToggleCollapse,
}) => {
  const { logout } = useAuth();
  const pathname = usePathname();
  const { user } = useAppContext();
  const { chatRooms } = useChat();
  const { counts: notifCounts } = useNotifications();

  const totalUnread = chatRooms.reduce(
    (acc, room) => acc + (room.unreadCount || 0),
    0,
  );

  if (!user) return null;

  const getBadge = (item: MenuItem): number => {
    if (item.badge === "messages") return totalUnread;
    if (item.badge === "notifications") return notifCounts?.unread ?? 0;
    return 0;
  };

  return (
    <aside
      className={`${collapsed ? "md:w-[90px]" : "md:w-[266px]"} w-[280px] font-manrope h-full bg-white dark:bg-slate-900 flex flex-col border-r border-[#E8EEF5] dark:border-slate-800 shadow-sm transition-all duration-300`}
    >
      <div
        className={`border-b border-[#F0F0F0] dark:border-slate-800 ${
          collapsed
            ? "px-6 py-6 md:flex md:flex-col md:items-center md:gap-2 md:px-3 md:py-4"
            : "px-6 py-6"
        }`}
      >
        <div
          className={`flex items-center ${
            collapsed ? "justify-between md:flex-col md:justify-start md:gap-2" : "justify-between"
          }`}
        >
          <div className="flex items-center gap-4">
            <Image
              src="/icons/talim.svg"
              alt="Talim"
              width={56}
              height={54}
              className="h-14 w-14 shrink-0 rounded-xl"
              priority
            />
            <span
              className={`${collapsed ? "md:hidden" : ""} text-[22px] font-semibold leading-none text-[#030E18] dark:text-slate-100`}
            >
              Talim
            </span>
          </div>

          <button
            type="button"
            className={`hidden h-9 w-9 items-center justify-center rounded-lg text-[#98A2B3] transition-colors hover:bg-[#F3F6FA] hover:text-[#003366] dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-blue-400 md:flex ${
              collapsed ? "md:mt-1" : ""
            }`}
            onClick={onToggleCollapse}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight size={22} /> : <ChevronLeft size={22} />}
          </button>

          <button
            type="button"
            className="ml-auto flex h-9 w-9 items-center justify-center rounded-lg text-[#003366] hover:bg-[#EAF2FB] dark:text-blue-400 dark:hover:bg-slate-800 md:hidden"
            onClick={onClose}
            aria-label="Close sidebar"
          >
            <ChevronLeft size={22} />
          </button>
        </div>
      </div>

      <nav className={`px-4 ${collapsed ? "md:px-3" : ""} flex-1 overflow-y-auto scrollbar-hide py-5`}>
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const isActive =
              pathname === item.link ||
              (item.link !== "/dashboard" && pathname.startsWith(item.link + "/"));
            const Icon = item.icon;
            const badge = getBadge(item);
            const navItem = (
              <Link href={item.link} onClick={onClose}>
                <div
                  className={`relative flex h-12 items-center rounded-lg cursor-pointer transition-all duration-200 ${
                    collapsed
                      ? "gap-4 px-4 md:w-12 md:justify-center md:gap-0 md:px-0"
                      : "gap-4 px-4"
                  } ${
                    isActive
                      ? "border border-[#003366] bg-[#DCE5EF] text-[#003366] dark:border-blue-500 dark:bg-blue-900/30 dark:text-blue-300"
                      : "border border-transparent text-[#667085] hover:bg-[#F3F6FA] hover:text-[#003366] dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                  }`}
                >
                  <Icon
                    size={24}
                    strokeWidth={1.8}
                    className={`shrink-0 ${
                      isActive
                        ? "text-[#003366] dark:text-blue-300"
                        : "text-[#98A2B3] dark:text-slate-500"
                    }`}
                  />
                  <span
                    className={`${collapsed ? "md:hidden" : ""} truncate text-[18px] font-medium leading-none`}
                  >
                    {item.label}
                  </span>
                  {badge > 0 && (
                    <span
                      className={`absolute flex h-5 min-w-5 items-center justify-center rounded-full bg-[#003366] px-1 text-[11px] font-semibold leading-none text-white dark:bg-blue-600 ${
                        collapsed
                          ? "right-3 top-1/2 -translate-y-1/2 md:-right-1 md:top-0 md:translate-y-0"
                          : "right-3 top-1/2 -translate-y-1/2"
                      }`}
                    >
                      {badge > 99 ? "99+" : badge}
                    </span>
                  )}
                </div>
              </Link>
            );

            return (
              <li
                key={item.label}
                className={`${collapsed ? "md:flex md:justify-center" : ""}`}
              >
                {collapsed ? (
                  <Tooltip content={item.label} side="right">
                    {navItem}
                  </Tooltip>
                ) : (
                  navItem
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      <div className={`px-4 ${collapsed ? "md:px-3" : ""} border-t border-[#F0F0F0] dark:border-slate-800 py-4`}>
        {collapsed ? (
          <Tooltip content="Logout Account" side="right">
            <button
              type="button"
              className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg text-[#98A2B3] transition-colors hover:bg-red-50 hover:text-red-600 dark:text-slate-500 dark:hover:bg-red-900/20 dark:hover:text-red-400"
              onClick={logout}
              aria-label="Logout Account"
            >
              <LogOut size={24} strokeWidth={1.8} />
            </button>
          </Tooltip>
        ) : (
          <button
            type="button"
            className="flex h-12 w-full items-center gap-4 rounded-lg px-4 text-left text-[#667085] transition-colors hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-900/20 dark:hover:text-red-400"
            onClick={logout}
          >
            <LogOut size={24} strokeWidth={1.8} className="shrink-0" />
            <span className="truncate text-[18px] font-medium leading-none">
              Logout Account
            </span>
          </button>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
