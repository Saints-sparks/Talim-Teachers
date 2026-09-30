"use client";

import React from "react";
import type { RealtimeChatRoom } from "@/app/hooks/useRealtimeChat";
import { focusRing } from "@/components/tl/styles";
import { isGroupThread, threadPreview, threadTime } from "@/hooks/messages/messages.logic";
import { ThreadAvatar } from "./ThreadAvatar";

/** Props for {@link ThreadList}. */
export interface ThreadListProps {
  rooms: RealtimeChatRoom[];
  selectedRoomId: string | null;
  currentUserId: string | null;
  onSelect: (room: RealtimeChatRoom) => void;
  /** The current time, for "Thu" and "18 Sep"; pinned in tests. */
  now?: Date;
}

/**
 * The conversations, newest first (the design's `threadRows`): a list of
 * buttons, each with the avatar (square and green for a group), the name,
 * the time, the last message ("You: " before your own) and an unread pill.
 * The open conversation is marked with `aria-current`.
 *
 * @param props - See {@link ThreadListProps}.
 * @returns The list.
 */
export function ThreadList({ rooms, selectedRoomId, currentUserId, onSelect, now }: ThreadListProps) {
  return (
    <ul className="flex flex-col gap-0.5" aria-label="Conversations">
      {rooms.map((room) => {
        const selected = room.roomId === selectedRoomId;
        const group = isGroupThread(room);
        const unread = room.unreadCount > 0 ? room.unreadCount : 0;
        const time = threadTime(room.lastMessage?.createdAt, now);
        return (
          <li key={room.roomId}>
            <button
              type="button"
              onClick={() => onSelect(room)}
              aria-current={selected ? "true" : undefined}
              className={`flex min-h-[64px] w-full items-center gap-3 rounded-2xl p-3 text-left transition-colors ${focusRing} ${
                selected ? "bg-tl-select" : "hover:bg-tl-subtle"
              }`}
            >
              <ThreadAvatar
                name={room.displayName}
                group={group}
                src={room.avatarInfo.type === "image" ? room.avatarInfo.value : null}
                online={!group && room.isOnline}
              />
              <span className="min-w-0 flex-1">
                <span className="flex justify-between gap-2">
                  <span className="truncate text-[15px] font-extrabold text-tl-ink">{room.displayName}</span>
                  {time ? <span className="whitespace-nowrap text-xs text-tl-faint">{time}</span> : null}
                </span>
                <span className="mt-[3px] flex items-center justify-between gap-2">
                  <span className={`truncate text-[13px] ${unread ? "font-bold text-tl-ink" : "text-tl-muted"}`}>
                    {threadPreview(room, currentUserId)}
                  </span>
                  {unread ? (
                    <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-tl-brand-fill px-1.5 text-[11px] font-extrabold text-tl-on-brand">
                      {unread > 99 ? "99+" : unread}
                      <span className="sr-only"> unread</span>
                    </span>
                  ) : null}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
