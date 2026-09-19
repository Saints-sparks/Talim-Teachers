"use client";

import { MessageMenu, type ReplyDraft } from "@/components/chat-kit";
import { toast } from "@/components/CustomToast";
import type { ChatMessageView } from "@/app/lib/chat/normalizeMessage";

interface BubbleMenuProps {
  message: ChatMessageView;
  isOwn: boolean;
  /** Start a reply to this message. */
  onReply?: (reply: ReplyDraft) => void;
  /** Present when this user may delete this message. */
  onDeleteMessage?: () => Promise<void>;
}

/** The message options for one bubble. Only on stored, not-deleted messages. */
export default function BubbleMenu({ message, isOwn, onReply, onDeleteMessage }: BubbleMenuProps) {
  if (message.status !== "sent" || message.isDeleted) return null;
  return (
    <MessageMenu
      messageId={message._id}
      text={message.text}
      attachments={message.attachments}
      onReply={
        onReply
          ? () =>
              onReply({
                messageId: message._id,
                senderName: message.senderName,
                preview: message.text || (message.attachments.length ? "Attachment" : ""),
              })
          : undefined
      }
      onDelete={onDeleteMessage}
      onNotify={(text) => (/copied/i.test(text) ? toast.success(text) : toast.error(text))}
      tone={isOwn ? "inverted" : "default"}
      className="absolute right-1 top-1 z-10"
    />
  );
}
