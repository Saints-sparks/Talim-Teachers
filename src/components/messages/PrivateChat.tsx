import ChatThread, { ChatThreadProps } from "./ChatThread";

type PrivateChatProps = Omit<ChatThreadProps, "variant">;

export default function PrivateChat(props: PrivateChatProps) {
  return <ChatThread variant="private" {...props} />;
}
