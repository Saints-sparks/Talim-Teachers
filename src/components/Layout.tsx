"use client";
import { ReactNode, Suspense, useCallback, useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import { Header } from "./HeaderTwo";
import AppGuide from "./onboarding/AppGuide";
import { TourProvider } from "./tour/TourProvider";
import { useAuth } from "@/app/context/AuthContext";
import { useChat } from "@/app/context/ChatContext";
import { useNotificationCounts } from "@/hooks/notifications/useNotificationInbox";
import { schoolClock, shortDate } from "@/hooks/today/today.logic";
import { useSchoolNow, useTeacherToday } from "@/hooks/today/useTeacherToday";

interface LayoutProps {
  children: ReactNode;
}

/**
 * The date for the top bar on the school's calendar once Today has loaded
 * (so a device in another timezone still shows the school's day), else the
 * device's own date.
 *
 * @param nowMs - The current instant.
 * @param timezone - The school's timezone, when known.
 * @returns "Fri, 25 Sep 2026".
 */
function topBarDate(nowMs: number, timezone: string | undefined): string {
  if (timezone) return shortDate(schoolClock(nowMs, timezone).date);
  const d = new Date(nowMs);
  const local = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return shortDate(local);
}

/**
 * The app shell of the teachers redesign: sidebar (a drawer below 960px),
 * top bar and the scrolling page. Badge counts: pending registers from
 * `/teachers/today` (`counts.pendingRegisters`); unread messages from the
 * live chat (`totalUnread`); unread notifications from
 * `GET /notifications/counts` (`useNotificationCounts`, kept live over the
 * socket), falling back to Today's `counts.unreadNotifications` until it
 * loads. The shell never loads the inbox itself.
 *
 * Also hosts the portal tour (`useTour`) and keeps the per-page AppGuide
 * spotlight tours mounted: they cover Resources, Attendance, Students,
 * Curriculum, Grading and Messages, which the new tour does not replace.
 *
 * @param props - The page.
 * @param props.children - The page content.
 * @returns The shell.
 */
function Layout({ children }: LayoutProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { user } = useAuth();
  const { totalUnread } = useChat();
  const notificationCounts = useNotificationCounts();
  const today = useTeacherToday();
  const nowMs = useSchoolNow(today.data?.now, today.dataUpdatedAt);

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  const schoolName =
    user?.schoolName || (typeof user?.schoolId === "object" ? user.schoolId?.name : "") || "Your school";
  const schoolLogo =
    (user as { schoolLogo?: string } | null)?.schoolLogo || (typeof user?.schoolId === "object" ? user.schoolId?.logo : "") || undefined;

  const counts = {
    pendingRegisters: today.data?.counts.pendingRegisters ?? 0,
    unreadMessages: totalUnread ?? today.data?.counts.unreadMessages ?? 0,
    unreadNotifications: notificationCounts.data?.unread ?? today.data?.counts.unreadNotifications ?? 0,
  };

  return (
    <TourProvider>
      <div
        data-print-root
        className="flex h-dvh min-h-dvh flex-row overflow-hidden bg-tl-bg font-manrope text-tl-ink print:block print:h-auto print:overflow-visible print:bg-white"
      >
        {drawerOpen ? (
          <div
            aria-hidden
            data-print-hide
            onClick={closeDrawer}
            className="fixed inset-0 z-40 bg-[rgba(15,27,46,0.42)] min-[960px]:hidden"
          />
        ) : null}
        <Sidebar open={drawerOpen} onNavigate={closeDrawer} counts={counts} schoolName={schoolName} />
        <div data-print-root className="flex min-w-0 flex-1 flex-col overflow-hidden print:block print:overflow-visible">
          <Header
            onMenuClick={() => setDrawerOpen((open) => !open)}
            menuOpen={drawerOpen}
            schoolName={schoolName}
            schoolLogo={schoolLogo}
            dateLine={topBarDate(nowMs, today.data?.timezone)}
            unreadNotifications={counts.unreadNotifications}
          />
          <main data-print-root className="min-w-0 flex-1 overflow-y-auto print:overflow-visible">
            {children}
          </main>
        </div>
        <Suspense fallback={null}>
          <AppGuide />
        </Suspense>
      </div>
    </TourProvider>
  );
}

export default Layout;
