"use client";

import { useLayoutEffect, useRef } from "react";
import { Loader2, MessageCircle, WifiOff } from "lucide-react";
import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import GroupMessageBubble from "./GroupMessageBubble";
import PrivateMessageBubble from "./PrivateMessageBubble";
import ReplyPreview from "./ReplyPreview";
import { useChatRoom } from "@/app/hooks/useChatRoom";
import { useAppContext } from "@/app/context/AppContext";
import { RealtimeChatRoom } from "@/app/hooks/useRealtimeChat";
import { ChatParticipant } from "@/app/hooks/useWebSocket";
import { ChatMessageView } from "@/app/lib/chat/normalizeMessage";
import { readersOf, receiptState } from "@/app/lib/chat/readModel";
import { generateColorFromString } from "@/lib/colorUtils";
import type { ClassRecord, CourseRecord, ReplyTarget } from "./helpers";

const NEAR_BOTTOM_PX = 120;
const LOAD_OLDER_AT_PX = 40;

export interface ChatThreadProps {
  variant: "group" | "private";
  roomId: string;
  /** The room as listed in the sidebar, kept live by chat-rooms-update. */
  room?: RealtimeChatRoom | null;
  replyingMessage: ReplyTarget | null;
  setReplyingMessage: (msg: ReplyTarget | null) => void;
  onBack?: () => void;
}

const participantId = (p: ChatParticipant) => p.userId ?? p._id;
const participantName = (p: ChatParticipant) =>
  `${p.firstName || ""} ${p.lastName || ""}`.trim() || "Unknown User";
const messageKey = (m: ChatMessageView) => m.clientMessageId || m._id;

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const formatDate = (date: Date) => {
  const today = new Date();
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const messageMidnight = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const yesterday = new Date(todayMidnight);
  yesterday.setDate(yesterday.getDate() - 1);

  if (messageMidnight.getTime() === todayMidnight.getTime()) return "Today";
  if (messageMidnight.getTime() === yesterday.getTime()) return "Yesterday";
  return date.toLocaleDateString();
};

/** Messages grouped by day, oldest first (the store is already sorted). */
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
 * The thread shared by private and group chats: header, history with paging,
 * pending/failed sends and the composer. Only the header and bubbles differ.
 */
export default function ChatThread({
  variant,
  roomId,
  room,
  replyingMessage,
  setReplyingMessage,
  onBack,
}: ChatThreadProps) {
  const thread = useChatRoom(roomId);
  const { classes, courses } = useAppContext();
  const me = thread.currentUserId;

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
    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    nearBottomRef.current = distanceFromBottom < NEAR_BOTTOM_PX;

    if (container.scrollTop < LOAD_OLDER_AT_PX && hasMore && !loadingOlder && thread.isConnected) {
      prependAnchorRef.current = {
        scrollHeight: container.scrollHeight,
        scrollTop: container.scrollTop,
      };
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

  const header = (() => {
    if (variant === "private") {
      const other = others[0];
      return {
        name: other ? participantName(other) : room?.displayName || "Private Chat",
        avatar: other?.userAvatar || "",
        status: other ? (other.isOnline ? "Online" : "Offline") : undefined,
        subtext: undefined,
      };
    }

    let name = roomData?.name || "";
    if (!name && roomData?.type === "class_group" && roomData.classId) {
      name = (classes as ClassRecord[] | undefined)?.find((c) => (c._id || c.id) === roomData.classId)?.name || "Class Group";
    }
    if (!name && roomData?.type === "course_group" && roomData.courseId) {
      const course = (courses as CourseRecord[] | undefined)?.find((c) => (c._id || c.id) === roomData.courseId);
      name = course?.title || course?.name || "Course Group";
    }

    const onlineCount = others.filter((p) => p.isOnline).length;
    const names = others.map(participantName);
    return {
      name: name || room?.displayName || "Group Chat",
      avatar: roomData?.avatarUrl || "",
      status:
        onlineCount === 0
          ? "Group chat"
          : onlineCount === 1
            ? "1 member online"
            : `${onlineCount} members online`,
      subtext:
        names.length === 0
          ? "No other participants"
          : names.length <= 3
            ? names.join(", ")
            : `${names.slice(0, 2).join(", ")} and ${names.length - 2} others`,
    };
  })();

  const isInitialLoad = messages.length === 0 && (joinStatus === "joining" || joinStatus === "idle");
  const Bubble = variant === "group" ? GroupMessageBubble : PrivateMessageBubble;

  return (
    <div className="w-full h-full flex flex-col relative bg-white">
      <ChatHeader
        avatar={header.avatar}
        name={header.name}
        status={header.status}
        subtext={header.subtext}
        roomId={variant === "group" ? roomId : undefined}
        contact={
          variant === "private" && others[0]
            ? {
                name: header.name,
                avatar: others[0].userAvatar,
                role: others[0].role,
                isOnline: others[0].isOnline,
              }
            : undefined
        }
        onBack={onBack}
        showBackButton={true}
      />

      <div
        className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-2 sm:space-y-3 bg-gray-50"
        ref={containerRef}
        onScroll={handleScroll}
      >
        {loadingOlder && (
          <div className="flex justify-center py-2">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
          </div>
        )}

        {joinStatus === "error" && messages.length > 0 && (
          <div className="flex items-center justify-center gap-2 text-xs text-red-600">
            <span>{thread.joinError || "Couldn't load this chat"}</span>
            <button type="button" className="underline" onClick={thread.retryJoin}>
              Retry
            </button>
          </div>
        )}

        {isInitialLoad ? (
          <div className="flex flex-col items-center justify-center h-48">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-2" />
            <p className="text-sm text-gray-500">Loading messages...</p>
          </div>
        ) : joinStatus === "error" && messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48">
            <p className="text-sm text-red-500 mb-2">
              {thread.joinError || "Couldn't load this chat"}
            </p>
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm"
              onClick={thread.retryJoin}
            >
              Retry
            </button>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="text-center p-8">
              <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Start a conversation</h3>
              <p className="text-sm text-gray-400">Send a message below to get started.</p>
            </div>
          </div>
        ) : (
          groupByDate(messages).map(({ dateKey, messages: dayMessages }) => (
            <div key={dateKey}>
              <div className="flex justify-center my-4">
                <div className="px-3 py-1 bg-gray-200 text-gray-600 rounded-full text-xs font-medium">
                  {formatDate(new Date(dateKey))}
                </div>
              </div>

              {dayMessages.map((message) => {
                const isOwn = Boolean(me) && message.senderId === me;
                const clientMessageId = message.clientMessageId;
                const readCount = message._id === latestOwnId ? readersOf(message, me).length : 0;
                return (
                  <Bubble
                    key={messageKey(message)}
                    msg={{
                      sender: message.senderName,
                      text: message.text,
                      time: formatTime(message.createdAt),
                      senderType: isOwn ? "self" : "other",
                      avatar: message.senderAvatar || "/icons/user-placeholder.svg",
                      color: generateColorFromString(message.senderName || message.senderId),
                    }}
                    message={message}
                    receipt={isOwn ? receiptState(message, me, otherParticipantId) : undefined}
                    readByLabel={readCount > 0 ? `Read by ${readCount}` : undefined}
                    setReplyingMessage={setReplyingMessage}
                    onRetry={clientMessageId ? () => thread.retry(clientMessageId) : undefined}
                    onDelete={clientMessageId ? () => thread.remove(clientMessageId) : undefined}
                  />
                );
              })}
            </div>
          ))
        )}
      </div>

      {!thread.isConnected && (
        <div className="flex items-center gap-2 bg-amber-50 border-t border-amber-200 px-3 py-2 text-xs text-amber-800">
          <WifiOff size={14} className="flex-shrink-0" />
          <span>You&apos;re offline. Messages will send when you reconnect.</span>
        </div>
      )}

      {replyingMessage && (
        <ReplyPreview
          replyingMessage={replyingMessage}
          onCancel={() => setReplyingMessage(null)}
        />
      )}

      <MessageInput
        value={thread.draft}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => thread.setDraft(e.target.value)}
        onSend={() => thread.send(thread.draft)}
        onSendFiles={(files, caption) => thread.send(caption, { files })}
        onSendVoice={(file, duration) => thread.send("", { voice: { file, duration } })}
        disabled={!roomId}
        placeholder="Type a message..."
      />
    </div>
  );
}
