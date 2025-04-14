import { useState } from "react";
import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import GroupMessageBubble from "./GroupMessageBubble";
import ReplyPreview from "./ReplyPreview";

const messages = [
  {
    sender: "Mrs. Yetunde Adebayo",
    color: "text-[#F39C12]",
    senderType: "teacher",
    avatar: "/image/teachers/english.png",
    text: "Hi everyone! Don’t forget, the creative writing assignment is due tomorrow. If you have any questions or need help, feel free to ask here!",
    time: "3:10pm",
    type: "text",
  },
  {
    sender: "Daniel Okoro",
    color: "text-[#99CCFF]",
    senderType: "other",
    text: "/audio/sample-voice-note.mp3",
    avatar: "/image/teachers/mathematics.png",
    time: "3:12pm",
    type: "voice",
  },
  {
    sender: "me",
    color: "text-[#99CCFF]",
    senderType: "self",
    text: "/audio/sample-voice-note.mp3",
    avatar: "/image/teachers/mathematics.png",
    time: "3:12pm",
    type: "voice",
  },
  {
    sender: "Daniel Okoro",
    color: "text-[#99CCFF]",
    senderType: "student",
    avatar: "/image/teachers/mathematics.png",
    videoThumbnail: "/image/subject/english.png",
    duration: "00:30",
    text: "Good evening, students. Please make sure to inform your parents about the Everyday English textbook. Have a lovely weekend!",
    time: "3:15pm",
    type: "video",
  },
];

interface GroupChatProps {
  replyingMessage: { sender: string; text: string } | null;
  setReplyingMessage: (msg: any) => void;
  openSubMenu: { index: number; type: string } | null;
  toggleSubMenu: (index: number, type: string) => void;
}

const GroupChat = ({
  replyingMessage,
  setReplyingMessage,
  openSubMenu,
  toggleSubMenu,
}: GroupChatProps) => {
  const [chatMessages] = useState(messages);

  return (
    <div className="lg:w-3/5 xl:w-2/3  flex flex-col relative">
      <div className="flex items-center rounded-tr-lg p-4 border-b bg-white">
        <ChatHeader
          avatar="/image/teachers/english.png"
          name="JSS 1"
          subtext="Aisha Suleiman, Daniel Okoro, Fatima Abubakar, Chinedu Eze, Maryam Yusuf, Ibrahim Danladi"
        />
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        <div className="text-center px-4 py-2 bg-white rounded-md w-fit mx-auto text-xs text-[#030E18] my-4">
          Today
        </div>
        {chatMessages.map((msg, index) => (
          <GroupMessageBubble
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
        <ReplyPreview
          replyingMessage={replyingMessage}
          onCancel={() => setReplyingMessage(null)}
        />
      )}

      <MessageInput />
    </div>
  );
};

export default GroupChat;
