import { Check, CheckCheck } from "lucide-react";
import type { ReceiptState } from "@/app/lib/chat/readModel";
import SendStatus from "./SendStatus";

interface MessageReceiptProps {
  state: ReceiptState;
  /** Groups: "Read by N", shown under my latest message only. */
  readByLabel?: string;
  onRetry?: () => void;
  onDelete?: () => void;
}

/** Ticks under my own messages: clock while sending, one tick stored, two ticks read. */
export default function MessageReceipt({ state, readByLabel, onRetry, onDelete }: MessageReceiptProps) {
  if (state === "pending" || state === "failed") {
    return <SendStatus status={state} onRetry={onRetry} onDelete={onDelete} />;
  }
  return (
    <span className="flex items-center gap-1">
      {state === "read" ? (
        <CheckCheck size={14} className="text-blue-500" aria-label="Read" />
      ) : (
        <Check size={14} className="text-gray-400" aria-label="Sent" />
      )}
      {readByLabel && <span className="text-gray-400">{readByLabel}</span>}
    </span>
  );
}
