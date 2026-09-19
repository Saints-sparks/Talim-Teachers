"use client";
import { Ban } from "lucide-react";
import { ChatMessageView } from "@/app/lib/chat/normalizeMessage";
import { AttachmentGrid, Linkified, QuotedMessage } from "@/components/chat-kit";
import { toast } from "@/components/CustomToast";

interface MessageContentProps {
  message: ChatMessageView;
  isOwn: boolean;
  /** Scroll to a quoted message; omitted for one that isn't in the loaded thread. */
  onJump?: (messageId: string) => void;
}

const showPlaybackError = (text: string) => toast.error(text);

/**
 * The body of a chat bubble: the quote, the media (through the chat kit), then
 * the text with tappable links — or the placeholder for a deleted message.
 * The only place message content is rendered, shared by private and group bubbles.
 */
export default function MessageContent({ message, isOwn, onJump }: MessageContentProps) {
  const tone = isOwn ? "inverted" : "default";

  if (message.isDeleted) {
    return (
      <p className="flex items-center gap-1.5 text-sm italic opacity-80">
        <Ban size={14} aria-hidden /> This message was deleted
      </p>
    );
  }

  const text = message.text?.trim() ? message.text : "";
  const hasAttachments = message.attachments.length > 0;

  return (
    <div className="flex flex-col gap-1.5">
      {message.replyTo && <QuotedMessage replyTo={message.replyTo} tone={tone} onJump={onJump} />}
      {hasAttachments && (
        <AttachmentGrid
          attachments={message.attachments}
          tone={tone}
          progress={message.status === "sent" ? undefined : message.uploadProgress}
          pending={message.status !== "sent"}
          failed={message.status === "failed"}
          onPlaybackError={showPlaybackError}
        />
      )}
      {text && (
        <p className="text-sm sm:text-base leading-relaxed break-words whitespace-pre-wrap">
          <Linkified text={text} tone={tone} />
        </p>
      )}
    </div>
  );
}
