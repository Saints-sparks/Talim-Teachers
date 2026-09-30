"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { Loader2, WifiOff } from "lucide-react";
import ChatHeader from "./ChatHeader";
import ConversationInfo from "./ConversationInfo";
import MessageBubble from "./MessageBubble";
import MessageInput from "./MessageInput";
import { ReplyBar, type ReplyDraft } from "@/components/chat-kit";
import { focusRing, primaryButton } from "@/components/tl/styles";
import { useChatRoom } from "@/app/hooks/useChatRoom";
import type { RealtimeChatRoom } from "@/app/hooks/useRealtimeChat";
import type { ChatParticipant } from "@/app/hooks/useWebSocket";
import { roleLabel } from "@/app/lib/chat/groupPermissions";
import type { ChatMessageView } from "@/app/lib/chat/normalizeMessage";
import { readersOf, receiptState } from "@/app/lib/chat/readModel";
import { clockTime } from "@/hooks/messages/messages.logic";

const NEAR_BOTTOM_PX = 120;
const LOAD_OLDER_AT_PX = 40;

/** Props for {@link ChatThread}. */
export interface ChatThreadProps {
  /** `group` for anything but a one-to-one chat (sender names over bubbles, "Read by N"). */
  variant: "group" | "private";
  roomId: string;
  /** The room as listed, kept live by chat-rooms-update. */
  room?: RealtimeChatRoom | null;
  replyingMessage: ReplyDraft | null;
  setReplyingMessage: (msg: ReplyDraft | null) => void;
  /** Back to the list (phones). */
  onBack?: () => void;
}

const participantId = (p: ChatParticipant) => p.userId ?? p._id;
const participantName = (p: ChatParticipant) => `${p.firstName || ""} ${p.lastName || ""}`.trim() || "Unknown user";
const messageKey = (m: ChatMessageView) => m.clientMessageId || m._id;

/**
 * "Today", "Yesterday" or the date, for the day separators.
 *
 * @param date - Midnight of the day.
 * @returns The label.
 */
const formatDate = (date: Date) => {
  const today = new Date();
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const messageMidnight = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const yesterday = new Date(todayMidnight);
  yesterday.setDate(yesterday.getDate() - 1);
  if (messageMidnight.getTime() === todayMidnight.getTime()) return "Today";
  if (messageMidnight.getTime() === yesterday.getTime()) return "Yesterday";
  return date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
};

/**
 * Messages grouped by day, oldest first (the store is already sorted).
 *
 * @param messages - The thread.
 * @returns One group per day.
 */
const groupByDate = (messages: ChatMessageView[]) => {
  const groups: Array<{ dateKey: string; messages: ChatMessageView[] }> = [];
  for (const message of messages) {
    const dateKey = new Date(message.createdAt).toDateString();
    const last = groups[groups.length - 1];
    if (last && last.dateKey === dateKey) last.messages.push(message);
    else groups.push({ dateKey, messages: [message] });
  }
  return groups;
};

/**
 * The open conversation (the design's chat card): the header (subtitle, a
 * Call link only for a room with `callPhone`, the info modal), the history
 * with paging, day separators, receipts, replies and delete, pending and
 * failed sends, and the composer with attachments and voice notes. The
 * engine (`useChatRoom` / `useRealtimeChat`) is unchanged; this is its
 * surface.
 *
 * @param props - See {@link ChatThreadProps}.
 * @returns The chat card's content.
 */
export default function ChatThread({ variant, roomId, room, replyingMessage, setReplyingMessage, onBack }: ChatThreadProps) {
  const thread = useChatRoom(roomId);
  const me = thread.currentUserId;
  const [infoOpen, setInfoOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const nearBottomRef = useRef(true);
  const lastKeyRef = useRef<string | null>(null);
  const firstKeyRef = useRef<string | null>(null);
  const prependAnchorRef = useRef<{ scrollHeight: number; scrollTop: number } | null>(null);

  const { messages, loadingOlder, hasMore, joinStatus } = thread;

  // Keep the reader's place when older messages are prepended; follow new
  // messages only when already near the bottom or when I sent them.
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const firstKey = messages.length ? messageKey(messages[0]) : null;
    const last = messages.length ? messages[messages.length - 1] : null;
    const lastKey = last ? messageKey(last) : null;

    const anchor = prependAnchorRef.current;
    if (anchor && firstKey !== firstKeyRef.current) {
      container.scrollTop = container.scrollHeight - anchor.scrollHeight + anchor.scrollTop;
      prependAnchorRef.current = null;
    } else if (anchor && !loadingOlder) {
      prependAnchorRef.current = null;
    }

    if (last && lastKey !== lastKeyRef.current) {
      const firstRender = lastKeyRef.current === null;
      const sentByMe = Boolean(me) && last.senderId === me && last.status !== "sent";
      if (firstRender || nearBottomRef.current || sentByMe) {
        container.scrollTop = container.scrollHeight;
        nearBottomRef.current = true;
      }
    }

    firstKeyRef.current = firstKey;
    lastKeyRef.current = lastKey;
  }, [messages, loadingOlder, me]);

  const handleScroll = () => {
    const container = containerRef.current;
    if (!container) return;
    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    nearBottomRef.current = distanceFromBottom < NEAR_BOTTOM_PX;

    if (container.scrollTop < LOAD_OLDER_AT_PX && hasMore && !loadingOlder && thread.isConnected) {
      prependAnchorRef.current = { scrollHeight: container.scrollHeight, scrollTop: container.scrollTop };
      thread.loadOlder();
    }
  };

  // Participants and presence: the live room list first, then the join payload.
  const participants: ChatParticipant[] = room?.participants?.length
    ? room.participants
    : thread.room?.participants?.length
      ? thread.room.participants
      : thread.participants;
  const others = participants.filter((p) => participantId(p) !== me);
  const roomData = room ?? thread.room;

  // Receipts: in a direct message, read once the other person has read it; in a
  // group, "Read by N" under my latest stored message only.
  const otherParticipantId = variant === "private" ? (others[0] ? participantId(others[0]) : null) : undefined;
  let latestOwnId: string | null = null;
  if (variant === "group" && me) {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].senderId === me && messages[i].status === "sent") {
        latestOwnId = messages[i]._id;
        break;
      }
    }
  }

  const other = others[0];
  const name = variant === "private" ? (other ? participantName(other) : room?.displayName || "Conversation") : roomData?.name || room?.displayName || "Group";
  const fallbackSubtitle = (() => {
    if (variant === "private") return other ? roleLabel(other.role) : undefined;
    const count = participants.length;
    return `${count} ${count === 1 ? "member" : "members"}`;
  })();
  const subtitle = roomData?.subtitle || fallbackSubtitle;
  const avatar = variant === "private" ? other?.userAvatar || null : roomData?.avatarUrl || null;

  const isInitialLoad = messages.length === 0 && (joinStatus === "joining" || joinStatus === "idle");
  const loadedIds = new Set(messages.map((m) => m._id));
  const clearReply = () => setReplyingMessage(null);

  /**
   * Delete is offered for my own messages, and in a group for others' (the server decides who may).
   *
   * @param message - The message.
   * @returns The delete handler, or undefined when there is none.
   */
  const deleteHandlerFor = (message: ChatMessageView) => {
    if (message.status !== "sent" || message.isDeleted) return undefined;
    const mine = Boolean(me) && message.senderId === me;
    if (!mine && variant !== "group") return undefined;
    return () => thread.removeStored(message._id);
  };

  /**
   * Scrolls to a quoted message and flashes it.
   *
   * @param messageId - The quoted message.
   */
  const jump = (messageId: string) => {
    const el = document.getElementById(`msg-${messageId}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("bg-tl-select");
    window.setTimeout(() => el.classList.remove("bg-tl-select"), 1200);
  };

  /**
   * Sends with the reply attached, then drops the reply bar.
   *
   * @param text - The text or caption.
   * @param media - Files or a voice note.
   */
  const sendWithReply = (text: string, media?: Parameters<typeof thread.send>[1]) => {
    thread.send(text, { ...media, replyTo: replyingMessage ?? undefined });
    clearReply();
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <ChatHeader
        name={name}
        subtitle={subtitle}
        avatar={avatar}
        group={variant === "group"}
        online={variant === "private" && Boolean(other?.isOnline)}
        callPhone={variant === "private" ? roomData?.callPhone : null}
        onInfo={() => setInfoOpen(true)}
        onBack={onBack}
      />

      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto bg-tl-subtle p-[18px]"
        aria-label={`Messages with ${name}`}
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        data-guide="messages-thread"
      >
        {loadingOlder ? (
          <div className="flex justify-center py-2" role="status" aria-label="Loading older messages">
            <Loader2 className="h-5 w-5 animate-spin text-tl-brand" aria-hidden />
          </div>
        ) : null}

        {joinStatus === "error" && messages.length > 0 ? (
          <div className="flex items-center justify-center gap-2 text-xs font-bold text-tl-danger" role="alert">
            <span>{thread.joinError || "Couldn't load this chat"}</span>
            <button type="button" className={`inline-flex min-h-[44px] items-center rounded px-1 underline ${focusRing}`} onClick={thread.retryJoin}>
              Retry
            </button>
          </div>
        ) : null}

        {isInitialLoad ? (
          <div className="m-auto flex flex-col items-center gap-2 text-sm text-tl-muted" role="status">
            <Loader2 className="h-7 w-7 animate-spin text-tl-brand" aria-hidden />
            Loading messages…
          </div>
        ) : joinStatus === "error" && messages.length === 0 ? (
          <div className="m-auto flex flex-col items-center gap-3 text-center" role="alert">
            <p className="text-sm font-bold text-tl-danger">{thread.joinError || "Couldn't load this chat"}</p>
            <button type="button" className={primaryButton} onClick={thread.retryJoin}>
              Try again
            </button>
          </div>
        ) : messages.length === 0 ? (
          <p className="m-auto text-center text-sm text-tl-faint">No messages yet. Say hello below.</p>
        ) : (
          groupByDate(messages).map(({ dateKey, messages: dayMessages }) => (
            <section key={dateKey} className="flex flex-col gap-3" aria-label={formatDate(new Date(dateKey))}>
              <div className="flex justify-center">
                <span className="rounded-full bg-tl-track px-3 py-1 text-xs font-bold text-tl-muted">{formatDate(new Date(dateKey))}</span>
              </div>
              {dayMessages.map((message) => {
                const isOwn = Boolean(me) && message.senderId === me;
                const clientMessageId = message.clientMessageId;
                const readCount = message._id === latestOwnId ? readersOf(message, me).length : 0;
                return (
                  <div key={messageKey(message)} id={`msg-${message._id}`} className="rounded-2xl transition-colors duration-500">
                    <MessageBubble
                      message={message}
                      isOwn={isOwn}
                      showSender={variant === "group"}
                      time={clockTime(new Date(message.createdAt))}
                      receipt={isOwn ? receiptState(message, me, otherParticipantId) : undefined}
                      readByLabel={readCount > 0 ? `Read by ${readCount}` : undefined}
                      onReply={setReplyingMessage}
                      onDeleteMessage={deleteHandlerFor(message)}
                      onJump={message.replyTo && loadedIds.has(message.replyTo.messageId) ? jump : undefined}
                      onRetry={clientMessageId ? () => thread.retry(clientMessageId) : undefined}
                      onDelete={clientMessageId ? () => thread.remove(clientMessageId) : undefined}
                    />
                  </div>
                );
              })}
            </section>
          ))
        )}
      </div>

      {!thread.isConnected ? (
        <div className="flex items-center gap-2 border-t border-tl-line-soft bg-tl-warning-bg px-4 py-2 text-xs font-bold text-tl-warning" role="status">
          <WifiOff size={14} className="shrink-0" aria-hidden />
          <span>You&apos;re offline. Messages will send when you reconnect.</span>
        </div>
      ) : null}

      {replyingMessage ? <ReplyBar reply={replyingMessage} onCancel={clearReply} className="mx-3.5 mt-3" /> : null}

      <MessageInput
        value={thread.draft}
        onValueChange={thread.setDraft}
        onSend={() => sendWithReply(thread.draft)}
        onSendFiles={(files, caption) => sendWithReply(caption, { files })}
        onSendVoice={(file, duration) => sendWithReply("", { voice: { file, duration } })}
        disabled={!roomId}
        placeholder="Write a message"
      />

      <ConversationInfo
        open={infoOpen}
        onClose={() => setInfoOpen(false)}
        roomId={roomId}
        room={roomData ?? null}
        participants={participants}
        name={name}
        subtitle={roomData?.subtitle}
        currentUserId={me}
      />
    </div>
  );
}
