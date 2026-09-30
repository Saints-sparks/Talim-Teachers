import { Clock } from "lucide-react";
import { focusRing } from "@/components/tl/styles";

interface SendStatusProps {
  status: "pending" | "failed";
  onRetry?: () => void;
  onDelete?: () => void;
}

/**
 * A clock under a pending bubble, "Not sent · Retry · Delete" under a failed one.
 *
 * @param props - The send state and the actions for a failed send.
 * @param props.status - Pending or failed.
 * @param props.onRetry - Sends it again.
 * @param props.onDelete - Drops the unsent message.
 * @returns The status line.
 */
export default function SendStatus({ status, onRetry, onDelete }: SendStatusProps) {
  if (status === "pending") {
    return (
      <span className="flex items-center text-tl-faint" role="status" aria-label="Sending" title="Sending">
        <Clock size={12} />
      </span>
    );
  }

  const action = `inline-flex min-h-[44px] items-center rounded px-1 font-bold underline hover:no-underline ${focusRing}`;
  return (
    <span className="flex items-center gap-1 text-tl-danger" role="alert">
      Not sent
      {onRetry && (
        <>
          <span aria-hidden>·</span>
          <button type="button" onClick={onRetry} className={action}>
            Retry
          </button>
        </>
      )}
      {onDelete && (
        <>
          <span aria-hidden>·</span>
          <button type="button" onClick={onDelete} className={action}>
            Delete
          </button>
        </>
      )}
    </span>
  );
}
