"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { card, cardTitle, ghostButton, pagePad, primaryButton } from "@/components/tl/styles";
import { useNotificationDetail } from "@/hooks/notifications/useNotificationDetail";
import { ApiError, getErrorMessage } from "@/lib/apiError";
import { NotificationDetailCard } from "./NotificationDetailCard";

/** Props for {@link NotificationDetailScreen}. */
export interface NotificationDetailScreenProps {
  /** The notification id from the route. */
  id: string;
}

/**
 * One notification on its own page (`/notifications/[id]`, where push
 * notifications link): a way back to the inbox and the same detail card the
 * inbox shows. Opening it marks it read.
 *
 * @param props - See {@link NotificationDetailScreenProps}.
 * @param props.id - The notification id.
 * @returns The screen.
 */
export function NotificationDetailScreen({ id }: NotificationDetailScreenProps) {
  const { notification, isPending, error, refetch } = useNotificationDetail(id);
  const gone = error instanceof ApiError && (error.status === 404 || error.status === 403);

  return (
    <div className={pagePad}>
      <div className="flex max-w-[860px] flex-col gap-[18px]">
        <Link href="/notifications" className={`${ghostButton} self-start`}>
          <ChevronLeft aria-hidden className="h-4 w-4" />
          Back to notifications
        </Link>

        {notification ? (
          <NotificationDetailCard notification={notification} />
        ) : isPending && !error ? (
          <div role="status" aria-label="Loading the notification" className="h-[320px] animate-pulse rounded-[22px] bg-tl-line/70" />
        ) : (
          <div className={card} role="alert">
            <h2 className={cardTitle}>{gone ? "This notification is not available" : "We could not load this notification"}</h2>
            <p className="m-0 mt-1.5 text-sm text-tl-muted">
              {gone ? "It may have been removed, or it was meant for someone else. Your other notifications are in the inbox." : getErrorMessage(error, "Check your connection and try again.")}
            </p>
            {gone ? null : (
              <button type="button" className={`${primaryButton} mt-4`} onClick={() => void refetch()}>
                Try again
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
