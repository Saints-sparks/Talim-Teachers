"use client";
import { ReactNode, Suspense, useState } from "react";
import Sidebar from "./Sidebar";
import { Header } from "./HeaderTwo";
import AppGuide from "./onboarding/AppGuide";

interface LayoutProps {
  children: ReactNode;
}

function Layout({ children }: LayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState(false);

  const handleMenuClick = () => {
    if (typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches) {
      setIsDesktopSidebarCollapsed((value) => !value);
      return;
    }
    setIsSidebarOpen((value) => !value);
  };

  return (
    <div className="flex flex-row h-screen font-manrope">
      {/* Sidebar: Hidden on mobile, toggled via state */}
      <div
        className={`fixed inset-0 bg-black bg-opacity-50 z-40 ${
          isSidebarOpen ? "block" : "hidden"
        } md:hidden`}
        onClick={() => setIsSidebarOpen(false)}
      ></div>
      <div
        className={`fixed left-0 top-0 h-full z-50 transform transition-all duration-300 ease-in-out ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0 md:relative ${isDesktopSidebarCollapsed ? "md:w-[84px]" : "md:w-[280px]"}`}
      >
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          collapsed={isDesktopSidebarCollapsed}
          onToggleCollapse={() => setIsDesktopSidebarCollapsed((value) => !value)}
        />
      </div>
      <div className="bg-[#F8F8F8] dark:bg-slate-950 flex flex-col flex-1 border dark:border-slate-800 h-full overflow-hidden">
        <Header onMenuClick={handleMenuClick} isSidebarCollapsed={isDesktopSidebarCollapsed} />
        <div className="flex-1 h-full overflow-y-auto">{children}</div>
      </div>
      <Suspense fallback={null}>
        <AppGuide />
      </Suspense>
    </div>
  );
}

export default Layout;
