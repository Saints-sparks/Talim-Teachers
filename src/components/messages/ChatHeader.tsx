"use client";

import React from "react";
import { ChevronLeft, Info, Phone } from "lucide-react";
import { focusRing } from "@/components/tl/styles";
import { callHref } from "@/hooks/messages/messages.logic";
import { ThreadAvatar } from "./ThreadAvatar";

/** Props for {@link ChatHeader}. */
export interface ChatHeaderProps {
  name: string;
  /** The room's `subtitle` (§27), or a fallback built from the members. */
  subtitle?: string;
  avatar?: string | null;
  /** A group conversation (square green avatar). */
  group: boolean;
  /** The other person is online (direct chats). */
  online?: boolean;
  /** The room's `callPhone` (§27): shows the Call link; nothing else offers a call. */
  callPhone?: string | null;
  /** Opens the conversation info (members, images, documents, links). */
  onInfo: () => void;
  /** Back to the list (phones). */
  onBack?: () => void;
}

/**
 * The chat header (the design's, without in-app calls): Back on phones, the
 * avatar, name and subtitle, a "Call" link only when the room has a
 * `callPhone` (a teacher's chat with a parent of one of their students), and
 * the info button.
 *
 * @param props - See {@link ChatHeaderProps}.
 * @returns The header.
 */
export default function ChatHeader({ name, subtitle, avatar, group, online, callPhone, onInfo, onBack }: ChatHeaderProps) {
  const tel = callHref(callPhone);
  const round = `flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-tl-line text-tl-muted transition-colors hover:bg-tl-bg ${focusRing}`;

  return (
    <div className="flex items-center gap-3 border-b border-tl-line-soft px-[18px] py-3.5">
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to conversations"
          title="Back to conversations"
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-tl-line text-tl-brand lg:hidden ${focusRing}`}
        >
          <ChevronLeft className="h-5 w-5" aria-hidden />
        </button>
      ) : null}
      <ThreadAvatar name={name} group={group} src={avatar} size={42} online={online} />
      <div className="min-w-0 flex-1">
        <h2 className="truncate text-base font-extrabold text-tl-ink">{name}</h2>
        {subtitle ? <p className="mt-0.5 truncate text-[13px] text-tl-muted">{subtitle}</p> : null}
      </div>
      <div className="flex shrink-0 gap-2">
        {tel ? (
          <a
            href={tel}
            title={`Call ${name}`}
            aria-label={`Call ${name}`}
            className={`inline-flex h-11 items-center gap-1.5 rounded-full border border-tl-line px-3.5 text-sm font-bold text-tl-brand transition-colors hover:bg-tl-bg ${focusRing}`}
          >
            <Phone className="h-4 w-4" aria-hidden />
            Call
          </a>
        ) : null}
        <button
          type="button"
          onClick={onInfo}
          aria-label="Conversation info"
          title="Conversation info: members, images, documents and links"
          className={round}
          data-guide="messages-info"
        >
          <Info className="h-[18px] w-[18px]" aria-hidden />
        </button>
      </div>
    </div>
  );
}
