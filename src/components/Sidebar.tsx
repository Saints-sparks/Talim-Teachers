"use client";
import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  ChevronLeft,
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
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { useAuth } from "@/app/hooks/useAuth";
import { useAppContext } from "@/app/context/AppContext";
import { useChat } from "@/app/context/ChatContext";
import useNotifications from "@/app/hooks/useNotifications";

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
  isOpen,
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

  const schoolName =
    user.schoolName ||
    (typeof user.schoolId === "object" && user.schoolId?.name) ||
    "Your School";

  const getBadge = (item: MenuItem): number => {
    if (item.badge === "messages") return totalUnread;
    if (item.badge === "notifications") return notifCounts?.unread ?? 0;
    return 0;
  };

  return (
    <div className={`${collapsed ? "md:w-[84px]" : "md:w-[280px]"} w-[280px] font-manrope px-4 h-full bg-white dark:bg-slate-900 pb-4 flex flex-col justify-between border-r border-[#F1F1F1] dark:border-slate-800 overflow-y-auto scrollbar-hide transition-all duration-300`}>
      {/* Header */}
      <div>
        <div className="flex items-center py-2 justify-between">
          <div className="flex items-center">
            <div className="p-3 rounded-lg">
              <Image src="/icons/talim.svg" alt="Talim" width={44} height={43} />
            </div>
            <span className={`${collapsed ? "md:hidden" : ""} ml-2 text-lg font-semibold text-[#030E18] dark:text-slate-100`}>Talim</span>
          </div>
          <button
            type="button"
            className="hidden rounded-md border border-[#EAF2FB] p-1.5 text-[#003366] hover:bg-[#EAF2FB] dark:border-slate-700 dark:text-blue-400 dark:hover:bg-slate-800 md:flex"
            onClick={onToggleCollapse}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
          <div
            className="border-2 border-[#003366] dark:border-blue-500 rounded-md md:hidden cursor-pointer"
            onClick={onClose}
          >
            <ChevronLeft className="text-[#003366] dark:text-blue-400" />
          </div>
        </div>

        <div className="mb-4 border-b-2 border-[#F1F1F1] dark:border-slate-800 -mx-4" />

        {/* School Selector */}
        <div className={`flex gap-2 items-center px-2 py-3 border border-[#F1F1F1] dark:border-slate-700 bg-[#FBFBFB] dark:bg-slate-800 rounded-md mb-4 ${collapsed ? "md:justify-center" : ""}`}>
          {user.schoolLogo ? (
            <Image src={user.schoolLogo} alt={schoolName} width={32} height={32} className="rounded" />
          ) : (
            <div className="w-8 h-8 rounded bg-[#003366] flex items-center justify-center shrink-0">
              <span className="text-white text-xs font-bold">{schoolName.charAt(0)}</span>
            </div>
          )}
          <span className={`${collapsed ? "md:hidden" : ""} ml-1 font-medium text-sm text-[#030E18] dark:text-slate-200 truncate`}>{schoolName}</span>
        </div>

        {/* Menu Items */}
        <nav>
          <ul>
            {menuItems.map((item) => {
              const isActive =
                pathname === item.link ||
                (item.link !== "/dashboard" && pathname.startsWith(item.link + "/"));
              const Icon = item.icon;
              const badge = getBadge(item);

              return (
                <li key={item.label} className="mb-1">
                  <Link href={item.link} onClick={onClose}>
                    <div
                      className={`relative flex items-center px-3 py-2 rounded-md cursor-pointer transition-colors ${
                        isActive
                          ? "bg-[#003366]/20 dark:bg-blue-900/30 text-[#003366] dark:text-blue-400"
                          : "text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800"
                      }`}
                    >
                      <Icon
                        size={18}
                        className={`shrink-0 ${
                          isActive
                            ? "text-[#003366] dark:text-blue-400"
                            : "text-gray-500 dark:text-slate-500"
                        }`}
                      />
                      <span className={`${collapsed ? "md:hidden" : ""} font-manrope text-base ml-3 font-medium`}>{item.label}</span>
                      {badge > 0 && (
                        <span className={`${collapsed ? "absolute right-2" : "ml-auto"} bg-blue-900 dark:bg-blue-600 text-white text-xs min-w-[20px] h-5 flex items-center justify-center rounded-full font-semibold px-1`}>
                          {badge > 99 ? "99+" : badge}
                        </span>
                      )}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      {/* Logout */}
      <div>
        <div className="mb-4 border-b-2 border-[#F1F1F1] dark:border-slate-800 -mx-4" />
        <div
          className="flex items-center px-3 py-2 text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-md cursor-pointer transition-colors"
          onClick={logout}
        >
          <LogOut size={18} className="text-gray-500 dark:text-slate-500" />
          <span className={`${collapsed ? "md:hidden" : ""} ml-3 font-medium`}>Logout Account</span>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
