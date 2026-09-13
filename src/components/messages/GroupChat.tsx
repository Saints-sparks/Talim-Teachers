import ChatThread, { ChatThreadProps } from "./ChatThread";

type GroupChatProps = Omit<ChatThreadProps, "variant">;

export default function GroupChat(props: GroupChatProps) {
  return <ChatThread variant="group" {...props} />;
}
