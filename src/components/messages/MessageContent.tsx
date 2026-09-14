import { FileText, ImageIcon, Mic } from "lucide-react";
import { ChatMessageView } from "@/app/lib/chat/normalizeMessage";

interface MessageContentProps {
  message: ChatMessageView;
  isOwn: boolean;
}

/**
 * The body of a chat bubble: text and attachments. The only place message
 * media is rendered, shared by private and group bubbles.
 */
export default function MessageContent({ message, isOwn }: MessageContentProps) {
  const text = message.text?.trim() ? message.text : "";
  const muted = isOwn ? "text-blue-100" : "text-gray-500";

  // Media the app can't play or preview yet still shows something readable.
  let placeholder: { icon: typeof FileText; label: string } | null = null;
  if (message.type === "voice") {
    placeholder = { icon: Mic, label: "Voice note" };
  } else if (message.type === "image") {
    placeholder = { icon: ImageIcon, label: "Photo" };
  } else if (message.type === "file" || message.attachments.length > 0) {
    placeholder = { icon: FileText, label: message.attachments[0]?.name || "File" };
  }

  return (
    <div className="flex flex-col gap-1">
      {placeholder && (
        <span className={`flex items-center gap-1.5 text-sm ${text ? muted : ""}`}>
          <placeholder.icon size={14} className="flex-shrink-0" />
          <span className="truncate">{placeholder.label}</span>
        </span>
      )}
      {text && (
        <p className="text-sm sm:text-base leading-relaxed break-words whitespace-pre-wrap">
          {text}
        </p>
      )}
    </div>
  );
}
