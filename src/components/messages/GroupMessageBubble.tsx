import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import BubbleMenu from "./BubbleMenu";
import MessageContent from "./MessageContent";
import MessageReceipt from "./MessageReceipt";
import { generateColorFromString, getUserInitials } from "@/lib/colorUtils";
import type { MessageBubbleProps } from "./PrivateMessageBubble";

export default function GroupMessageBubble({
  msg,
  message,
  receipt,
  readByLabel,
  onReply,
  onDeleteMessage,
  onJump,
  onRetry,
  onDelete,
}: MessageBubbleProps) {
  const initials = getUserInitials(msg.sender);
  const bgColor = msg.color || generateColorFromString(msg.sender);
  const isOwn = msg.senderType === "self";

  return (
    <div
      className={`relative flex items-end ${
        isOwn ? "justify-end" : "justify-start"
      } gap-2 px-2 sm:px-0 mb-3`}
    >
      <div className={`flex gap-2 max-w-[85%] sm:max-w-md ${
        isOwn ? "flex-row-reverse" : "flex-row"
      }`}>
        {/* Avatar - only show for other users, not self */}
        {!isOwn && (
          <div className="relative w-8 h-8 flex-shrink-0 self-end mb-1">
            <Avatar className="w-8 h-8 rounded-full">
              <AvatarImage src={msg.avatar} />
              <AvatarFallback
                className="text-white font-medium text-xs"
                style={{ backgroundColor: bgColor }}
              >
                {initials}
              </AvatarFallback>
            </Avatar>
          </div>
        )}

        {/* Message Content */}
        <div className={`flex flex-col ${
          isOwn ? "items-end" : "items-start"
        }`}>
          {/* Sender Name - only show for group messages from others */}
          {!isOwn && (
            <div className="mb-1 px-1">
              <p
                className="text-xs font-semibold"
                style={{ color: bgColor }}
              >
                {msg.sender}
              </p>
            </div>
          )}

          {/* Message Bubble */}
          <Card
            className={`px-3 py-2 sm:px-4 sm:py-3 border-none shadow-sm relative group ${
              isOwn
                ? "bg-blue-500 text-white rounded-2xl rounded-br-md"
                : "bg-white text-gray-900 border border-gray-200 rounded-2xl rounded-bl-md"
            }`}
          >
            <BubbleMenu
              message={message}
              isOwn={isOwn}
              onReply={onReply}
              onDeleteMessage={onDeleteMessage}
            />

            <MessageContent message={message} isOwn={isOwn} onJump={onJump} />
          </Card>

          {/* Time and Status */}
          <div className={`flex items-center gap-1 text-xs text-gray-400 mt-1 px-1 ${
            isOwn ? "flex-row-reverse" : "flex-row"
          }`}>
            <span>{msg.time}</span>
            {isOwn && receipt && (
              <MessageReceipt
                state={receipt}
                readByLabel={readByLabel}
                onRetry={onRetry}
                onDelete={onDelete}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
