import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import MessageOptionsDropdown from "./MessageDropdown";
import AudioMessage from "./AudioMessage";
import VideoMessage from "./VideoMessage";


interface MessageBubbleProps {
  msg: {
    senderType: string;
    avatar: string;
    sender: string;
    color: string;
    type: string;
    text?: string;
    videoThumbnail?: string;
    duration?: string;
    time: string;
  };
  index: number;
  openSubMenu: { index: number; type: string } | null;
  toggleSubMenu: (index: number, type: string) => void;
  setReplyingMessage: (msg: any) => void;
}

export default function GroupMessageBubble({
  msg,
  index,
  openSubMenu,
  toggleSubMenu,
  setReplyingMessage,
}: MessageBubbleProps) {
  return (
    <div
      className={`relative flex items-end ${
        msg.senderType === "self" ? "justify-end" : "justify-start"
      } gap-2`}
    >
      <div className="flex flex-col gap-1">
        <div className="flex items-end gap-2">
          {msg.senderType !== "self" && (
            <div className="relative w-8 h-8">
              <Avatar className="w-8 h-8 rounded-full">
                <AvatarImage src={msg.avatar} />
              </Avatar>
            </div>
          )}
          <Card
            className={`p-3 max-w-md border-none shadow-none ${
              msg.senderType === "self"
                ? "bg-[#ADBECE] text-white"
                : "bg-white text-[#030E18]"
            }`}
          >
           
              <MessageOptionsDropdown
                index={index}
                msg={msg}
                openSubMenu={openSubMenu}
                toggleSubMenu={toggleSubMenu}
                setReplyingMessage={setReplyingMessage}
              />
            

            {msg.sender !== "me" && (
              <div className="flex justify-between relative">
                <p className={`text-sm font-semibold ${msg.color} `}>
                  {msg.sender}
                </p>
              </div>
            )}

            {msg.type === "text" && <p className="text-sm">{msg.text}</p>}
            {msg.type === "voice" && <AudioMessage sender={msg.sender} />}
            {msg.type === "video" && (
              <VideoMessage
                videoThumbnail={msg.videoThumbnail || ""}
                videoDuration={msg.duration || ""}
                messageText={msg.text || ""}
              />
            )}
          </Card>
        </div>
        <div className="flex gap-1 text-xs text-[#ADADAD] self-end">
          {msg.time}{" "}
          {msg.senderType === "self" && (
            <svg className="text-[#003366]" width="16" height="16" />
          )}
        </div>
      </div>
    </div>
  );
}
