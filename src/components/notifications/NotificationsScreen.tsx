"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { toast } from "@/components/CustomToast";
import { card, cardFrame, cardTitle, chip, ghostButton, pagePad, pageTitle, primaryButton, rowButton } from "@/components/tl/styles";
import type { TeacherNotification } from "@/app/lib/notifications/inbox";
import {
  countsFromItems,
  filterByTab,
  NOTIFICATION_TABS,
  notificationTabHref,
  tabCounts,
  type NotificationTabId,
} from "@/hooks/notifications/notifications.logic";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotificationCounts,
  useNotificationInbox,
  type InboxFeed,
} from "@/hooks/notifications/useNotificationInbox";
import { getErrorMessage } from "@/lib/apiError";
import { NotificationDetailCard, NotificationDetailHint } from "./NotificationDetailCard";
import { NotificationFeed, notificationRowId } from "./NotificationFeed";

/** Props for {@link NotificationsScreen}. */
export interface NotificationsScreenProps {
  /** `?tab=`: which tab to open. */
  initialTab?: NotificationTabId;
}

/** The list card's id, which every tab controls. */
const PANEL_ID = "notifications-panel";

/** The open notification's heading id. */
const DETAIL_HEADING_ID = "notification-detail-title";

/**
 * The DOM id of a tab.
 *
 * @param tab - The tab.
 * @returns The element id.
 */
function tabDomId(tab: NotificationTabId): string {
  return `notifications-tab-${tab}`;
}

/**
 * Whether the list and the detail sit side by side (the `lg` breakpoint);
 * below it they take turns.
 *
 * @returns True on wide screens.
 */
function isWideScreen(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(min-width: 1024px)").matches;
}

/**
 * The words for a feed that failed while the other loaded.
 *
 * @param feeds - The failed feeds.
 * @returns The banner text.
 */
function partialText(feeds: readonly InboxFeed[]): string {
  if (feeds.includes("announcements") && !feeds.includes("notifications")) {
    return "School announcements couldn't be loaded, so some notifications are missing here.";
  }
  if (feeds.includes("notifications") && !feeds.includes("announcements")) {
    return "Talim alerts couldn't be loaded, so some notifications are missing here.";
  }
  return "Some notifications couldn't be loaded.";
}

/**
 * A warning strip above the list with a way to retry.
 *
 * @param props - The text and the retry.
 * @param props.text - What went wrong.
 * @param props.onRetry - Tries again.
 * @returns The banner.
 */
function RetryBanner({ text, onRetry }: { text: string; onRetry: () => void }) {
  return (
    <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-tl-warning/30 bg-tl-warning-bg px-4 py-2.5">
      <span className="text-sm font-bold text-tl-warning">{text}</span>
      <button type="button" className={`${rowButton} bg-tl-surface`} onClick={onRetry}>
        Try again
      </button>
    </div>
  );
}

/**
 * The redesigned Notifications page (design "Notifications"): the header
 * with "Alert settings" and "Mark all as read", tabs with counts from
 * `GET /notifications/counts` (All, Unread, Academics, Attendance,
 * Announcements; no Messages tab), the merged inbox paged with "Load more",
 * and the open notification beside it. Selecting a row marks it read. Below
 * the `lg` breakpoint the list and the detail take turns, with focus moving
 * to the detail's title and back to the row.
 *
 * @param props - See {@link NotificationsScreenProps}.
 * @param props.initialTab - The tab from `?tab=`.
 * @returns The screen.
 */
export function NotificationsScreen({ initialTab = "all" }: NotificationsScreenProps) {
  const router = useRouter();
  const inbox = useNotificationInbox();
  const countsQuery = useNotificationCounts();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();

  const [tab, setTab] = useState<NotificationTabId>(initialTab);
  const [pickedId, setPickedId] = useState<string | null>(null);
  // Read on the Unread tab, kept there until the tab changes, so a row does not vanish when opened.
  const [kept, setKept] = useState<ReadonlySet<string>>(() => new Set());
  const [detailOpen, setDetailOpen] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const pendingFocus = useRef<"detail" | "row" | null>(null);
  const now = new Date();

  useEffect(() => {
    setTab(initialTab);
    setPickedId(null);
    setKept(new Set());
    setDetailOpen(false);
  }, [initialTab]);

  const counts = countsQuery.data ?? (countsQuery.isError && inbox.hasData ? countsFromItems(inbox.items) : undefined);
  const perTab = counts ? tabCounts(counts) : null;
  const visible = useMemo(() => filterByTab(inbox.items, tab, kept), [inbox.items, tab, kept]);
  const selected: TeacherNotification | null = visible.find((item) => item.id === pickedId) ?? visible[0] ?? null;
  const selectedId = selected?.id ?? null;

  useEffect(() => {
    if (pendingFocus.current === "detail" && detailOpen) headingRef.current?.focus();
    if (pendingFocus.current === "row" && !detailOpen && selectedId) document.getElementById(notificationRowId(selectedId))?.focus();
    pendingFocus.current = null;
  }, [detailOpen, selectedId]);

  const changeTab = (next: NotificationTabId) => {
    setTab(next);
    setPickedId(null);
    setKept(new Set());
    setDetailOpen(false);
    router.replace(notificationTabHref(next), { scroll: false });
  };

  const onTabKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const index = NOTIFICATION_TABS.findIndex((t) => t.id === tab);
    const last = NOTIFICATION_TABS.length - 1;
    const next =
      event.key === "ArrowRight" ? (index + 1) % NOTIFICATION_TABS.length
      : event.key === "ArrowLeft" ? (index + last) % NOTIFICATION_TABS.length
      : event.key === "Home" ? 0
      : event.key === "End" ? last
      : -1;
    if (next < 0) return;
    event.preventDefault();
    const id = NOTIFICATION_TABS[next].id;
    changeTab(id);
    document.getElementById(tabDomId(id))?.focus();
  };

  const select = (item: TeacherNotification) => {
    setPickedId(item.id);
    if (tab === "unread") setKept((prev) => new Set(prev).add(item.id));
    if (item.unread) markRead.mutate(item);
    if (!isWideScreen()) {
      pendingFocus.current = "detail";
      setDetailOpen(true);
    }
  };

  const back = () => {
    pendingFocus.current = "row";
    setDetailOpen(false);
  };

  const markAllRead = () => {
    markAll.mutate(undefined, { onSuccess: () => toast.success("All notifications marked as read.") });
  };

  const header = (
    <div className="flex flex-wrap items-end justify-between gap-3.5">
      <div>
        <h1 className={pageTitle}>Notifications</h1>
        <p className="m-0 mt-[5px] text-[15px] text-tl-muted">School announcements, deadlines and Talim updates.</p>
      </div>
      <div className="flex flex-wrap gap-2.5">
        <Link href="/settings?tab=notifications" className={ghostButton} title="Choose which alerts reach you">
          Alert settings
        </Link>
        <button
          type="button"
          className={primaryButton}
          onClick={markAllRead}
          disabled={!counts || counts.unread === 0 || markAll.isPending}
          title="Clear every unread marker"
          data-guide="notifications-mark-all"
        >
          Mark all as read
        </button>
      </div>
    </div>
  );

  const tabs = (
    <div role="tablist" aria-label="Show notifications" className="flex flex-wrap gap-2" onKeyDown={onTabKeyDown} data-guide="notifications-tabs">
      {NOTIFICATION_TABS.map((t) => {
        const on = t.id === tab;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={tabDomId(t.id)}
            aria-selected={on}
            aria-controls={PANEL_ID}
            tabIndex={on ? 0 : -1}
            className={chip(on)}
            onClick={() => changeTab(t.id)}
          >
            <span>{t.label}</span>
            {perTab ? <span className={`text-xs font-extrabold ${on ? "opacity-70" : ""}`}>{perTab[t.id]}</span> : null}
          </button>
        );
      })}
    </div>
  );

  let content: React.ReactNode;
  if (inbox.isPending) {
    content = (
      <div id={PANEL_ID} role="tabpanel" aria-labelledby={tabDomId(tab)} className="grid items-start gap-[18px] lg:grid-cols-2">
        <div role="status" aria-label="Loading notifications" className="flex flex-col gap-2 rounded-[22px] border border-tl-line bg-tl-surface p-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-[96px] animate-pulse rounded-2xl bg-tl-line/70" />
          ))}
        </div>
        <div aria-hidden className="hidden h-[320px] animate-pulse rounded-[22px] bg-tl-line/70 lg:block" />
      </div>
    );
  } else if (!inbox.hasData) {
    content = (
      <div id={PANEL_ID} role="tabpanel" aria-labelledby={tabDomId(tab)}>
        <div className={card} role="alert">
          <h2 className={cardTitle}>We could not load your notifications</h2>
          <p className="m-0 mt-1.5 text-sm text-tl-muted">{getErrorMessage(inbox.error, "Check your connection and try again.")}</p>
          <button type="button" className={`${primaryButton} mt-4`} onClick={() => void inbox.refetch()}>
            Try again
          </button>
        </div>
      </div>
    );
  } else {
    const emptyText = inbox.items.length === 0 ? "You're all caught up. School announcements, deadlines and Talim updates will show here." : "Nothing here.";
    content = (
      <div className="grid items-start gap-[18px] lg:grid-cols-2">
        <section
          id={PANEL_ID}
          role="tabpanel"
          aria-labelledby={tabDomId(tab)}
          className={`${cardFrame} p-2 ${detailOpen ? "hidden lg:block" : ""}`}
          data-guide="notifications-list"
        >
          <NotificationFeed
            items={visible}
            selectedId={selectedId}
            onSelect={select}
            emptyText={emptyText}
            hasNextPage={inbox.hasNextPage}
            isFetchingNextPage={inbox.isFetchingNextPage}
            onLoadMore={() => void inbox.fetchNextPage()}
            now={now}
          />
        </section>
        <div className={`flex-col gap-3 lg:sticky lg:top-[18px] ${detailOpen ? "flex" : "hidden lg:flex"}`}>
          <button type="button" className={`${ghostButton} self-start lg:hidden`} onClick={back}>
            <ChevronLeft aria-hidden className="h-4 w-4" />
            Back to notifications
          </button>
          {selected ? (
            <NotificationDetailCard notification={selected} now={now} headingRef={headingRef} headingId={DETAIL_HEADING_ID} />
          ) : (
            <NotificationDetailHint
              text={inbox.items.length === 0 ? "When something arrives, open it here to read the whole message." : "Nothing to open in this tab. Try another tab."}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`${pagePad} flex flex-col gap-[18px]`}>
      {header}
      {tabs}
      {inbox.hasData && inbox.failedFeeds.length > 0 ? <RetryBanner text={partialText(inbox.failedFeeds)} onRetry={() => void inbox.refetch()} /> : null}
      {inbox.hasData && inbox.isRefetchError ? (
        <RetryBanner text="We couldn't refresh your notifications. Showing what loaded earlier." onRetry={() => void inbox.refetch()} />
      ) : null}
      {inbox.isFetchNextPageError ? <RetryBanner text="We couldn't load more notifications." onRetry={() => void inbox.fetchNextPage()} /> : null}
      {content}
    </div>
  );
}
