"use client";

import { focusRing, ghostButton } from "@/components/tl/styles";
import type { TeacherNotification } from "@/app/lib/notifications/inbox";
import { rowStamp } from "@/hooks/notifications/notifications.logic";
import { CategoryChip } from "./NotificationDetailCard";

/**
 * The DOM id of a row's button, so focus can return to it.
 *
 * @param id - The inbox item's id.
 * @returns The element id.
 */
export function notificationRowId(id: string): string {
  return `notification-row-${id}`;
}

/** Props for {@link NotificationFeed}. */
export interface NotificationFeedProps {
  /** The tab's notifications, newest first. */
  items: readonly TeacherNotification[];
  /** The open one, highlighted. */
  selectedId: string | null;
  onSelect: (item: TeacherNotification) => void;
  /** Shown instead of rows when the tab lists nothing. */
  emptyText: string;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
  /** The current time, for "Today" / "Yesterday". */
  now?: Date;
}

/**
 * The list of a tab's notifications (the design's `nRows`): an unread dot
 * (with "Unread" for screen readers), the title (bolder when unread), "day ·
 * time", two lines of the message and the category chip. Selecting a row
 * opens it. "Load more" reads the next page while either feed has one.
 *
 * @param props - See {@link NotificationFeedProps}.
 * @param props.items - The rows.
 * @param props.selectedId - The open row.
 * @param props.onSelect - Opens a row.
 * @param props.emptyText - The empty-tab text.
 * @param props.hasNextPage - Whether more can be loaded.
 * @param props.isFetchingNextPage - Whether the next page is loading.
 * @param props.onLoadMore - Loads the next page.
 * @param props.now - The current time.
 * @returns The rows, the empty text and the Load more button.
 */
export function NotificationFeed({ items, selectedId, onSelect, emptyText, hasNextPage, isFetchingNextPage, onLoadMore, now }: NotificationFeedProps) {
  return (
    <>
      {items.length === 0 ? (
        <p className="m-0 p-[22px] text-sm text-tl-muted">{emptyText}</p>
      ) : (
        <ul aria-label="Notifications" className="m-0 flex list-none flex-col gap-0.5 p-0">
          {items.map((item) => {
            const selected = item.id === selectedId;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  id={notificationRowId(item.id)}
                  onClick={() => onSelect(item)}
                  aria-current={selected ? "true" : undefined}
                  className={`flex w-full gap-3 rounded-2xl p-3.5 text-left transition-colors ${focusRing} ${selected ? "bg-tl-select" : "hover:bg-tl-subtle"}`}
                >
                  <span
                    aria-hidden
                    data-unread-dot={item.unread ? "true" : "false"}
                    className={`mt-1.5 h-[9px] w-[9px] shrink-0 rounded-full ${item.unread ? "bg-tl-link" : "bg-transparent"}`}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex justify-between gap-2.5">
                      <span className={`min-w-0 text-[15px] text-tl-ink ${item.unread ? "font-extrabold" : "font-bold"}`}>
                        {item.unread ? <span className="sr-only">Unread: </span> : null}
                        {item.title}
                      </span>
                      <span className="shrink-0 whitespace-nowrap text-xs text-tl-faint">{rowStamp(item.createdAt, now)}</span>
                    </span>
                    <span className="mt-1 line-clamp-2 block text-[13px] leading-normal text-tl-muted sm:line-clamp-3">{item.message}</span>
                    <span className="mt-2 block">
                      <CategoryChip category={item.category} />
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {hasNextPage ? (
        <div className="flex justify-center p-2">
          <button type="button" className={ghostButton} onClick={onLoadMore} disabled={isFetchingNextPage}>
            {isFetchingNextPage ? "Loading…" : "Load more"}
          </button>
        </div>
      ) : null}
    </>
  );
}
