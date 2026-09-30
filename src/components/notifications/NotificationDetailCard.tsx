"use client";

import Link from "next/link";
import type { Ref } from "react";
import { card, focusRing, pill, pillTone, primaryButton } from "@/components/tl/styles";
import type { NotificationCategory, TeacherNotification } from "@/app/lib/notifications/inbox";
import { attachmentBadge, categoryChip, detailMeta, notificationAction } from "@/hooks/notifications/notifications.logic";
import { formatBytes } from "@/hooks/subjects/scheme.logic";
import type { AttachmentFile } from "@/types/inboxSettings";

/**
 * A notification's category as the design's pill: Academics (info),
 * Attendance (warning), Announcement (accent), or Messages, Account and
 * Other (muted).
 *
 * @param props - The category.
 * @param props.category - The notification's category.
 * @returns The pill.
 */
export function CategoryChip({ category }: { category: NotificationCategory }) {
  const { label, tone } = categoryChip(category);
  return <span className={`${pill} ${pillTone[tone]}`}>{label}</span>;
}

/**
 * The attachments of a notification: a bordered row each with the file's
 * real kind ("PDF", "DOC", "Image", …), its name, its size when known, and a
 * Download link.
 *
 * @param props - The files.
 * @param props.files - The notification's `attachmentFiles`.
 * @returns The list, or nothing without files.
 */
export function AttachmentList({ files }: { files: readonly AttachmentFile[] }) {
  if (files.length === 0) return null;
  return (
    <ul aria-label="Attachments" className="flex flex-col gap-2.5">
      {files.map((file, index) => {
        const badge = attachmentBadge(file.kind);
        const size = formatBytes(file.size);
        return (
          <li key={`${file.url}-${index}`} className="flex items-center gap-3 rounded-[14px] border border-tl-line-soft px-3.5 py-2">
            <span className={`shrink-0 rounded-lg px-2 py-1.5 text-[11px] font-extrabold ${pillTone[badge.tone]}`}>{badge.label}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-bold text-tl-ink" title={file.name}>
                {file.name}
              </span>
              {size ? <span className="block text-xs text-tl-muted">{size}</span> : null}
            </span>
            <a
              href={file.url}
              download
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Download ${file.name}`}
              className={`inline-flex min-h-[44px] shrink-0 items-center rounded-md px-1 text-sm font-bold text-tl-link hover:underline ${focusRing}`}
            >
              Download
            </a>
          </li>
        );
      })}
    </ul>
  );
}

/** Props for {@link NotificationDetailCard}. */
export interface NotificationDetailCardProps {
  notification: TeacherNotification;
  /** The current time, for "Today" / "Yesterday". */
  now?: Date;
  /** The title's heading; the mobile inbox moves focus to it when the pane opens. */
  headingRef?: Ref<HTMLHeadingElement>;
  /** The heading's id, for a region labelled by it. */
  headingId?: string;
}

/**
 * The open notification (the design's `nd`): its category, title, sender and
 * time, the full message with its line breaks, the attachments, and the
 * action its `metadata.target` points at ("Take register", "Open grading",
 * …), if any.
 *
 * @param props - See {@link NotificationDetailCardProps}.
 * @param props.notification - The notification to show.
 * @param props.now - The current time.
 * @param props.headingRef - A ref to the title.
 * @param props.headingId - The title's id.
 * @returns The card.
 */
export function NotificationDetailCard({ notification, now, headingRef, headingId }: NotificationDetailCardProps) {
  const action = notificationAction(notification);
  return (
    <article className={`${card} flex flex-col gap-3.5`} aria-labelledby={headingId} data-guide="notifications-detail">
      <div>
        <CategoryChip category={notification.category} />
      </div>
      <h2
        ref={headingRef}
        id={headingId}
        tabIndex={-1}
        className={`m-0 rounded-md text-xl font-extrabold tracking-[-0.3px] text-tl-ink outline-none [text-wrap:pretty] ${focusRing}`}
      >
        {notification.title}
      </h2>
      <p className="m-0 text-[13px] font-bold text-tl-faint">{detailMeta(notification.senderName, notification.createdAt, now)}</p>
      <p className="m-0 whitespace-pre-line text-[15px] leading-[1.7] text-tl-body [text-wrap:pretty]">{notification.message}</p>
      <AttachmentList files={notification.attachmentFiles} />
      {action ? (
        <Link href={action.href} className={`${primaryButton} self-start`}>
          {action.label}
        </Link>
      ) : null}
    </article>
  );
}

/**
 * The detail pane with nothing to open: a short hint in the card.
 *
 * @param props - The hint.
 * @param props.text - What to say.
 * @returns The card.
 */
export function NotificationDetailHint({ text }: { text: string }) {
  return (
    <section className={card} aria-label="Notification" data-guide="notifications-detail">
      <p className="m-0 text-sm leading-relaxed text-tl-muted">{text}</p>
    </section>
  );
}
