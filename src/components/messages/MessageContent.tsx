"use client";
import { ChatMessageView } from "@/app/lib/chat/normalizeMessage";
import { AttachmentGrid } from "@/components/chat-kit";
import { toast } from "@/components/CustomToast";

interface MessageContentProps {
  message: ChatMessageView;
  isOwn: boolean;
}

const showPlaybackError = (text: string) => toast.error(text);

/**
 * The body of a chat bubble: attachments through the chat kit, caption below.
 * The only place message media is rendered, shared by private and group bubbles.
 */
export default function MessageContent({ message, isOwn }: MessageContentProps) {
  const text = message.text?.trim() ? message.text : "";
  const hasAttachments = message.attachments.length > 0;

  return (
    <div className="flex flex-col gap-1.5">
      {hasAttachments && (
        <AttachmentGrid
          attachments={message.attachments}
          tone={isOwn ? "inverted" : "default"}
          progress={message.status === "sent" ? undefined : message.uploadProgress}
          pending={message.status !== "sent"}
          onPlaybackError={showPlaybackError}
        />
      )}
      {text && (
        <p className="text-sm sm:text-base leading-relaxed break-words whitespace-pre-wrap">
          {text}
        </p>
      )}
    </div>
  );
}
