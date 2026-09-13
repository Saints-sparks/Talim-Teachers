import { Clock } from "lucide-react";

interface SendStatusProps {
  status: "pending" | "failed";
  onRetry?: () => void;
  onDelete?: () => void;
}

/** "Sending..." under a pending bubble, "Not sent · Retry · Delete" under a failed one. */
export default function SendStatus({ status, onRetry, onDelete }: SendStatusProps) {
  if (status === "pending") {
    return (
      <span className="flex items-center gap-1 text-gray-400">
        <Clock size={11} />
        Sending...
      </span>
    );
  }

  return (
    <span className="flex items-center gap-1 text-red-500">
      Not sent
      {onRetry && (
        <>
          <span aria-hidden>·</span>
          <button type="button" onClick={onRetry} className="font-medium underline hover:text-red-700">
            Retry
          </button>
        </>
      )}
      {onDelete && (
        <>
          <span aria-hidden>·</span>
          <button type="button" onClick={onDelete} className="font-medium underline hover:text-red-700">
            Delete
          </button>
        </>
      )}
    </span>
  );
}
