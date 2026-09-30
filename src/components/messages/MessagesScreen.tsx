"use client";

import React, { useCallback, useEffect, useId, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Search } from "lucide-react";
import { useChat } from "@/app/context/ChatContext";
import { messagesRoomUrl } from "@/app/hooks/useChatAlerts";
import { useChatRoom } from "@/app/hooks/useChatRoom";
import type { RealtimeChatRoom } from "@/app/hooks/useRealtimeChat";
import type { ReplyDraft } from "@/components/chat-kit";
import { cardFrame, chip, fieldControl, focusRing, ghostButton, pagePad, pageTitle, primaryButton } from "@/components/tl/styles";
import { cn } from "@/app/lib/utils";
import { THREAD_FILTERS, filterThreads, threadCounts, type ThreadFilter } from "@/hooks/messages/messages.logic";
import ChatThread from "./ChatThread";
import { NewClassGroupSheet } from "./NewClassGroupSheet";
import { NewMessageSheet } from "./NewMessageSheet";
import { ThreadList } from "./ThreadList";

/** Props for {@link MessagesScreen}. */
export interface MessagesScreenProps {
  /** The current time for the thread times; pinned in tests. */
  now?: Date;
}

/**
 * The redesigned Messages page (`/messages?room=`): the header with "New
 * message" (the contacts picker) and "New class group", the category chips
 * (All, Parents, Colleagues, Class groups, Office) and a thread search, the
 * conversations, and the open conversation. The open room lives in the URL,
 * so deep links, push clicks, toasts and Back all open the same way;
 * selecting a room is what joins it. Below 1024px the list and the chat
 * toggle, with Back in the chat header.
 *
 * @param props - See {@link MessagesScreenProps}.
 * @returns The screen.
 */
export function MessagesScreen({ now }: MessagesScreenProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roomId = searchParams.get("room");
  const { chatRooms, isLoading, isConnected, error, refreshChatRooms, selectRoom, unselectRoom, currentUserId } = useChat();
  const thread = useChatRoom(roomId);
  const [filter, setFilter] = useState<ThreadFilter>("all");
  const [search, setSearch] = useState("");
  const [newMessageOpen, setNewMessageOpen] = useState(false);
  const [newGroupOpen, setNewGroupOpen] = useState(false);
  // Reply previews belong to the chat they were started in.
  const [repliesByRoom, setRepliesByRoom] = useState<Record<string, ReplyDraft | null>>({});
  const searchId = useId();

  const room = roomId ? (chatRooms.find((r) => r.roomId === roomId) ?? null) : null;
  const roomType = room?.type ?? thread.room?.type ?? null;

  // Selecting a room is what joins it; exactly once per open chat.
  useEffect(() => {
    if (roomId) selectRoom(roomId);
    else unselectRoom();
  }, [roomId, selectRoom, unselectRoom]);

  // Leaving the messages page leaves the room.
  useEffect(() => () => unselectRoom(), [unselectRoom]);

  const visible = useMemo(() => filterThreads(chatRooms, filter, search, currentUserId), [chatRooms, filter, search, currentUserId]);
  const counts = useMemo(() => threadCounts(chatRooms, currentUserId), [chatRooms, currentUserId]);

  /**
   * Opens a conversation (through the url, which joins it).
   *
   * @param picked - The room.
   */
  const open = (picked: RealtimeChatRoom) => {
    if (picked.roomId !== roomId) router.push(messagesRoomUrl(picked.roomId));
  };
  /** Back to the list (phones). */
  const back = () => router.replace("/messages");

  const setReply = useCallback(
    (reply: ReplyDraft | null) => {
      if (!roomId) return;
      setRepliesByRoom((prev) => ({ ...prev, [roomId]: reply }));
    },
    [roomId],
  );

  const listEmpty = (() => {
    if (search.trim()) return `No conversations match “${search.trim()}”.`;
    if (filter !== "all") return "No conversations here.";
    return "No conversations yet. Start one with New message.";
  })();

  return (
    // The page guide's button floats over the bottom right corner: the conversation ends above it
    // (a shorter card on wide screens, more room below it on phones), so it never covers Send.
    <div className={cn(pagePad, "flex flex-col gap-[18px] pb-28 lg:pb-16")}>
      <div className="flex flex-wrap items-end justify-between gap-3.5">
        <div>
          <h1 className={pageTitle}>Messages</h1>
          <p className="mt-[5px] text-[15px] text-tl-muted">Parents, colleagues, class groups and the school office.</p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <button type="button" className={ghostButton} onClick={() => setNewMessageOpen(true)} title="Write to a parent, a colleague or the school office" data-guide="messages-new">
            New message
          </button>
          <button type="button" className={primaryButton} onClick={() => setNewGroupOpen(true)} title="Start a group with a whole class" data-guide="messages-new-group">
            New class group
          </button>
        </div>
      </div>

      <div className={`flex flex-wrap items-center gap-3 ${roomId ? "hidden lg:flex" : "flex"}`} data-guide="messages-filters">
        <div role="group" aria-label="Show conversations" className="flex flex-wrap gap-2">
          {THREAD_FILTERS.map((f) => (
            <button key={f.id} type="button" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)} className={chip(filter === f.id)}>
              {f.label}
              <span className="sr-only">, {counts[f.id]} conversations</span>
            </button>
          ))}
        </div>
        <div className="relative min-w-[220px] flex-1 sm:max-w-[320px]">
          <label htmlFor={searchId} className="sr-only">
            Search conversations
          </label>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-tl-faint" aria-hidden />
          <input id={searchId} type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search conversations" className={`${fieldControl} pl-10`} />
        </div>
      </div>

      <div className="flex h-[max(460px,calc(100dvh-240px))] items-stretch gap-[18px] lg:h-[max(560px,calc(100dvh-340px))]">
        <div
          className={`${cardFrame} flex-col p-2 lg:flex lg:w-[340px] lg:shrink-0 ${roomId ? "hidden" : "flex w-full"} min-h-0`}
          data-guide="messages-list"
        >
          <div className="min-h-0 flex-1 overflow-y-auto">
            {error ? (
              <div role="alert" className="m-2 rounded-2xl bg-tl-danger-bg p-3.5 text-[13px] font-bold text-tl-danger">
                {error}
                <button type="button" className={`ml-2 inline-flex min-h-[44px] items-center rounded px-1 underline ${focusRing}`} onClick={refreshChatRooms}>
                  Retry
                </button>
              </div>
            ) : null}
            {chatRooms.length === 0 && (isLoading || !isConnected) && !error ? (
              <div role="status" aria-label={isConnected ? "Loading conversations" : "Connecting to chat"} className="flex flex-col gap-1 p-1">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="h-16 animate-pulse rounded-2xl bg-tl-line/60" />
                ))}
                {!isConnected ? <p className="px-2 pt-2 text-center text-[13px] text-tl-muted">Connecting to chat…</p> : null}
              </div>
            ) : visible.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-tl-muted">{listEmpty}</p>
            ) : (
              <ThreadList rooms={visible} selectedRoomId={roomId} currentUserId={currentUserId} onSelect={open} now={now} />
            )}
          </div>
        </div>

        <div className={`${cardFrame} min-h-0 min-w-0 flex-1 flex-col overflow-hidden ${roomId ? "flex" : "hidden lg:flex"}`}>
          {roomId ? (
            roomType ? (
              <ChatThread
                key={roomId}
                variant={roomType === "one_to_one" ? "private" : "group"}
                roomId={roomId}
                room={room}
                replyingMessage={repliesByRoom[roomId] ?? null}
                setReplyingMessage={setReply}
                onBack={back}
              />
            ) : thread.joinStatus === "error" ? (
              <div className="m-auto flex flex-col items-center gap-3 p-6 text-center" role="alert">
                <p className="text-sm font-bold text-tl-danger">{thread.joinError || "Couldn't load this conversation"}</p>
                <div className="flex gap-2">
                  <button type="button" className={primaryButton} onClick={thread.retryJoin}>
                    Try again
                  </button>
                  <button type="button" className={ghostButton} onClick={back}>
                    Back to conversations
                  </button>
                </div>
              </div>
            ) : (
              <div className="m-auto flex flex-col items-center gap-2 text-sm text-tl-muted" role="status">
                <Loader2 className="h-7 w-7 animate-spin text-tl-brand" aria-hidden />
                Loading conversation…
              </div>
            )
          ) : (
            <div className="m-auto max-w-[320px] p-6 text-center">
              <p className="text-[17px] font-extrabold text-tl-ink">Pick a conversation</p>
              <p className="mt-1.5 text-sm text-tl-muted">Or write to a parent, a colleague or the school office.</p>
              <button type="button" className={`${ghostButton} mt-4`} onClick={() => setNewMessageOpen(true)}>
                New message
              </button>
            </div>
          )}
        </div>
      </div>

      <NewMessageSheet open={newMessageOpen} onClose={() => setNewMessageOpen(false)} />
      <NewClassGroupSheet open={newGroupOpen} onClose={() => setNewGroupOpen(false)} />
    </div>
  );
}
