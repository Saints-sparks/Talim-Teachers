"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import { X } from "lucide-react";
import { useChat } from "@/app/context/ChatContext";
import type { ChatParticipant, ChatRoomData } from "@/app/hooks/useWebSocket";
import { canLeaveGroup, canManageGroup, hasGroupDetails, roleLabel } from "@/app/lib/chat/groupPermissions";
import { focusRing } from "@/components/tl/styles";
import { useGroupInfoEditor } from "@/hooks/messages/useGroupInfoEditor";
import { useRoomMedia } from "@/hooks/messages/useInbox";
import type { SharedMediaKind } from "@/types/inboxSettings";
import ChatInfoDialog from "./ChatInfoDialog";
import GroupDetails from "./GroupDetails";
import GroupMembers from "./GroupMembers";
import SharedMedia, { MEDIA_LABELS } from "./SharedMedia";
import { ThreadAvatar } from "./ThreadAvatar";

/** The modal's tabs, in the design's order. */
export type InfoTab = "members" | SharedMediaKind;

const TABS: readonly { id: InfoTab; label: string }[] = [
  { id: "members", label: "Members" },
  { id: "image", label: MEDIA_LABELS.image },
  { id: "document", label: MEDIA_LABELS.document },
  { id: "link", label: MEDIA_LABELS.link },
];

const TYPE_LABELS: Record<string, string> = {
  class_group: "Class group",
  course_group: "Course group",
  parent_group: "Parent group",
  admin_parent_group: "Admin and parents group",
  custom_group: "Group",
  office: "School office",
};

/** Props for {@link ConversationInfo}. */
export interface ConversationInfoProps {
  open: boolean;
  onClose: () => void;
  roomId: string;
  /** The room (the live list's copy, else the join payload's). */
  room: ChatRoomData | null;
  participants: ChatParticipant[];
  /** The name the header shows. */
  name: string;
  /** The header's subtitle, used for the other person in a direct chat. */
  subtitle?: string;
  currentUserId: string | null;
}

const participantId = (p: ChatParticipant) => p.userId ?? p._id;
const fullName = (p: ChatParticipant) => `${p.firstName || ""} ${p.lastName || ""}`.trim() || "Unknown user";

/**
 * The conversation info (the design's modal): a rail of tabs (Members,
 * Images, Documents, Links, each with its count) and the tab's content. For
 * a group, Members starts with the group's picture, name and description —
 * editable inline by group admins only — then the members with a "Group
 * admin" badge, and admins can add and remove members. A direct chat lists
 * the two people; the office inbox lists who reads it and has no editor.
 * The media tabs page through `GET /chat/rooms/:id/media` (§29).
 *
 * @param props - See {@link ConversationInfoProps}.
 * @returns The modal, or nothing while closed.
 */
export default function ConversationInfo({ open, onClose, roomId, room, participants, name, subtitle, currentUserId }: ConversationInfoProps) {
  const { dropRoom, applyRoomDetails } = useChat();
  const [tab, setTab] = useState<InfoTab>("members");
  const titleId = useId();
  const tabsId = useId();
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // Every open starts on Members.
  useEffect(() => {
    if (open) setTab("members");
  }, [open]);

  // The images page carries the totals for all three media tabs.
  const counts = useRoomMedia(roomId, "image", open).data?.pages[0]?.counts;

  const isGroup = hasGroupDetails(room);
  const isOffice = room?.type === "office";
  const description = room?.description || "";
  const me = { id: currentUserId };
  const canEdit = canManageGroup(room, me);
  const canLeave = canLeaveGroup(room);

  const editor = useGroupInfoEditor({
    isOpen: open,
    roomId,
    savedName: room?.name,
    description,
    displayName: name,
    currentUserId,
    onClose,
    applyRoomDetails,
    dropRoom,
  });

  const onlineCount = participants.filter((p) => p.isOnline && participantId(p) !== currentUserId).length;
  const summary = `${TYPE_LABELS[room?.type || ""] || "Group"} · ${participants.length} ${participants.length === 1 ? "member" : "members"}${
    onlineCount > 0 ? ` · ${onlineCount} online` : ""
  }`;

  /**
   * A tab's count: the members, or the media totals once a page has loaded.
   *
   * @param id - The tab.
   * @returns The count, or "" while unknown.
   */
  const countOf = (id: InfoTab): string => {
    if (id === "members") return String(participants.length);
    return counts ? String(counts[id]) : "";
  };

  /**
   * Arrow keys move between the tabs (and select them).
   *
   * @param event - The key press.
   * @param index - The focused tab.
   */
  const onTabKey = (event: React.KeyboardEvent, index: number) => {
    const delta = event.key === "ArrowDown" || event.key === "ArrowRight" ? 1 : event.key === "ArrowUp" || event.key === "ArrowLeft" ? -1 : 0;
    if (!delta) return;
    event.preventDefault();
    const next = TABS[(index + delta + TABS.length) % TABS.length];
    setTab(next.id);
    tabRefs.current[next.id]?.focus();
  };

  const current = TABS.find((t) => t.id === tab) ?? TABS[0];
  const others = participants.filter((p) => participantId(p) !== currentUserId);
  const mine = participants.find((p) => participantId(p) === currentUserId);

  return (
    <ChatInfoDialog open={open} onClose={onClose} labelledBy={titleId} className="flex-col sm:max-w-[660px] sm:flex-row">
      <h2 id={titleId} className="sr-only">
        Conversation info: {name}
      </h2>
      <div
        role="tablist"
        aria-label="Conversation info"
        aria-orientation="vertical"
        className="flex shrink-0 gap-0.5 overflow-x-auto border-b border-tl-line-soft bg-tl-subtle p-2 sm:w-[180px] sm:flex-col sm:border-b-0 sm:border-r sm:p-3"
      >
        {TABS.map((t, index) => {
          const selected = t.id === tab;
          return (
            <button
              key={t.id}
              ref={(el) => {
                tabRefs.current[t.id] = el;
              }}
              type="button"
              role="tab"
              id={`${tabsId}-${t.id}`}
              aria-selected={selected}
              aria-controls={`${tabsId}-panel`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setTab(t.id)}
              onKeyDown={(event) => onTabKey(event, index)}
              className={`flex min-h-[44px] shrink-0 items-center gap-3 rounded-xl px-3 text-sm ${focusRing} ${
                selected ? "bg-tl-surface font-extrabold text-tl-brand shadow-[0_1px_2px_rgba(15,27,46,0.06)]" : "font-semibold text-tl-muted hover:text-tl-ink"
              }`}
            >
              <span className="flex-1 text-left">{t.label}</span>
              <span className="text-xs font-extrabold opacity-70">{countOf(t.id)}</span>
            </button>
          );
        })}
      </div>

      <div
        id={`${tabsId}-panel`}
        role="tabpanel"
        aria-labelledby={`${tabsId}-${current.id}`}
        className="relative min-h-0 min-w-0 flex-1 overflow-y-auto p-[clamp(18px,3vw,24px)]"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className={`absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full text-tl-faint hover:bg-tl-bg hover:text-tl-ink ${focusRing}`}
          data-autofocus
        >
          <X className="h-5 w-5" aria-hidden />
        </button>
        <h3 className="pr-12 text-[19px] font-extrabold text-tl-ink">{current.label}</h3>
        <p className="mt-1 pr-12 text-[13px] text-tl-muted">{name}</p>

        <div className="mt-3.5 flex flex-col gap-4">
          {tab !== "members" ? (
            <SharedMedia roomId={roomId} kind={tab} />
          ) : isGroup ? (
            <>
              <GroupDetails editor={editor} name={name} description={description} avatarUrl={room?.avatarUrl || ""} canEdit={canEdit} canLeave={canLeave} summary={summary} />
              <GroupMembers roomId={roomId} room={room} participants={participants} currentUserId={currentUserId} canManage={canEdit && !editor.forbidden} admins={room?.admins} />
            </>
          ) : isOffice ? (
            <>
              <p className="rounded-2xl bg-tl-subtle p-3.5 text-[13px] leading-[1.6] text-tl-muted">
                The school office reads and replies here. Messages stay with the school, so anyone in the office can pick them up.
              </p>
              <GroupMembers roomId={roomId} room={room} participants={participants} currentUserId={currentUserId} canManage={false} admins={room?.admins} />
            </>
          ) : (
            <ul className="flex flex-col">
              {others.map((person) => (
                <li key={participantId(person)} className="flex items-center gap-3 border-t border-tl-line-soft py-3 first:border-t-0">
                  <ThreadAvatar name={fullName(person)} src={person.userAvatar} size={40} online={person.isOnline} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-bold text-tl-ink">{fullName(person)}</p>
                    <p className="mt-0.5 text-[13px] text-tl-muted">
                      {subtitle || roleLabel(person.role)}
                      {person.isOnline ? " · Online" : ""}
                    </p>
                  </div>
                </li>
              ))}
              {mine ? (
                <li className="flex items-center gap-3 border-t border-tl-line-soft py-3">
                  <ThreadAvatar name={fullName(mine)} src={mine.userAvatar} size={40} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-bold text-tl-ink">
                      {fullName(mine)} <span className="font-semibold text-tl-muted">(you)</span>
                    </p>
                    <p className="mt-0.5 text-[13px] text-tl-muted">{roleLabel(mine.role)}</p>
                  </div>
                </li>
              ) : null}
            </ul>
          )}
        </div>
      </div>
    </ChatInfoDialog>
  );
}
