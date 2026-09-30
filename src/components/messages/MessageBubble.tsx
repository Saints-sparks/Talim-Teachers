"use client";

import React from "react";
import { Check, CheckCheck, Clock } from "lucide-react";
import type { ReplyDraft } from "@/components/chat-kit";
import type { ChatMessageView } from "@/app/lib/chat/normalizeMessage";
import type { ReceiptState } from "@/app/lib/chat/readModel";
import BubbleMenu from "./BubbleMenu";
import MessageContent from "./MessageContent";
import SendStatus from "./SendStatus";

/** Props for {@link MessageBubble}. */
export interface MessageBubbleProps {
  message: ChatMessageView;
  isOwn: boolean;
  /** Groups: the sender's name over other people's messages. */
  showSender: boolean;
  /** "7:52am". */
  time: string;
  /** Tick state, for my own messages only. */
  receipt?: ReceiptState;
  /** Groups: "Read by N" under my latest message. */
  readByLabel?: string;
  /** Start a reply to this message. */
  onReply?: (reply: ReplyDraft) => void;
  /** Present when this user may delete this message. */
  onDeleteMessage?: () => Promise<void>;
  /** Scroll to a quoted message; omitted for one that isn't loaded. */
  onJump?: (messageId: string) => void;
  onRetry?: () => void;
  onDelete?: () => void;
}

/**
 * One message (the design's bubble): navy and right-aligned for mine, white
 * with a border for others, the sender's name in green in a group, the
 * content (quote, attachments, voice note, linked text) from the chat kit,
 * and the time with the receipt tick inside the bubble. A message that
 * failed to send shows "Not sent · Retry · Delete" under it.
 *
 * @param props - See {@link MessageBubbleProps}.
 * @returns The bubble.
 */
export default function MessageBubble({
  message,
  isOwn,
  showSender,
  time,
  receipt,
  readByLabel,
  onReply,
  onDeleteMessage,
  onJump,
  onRetry,
  onDelete,
}: MessageBubbleProps) {
  return (
    <div className={`flex flex-col ${isOwn ? "items-end" : "items-start"}`}>
      <div
        className={`group relative max-w-[min(460px,85%)] rounded-2xl px-3.5 py-[11px] pr-9 ${
          isOwn
            ? "rounded-br-[5px] bg-tl-brand-fill text-tl-on-brand"
            : "rounded-bl-[5px] border border-tl-line bg-tl-surface text-tl-ink"
        }`}
      >
        <BubbleMenu message={message} isOwn={isOwn} onReply={onReply} onDeleteMessage={onDeleteMessage} />
        {showSender && !isOwn ? <p className="mb-[3px] text-xs font-extrabold text-tl-success">{message.senderName || "Member"}</p> : null}
        <MessageContent message={message} isOwn={isOwn} onJump={onJump} />
        <p className="mt-[5px] flex items-center justify-end gap-1 text-[11px] opacity-75">
          <span>{time}</span>
          {isOwn && receipt === "pending" ? <Clock className="h-3 w-3" role="img" aria-label="Sending" /> : null}
          {isOwn && receipt === "sent" ? <Check className="h-3.5 w-3.5" role="img" aria-label="Sent" /> : null}
          {isOwn && receipt === "read" ? <CheckCheck className="h-3.5 w-3.5" role="img" aria-label="Read" /> : null}
        </p>
      </div>
      {isOwn && readByLabel ? <p className="mt-1 px-1 text-[11px] text-tl-faint">{readByLabel}</p> : null}
      {isOwn && receipt === "failed" ? (
        <div className="mt-1 px-1 text-xs">
          <SendStatus status="failed" onRetry={onRetry} onDelete={onDelete} />
        </div>
      ) : null}
    </div>
  );
}
