"use client";

import React, { useState } from "react";
import { Download } from "lucide-react";
import { Lightbox, formatBytes } from "@/components/chat-kit";
import { ghostButton, focusRing, primaryButton } from "@/components/tl/styles";
import { getErrorMessage } from "@/lib/apiError";
import type { SharedMediaItem, SharedMediaKind } from "@/types/inboxSettings";
import { useRoomMedia } from "@/hooks/messages/useInbox";

/** The label of each media kind (the info modal's tabs). */
export const MEDIA_LABELS: Record<SharedMediaKind, string> = { image: "Images", video: "Videos", document: "Documents", link: "Links" };

/**
 * "18 Sep 2026" for a shared item.
 *
 * @param iso - When it was sent.
 * @returns The date.
 */
function sentOn(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/**
 * The short badge on a document or link row ("PDF", "DOCX", "URL").
 *
 * @param item - The shared item.
 * @returns Up to four capitals.
 */
function badgeOf(item: SharedMediaItem): string {
  if (item.kind === "link") return "URL";
  const ext = (item.name ?? item.url).split("?")[0].split(".").pop() ?? "";
  return ext && ext.length <= 5 ? ext.slice(0, 4).toUpperCase() : "FILE";
}

/**
 * The round Download button on a document or video row.
 *
 * @param props - The row's props.
 * @param props.item - The shared file to download.
 * @returns A link that downloads the file (opens it in a new tab where the host refuses `download`).
 */
function DownloadLink({ item }: { item: SharedMediaItem }) {
  const fallback = item.kind === "video" ? "video" : "file";
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      download={item.name || true}
      aria-label={`Download ${item.name || fallback}`}
      title="Download"
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-tl-muted hover:bg-tl-bg hover:text-tl-ink ${focusRing}`}
    >
      <Download className="h-4 w-4" aria-hidden />
    </a>
  );
}

/** Props for {@link SharedMedia}. */
export interface SharedMediaProps {
  roomId: string;
  kind: SharedMediaKind;
}

/**
 * One media tab of the conversation info (§29 `GET /chat/rooms/:id/media`):
 * images as a grid that opens the chat kit's Lightbox, videos as players
 * (loading only their metadata until played) with their name, size, sender,
 * date and a Download link, documents with their size, sender and date and a
 * Download link, links with who shared them.
 * Newest first, with "Load more" while the server has more; its own loading,
 * empty ("No images shared in this conversation yet.") and error states.
 *
 * @param props - See {@link SharedMediaProps}.
 * @returns The tab's content.
 */
export default function SharedMedia({ roomId, kind }: SharedMediaProps) {
  const query = useRoomMedia(roomId, kind, true);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const items = query.data?.pages.flatMap((page) => page.items) ?? [];
  const label = MEDIA_LABELS[kind].toLowerCase();

  if (query.isPending) {
    return (
      <div role="status" aria-label={`Loading ${label}`} className="mt-3 flex flex-col gap-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-14 animate-pulse rounded-xl bg-tl-line/70" />
        ))}
      </div>
    );
  }

  if (query.isError) {
    return (
      <div role="alert" className="mt-4 rounded-2xl border border-tl-line-soft p-4">
        <p className="text-sm font-bold text-tl-ink">We couldn&apos;t load the {label}.</p>
        <p className="mt-1 text-[13px] text-tl-muted">{getErrorMessage(query.error, "Check your connection and try again.")}</p>
        <button type="button" className={`${primaryButton} mt-3`} onClick={() => void query.refetch()}>
          Try again
        </button>
      </div>
    );
  }

  if (items.length === 0) {
    return <p className="py-9 text-center text-[15px] text-tl-faint">No {label} shared in this conversation yet.</p>;
  }

  const more = query.hasNextPage ? (
    <button type="button" className={`${ghostButton} mt-3 self-center`} disabled={query.isFetchingNextPage} onClick={() => void query.fetchNextPage()}>
      {query.isFetchingNextPage ? "Loading…" : "Load more"}
    </button>
  ) : null;

  if (kind === "image") {
    return (
      <div className="mt-3 flex flex-col">
        <ul className="grid grid-cols-3 gap-1.5" aria-label="Shared images">
          {items.map((item, i) => (
            <li key={`${item.messageId}-${item.url}`}>
              <button
                type="button"
                onClick={() => setLightboxIndex(i)}
                className={`block aspect-square w-full overflow-hidden rounded-xl bg-tl-track ${focusRing}`}
                aria-label={`Open ${item.name || "image"}, from ${item.sender.name}, ${sentOn(item.sentAt)}`}
              >
                <img src={item.url} alt="" loading="lazy" className="h-full w-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
        {more}
        <Lightbox
          images={items.map((item) => ({ url: item.url, name: item.name ?? undefined }))}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onIndexChange={setLightboxIndex}
        />
      </div>
    );
  }

  if (kind === "video") {
    return (
      <div className="mt-3 flex flex-col">
        <ul className="flex flex-col gap-4" aria-label="Shared videos">
          {items.map((item) => {
            const title = item.name || "Video";
            const meta = [formatBytes(item.size ?? undefined), item.sender.name, sentOn(item.sentAt)].filter(Boolean).join(" · ");
            return (
              <li key={`${item.messageId}-${item.url}`} className="flex flex-col gap-2">
                <video
                  src={item.url}
                  controls
                  preload="metadata"
                  playsInline
                  aria-label={`${title}, from ${item.sender.name}, ${sentOn(item.sentAt)}`}
                  className="block aspect-video w-full rounded-xl bg-black"
                />
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-bold text-tl-ink" title={item.name ?? undefined}>
                      {title}
                    </p>
                    <p className="mt-0.5 truncate text-[13px] text-tl-muted">{meta}</p>
                  </div>
                  <DownloadLink item={item} />
                </div>
              </li>
            );
          })}
        </ul>
        {more}
      </div>
    );
  }

  return (
    <div className="mt-2 flex flex-col">
      <ul className="flex flex-col" aria-label={`Shared ${label}`}>
        {items.map((item) => {
          const who = item.sender.name;
          const meta = [kind === "document" ? formatBytes(item.size ?? undefined) : "", who, sentOn(item.sentAt)].filter(Boolean).join(" · ");
          return (
            <li key={`${item.messageId}-${item.url}`} className="flex items-center gap-3 border-t border-tl-line-soft py-3 first:border-t-0">
              <span
                aria-hidden
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] text-[10px] font-extrabold ${
                  kind === "link" ? "bg-tl-success-bg text-tl-success" : "bg-tl-danger-bg text-tl-danger"
                }`}
              >
                {badgeOf(item)}
              </span>
              <div className="min-w-0 flex-1">
                {kind === "link" ? (
                  <a href={item.url} target="_blank" rel="noopener noreferrer" className={`block truncate rounded text-[15px] font-bold text-tl-link hover:underline ${focusRing}`}>
                    {item.url}
                  </a>
                ) : (
                  <p className="truncate text-[15px] font-bold text-tl-ink" title={item.name ?? undefined}>
                    {item.name || "File"}
                  </p>
                )}
                <p className="mt-0.5 truncate text-[13px] text-tl-muted">{meta}</p>
              </div>
              {kind === "document" ? <DownloadLink item={item} /> : null}
            </li>
          );
        })}
      </ul>
      {more}
    </div>
  );
}
