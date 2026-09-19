"use client";

import { cn } from "@/app/lib/utils";
import type { NotificationCounts, TabKey } from "@/app/lib/notifications/inbox";
import { notificationTabs } from "./categoryMeta";

/** Props for {@link NotificationTabs}. */
export interface NotificationTabsProps {
  activeTab: TabKey;
  counts: NotificationCounts;
  onTabChange: (tab: TabKey) => void;
}

/**
 * The filter tabs across the top of the list, each with its count.
 *
 * @param props - See {@link NotificationTabsProps}.
 * @param props.activeTab - The selected tab.
 * @param props.counts - Per-tab counts.
 * @param props.onTabChange - Called when a tab is picked.
 * @returns The tab strip element.
 */
export function NotificationTabs({ activeTab, counts, onTabChange }: NotificationTabsProps) {
  return (
    <div className="overflow-x-auto border-b border-[#E8EDF5] p-3">
      <div role="tablist" className="grid min-w-[680px] grid-cols-6 rounded-xl border border-[#E5EAF2] bg-[#F8FAFD] p-1">
        {notificationTabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onTabChange(tab.key)}
              className={cn(
                "flex h-10 items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium transition",
                isActive
                  ? "bg-white text-[#003366] shadow-sm ring-1 ring-[#DCE5F2] dark:ring-slate-600"
                  : "text-[#667085] hover:bg-white/80 hover:text-[#101828] dark:hover:bg-slate-800",
              )}
            >
              <span>{tab.label}</span>
              <span
                className={cn(
                  "min-w-6 rounded-full px-2 py-0.5 text-xs",
                  isActive ? "bg-[#E7F0FF] text-[#003366]" : "bg-[#EDF2F8] text-[#667085]",
                )}
              >
                {counts[tab.key] || 0}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
