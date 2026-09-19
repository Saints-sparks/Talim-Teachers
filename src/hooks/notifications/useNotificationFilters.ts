"use client";

import { useCallback, useMemo, useState } from "react";
import { categoryLabel } from "@/components/notifications/categoryMeta";
import { filterNotifications, type SortKey, type TabKey, type TeacherNotification } from "@/app/lib/notifications/inbox";

/**
 * The inbox's view state: which tab, search text and sort order are active,
 * which notification is open, and the resulting visible list.
 *
 * The open notification is derived, not stored twice: if the one the teacher
 * picked is filtered out (or read state changes the list), the first visible
 * one is shown instead, and an empty list shows none.
 *
 * @param notifications - The full inbox.
 * @returns The view state, the filtered list, the open notification and the setters.
 */
export function useNotificationFilters(notifications: TeacherNotification[]) {
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("newest");
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

  const filtered = useMemo(
    () => filterNotifications(notifications, { tab: activeTab, query: searchQuery, sort: sortKey }, categoryLabel),
    [activeTab, notifications, searchQuery, sortKey],
  );

  const selected = useMemo(
    () => filtered.find((notification) => notification.id === pickedId) ?? filtered[0] ?? null,
    [filtered, pickedId],
  );

  const select = useCallback((notification: TeacherNotification) => {
    setPickedId(notification.id);
    setMobileDetailOpen(true);
  }, []);

  const closeDetail = useCallback(() => setMobileDetailOpen(false), []);

  return {
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    sortKey,
    setSortKey,
    filtered,
    selected,
    select,
    mobileDetailOpen,
    closeDetail,
  };
}
