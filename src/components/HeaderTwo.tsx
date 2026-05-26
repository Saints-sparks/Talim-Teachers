"use client";
import Link from "next/link";
import { Bell, Menu, CalendarRange, GraduationCap } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "./ui/button";
import { format } from "date-fns";
import { WebSocketStatus } from "./WebSocketStatus";
import { useAuth } from "@/app/hooks/useAuth";
import useNotifications from "@/app/hooks/useNotifications";
import { ThemeToggle } from "./theme-toggle";

export function Header({
  onMenuClick,
}: {
  onMenuClick: () => void;
}) {
  const { user } = useAuth();
  const { counts } = useNotifications();
  const unreadNotifications = counts.unread || 0;
  const schoolName =
    user?.schoolName ||
    (typeof user?.schoolId === "object" ? user.schoolId?.name : "") ||
    "School Name";
  const schoolLogo =
    (user as any)?.schoolLogo ||
    (typeof user?.schoolId === "object" ? user.schoolId?.logo : "");

  // Generate initials from first and last names
  const getInitials = () => {
    if (!user) return "US"; // Default if no user

    const firstNameInitial = user.firstName?.[0]?.toUpperCase() || "";
    const lastNameInitial = user.lastName?.[0]?.toUpperCase() || "";

    // Handle cases where only one name exists
    return `${firstNameInitial}${lastNameInitial}` || "US";
  };
  return (
    <header className="font-manrope border-b border-b-[#F0F0F0] bg-white px-3 py-2 dark:border-b-slate-800 dark:bg-slate-900 sm:border-b-2 sm:px-5">
      <div className="flex w-full flex-col gap-3 py-2 sm:flex-row sm:items-center sm:justify-between sm:py-3">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            className="shrink-0 rounded-md p-2 text-[#003366] hover:bg-[#EAF2FB] dark:text-blue-300 dark:hover:bg-slate-800 md:hidden"
            onClick={onMenuClick}
            aria-label="Open sidebar"
          >
            <Menu size={24} />
          </button>

          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#003366] text-white dark:bg-blue-700">
              {schoolLogo ? (
                <img
                  src={schoolLogo}
                  alt={schoolName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <GraduationCap className="h-5 w-5" />
              )}
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold tracking-tight text-gray-900 dark:text-slate-100 sm:text-xl">
                {schoolName}
              </h1>
            </div>
          </div>
        </div>

        <div className="flex min-w-0 items-center justify-between gap-2 sm:justify-end sm:gap-4">
          <div className="flex shrink-0 items-center gap-1.5 rounded-lg border border-[#F0F0F0] bg-white p-2 text-sm text-[#6F6F6F] cursor-pointer hover:bg-gray-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700">
            <p className="hidden text-[14px] font-medium leading-6 min-[390px]:inline sm:text-[16px]">
              {format(new Date(), "dd MMM, yyyy")}
            </p>
            <CalendarRange className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div className="hidden items-center min-[390px]:flex">
            <WebSocketStatus />
          </div>
          <ThemeToggle />
          <Link href="/notifications">
            <Button className="relative h-10 w-10 rounded-lg border border-[#F0F0F0] bg-white p-0 shadow-none hover:bg-gray-200 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700">
              <Bell className="h-5 w-5 text-gray-600 dark:text-slate-400" />
              {unreadNotifications > 0 ? (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#003366] px-1 text-[11px] font-semibold leading-none text-white">
                  {unreadNotifications > 99 ? "99+" : unreadNotifications}
                </span>
              ) : null}
            </Button>
          </Link>
          <Link href="/profile">
            <Avatar className="h-10 w-10">
              <AvatarImage
                src={user?.userAvatar || "/placeholder.svg"}
                alt="User avatar"
              />
              <AvatarFallback className="bg-green-300">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
          </Link>
        </div>
        {/* <div className="relative w-full sm:w-[40%] max-w-md sm:order-first">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <Input
            type="search"
            placeholder="Search"
            className="pl-10 py-5 rounded-lg bg-white"
          />
        </div> */}
      </div>
    </header>
  );
}
