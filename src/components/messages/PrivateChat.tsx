import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageBubble from "./PrivateMessageBubble";
import ReplyPreview from "./ReplyPreview";


const messages = [
  { sender: "Mrs Yetunde Adebayo", text: "Hi everyone!", time: "3:10pm", type: "text", senderType: "teacher", avatar: "/image/teachers/english.png", color: "blue" },
  { sender: "me", text: "Got it!", time: "3:12pm", type: "text", senderType: "student", avatar: "/image/students/me.png", color: "green" },
  {
    sender: "Mrs Yetunde Adebayo",
    text: "/audio/sample-voice-note.mp3",
    time: "3:12pm",
    type: "voice",
    senderType: "teacher",
    avatar: "/image/teachers/english.png",
    color: "blue",
  },
  {
    sender: "me",
    text: "/audio/sample-voice-note.mp3",
    time: "3:12pm",
    type: "voice",
    senderType: "student",
    avatar: "/image/students/me.png",
    color: "green",
  },
];

interface PrivateChatProps {
  replyingMessage: { sender: string; text: string } | null;
  setReplyingMessage: (msg: any) => void;
  openSubMenu: { index: number; type: string } | null;
  toggleSubMenu: (index: number, type: string) => void;
}

export default function PrivateChat({
  replyingMessage,
  setReplyingMessage,
  openSubMenu,
  toggleSubMenu,
}: PrivateChatProps) {
  return (
    <div className="w-2/3 flex flex-col">
      <div className="flex items-center rounded-tr-lg p-4 border-b bg-white">
        <ChatHeader
          avatar="/image/teachers/english.png"
          name="Mrs. Yetunde Adebayo"
          status="typing..."
        />
        {/* Additional action icons can be added here if needed */}
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-hide p-4">
        <div className="text-center px-4 py-2 bg-white rounded-md w-fit mx-auto text-xs text-[#030E18] my-4">
          Today
        </div>
        {messages.map((msg, index) => (
          <MessageBubble
            key={index}
            msg={msg}
            index={index}
            openSubMenu={openSubMenu}
            toggleSubMenu={toggleSubMenu}
            setReplyingMessage={setReplyingMessage}
          />
        ))}
      </div>
      {replyingMessage && (
        <ReplyPreview replyingMessage={replyingMessage} onCancel={() => setReplyingMessage(null)} />
      )}
      <MessageInput />
    </div>
  );
}
