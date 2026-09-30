import { useId } from "react";
import { Paperclip, Upload, X } from "lucide-react";
import { focusRing } from "@/components/tl/styles";
import { ConfigCard } from "./ConfigCards";
import { fileNameOf, type CardSize } from "./types";

/** Props for {@link AttachmentsCard}. */
export interface AttachmentsCardProps {
  size: CardSize;
  attachments: string[];
  uploading: boolean;
  /** Overall upload progress, 0-1. */
  progress: number;
  onPick: (files: File[]) => void;
  onRemove: (url: string) => void;
}

/**
 * The attachment picker (images and PDFs) and the files already attached,
 * each with Remove, and a progress bar while an upload runs.
 *
 * @param props - See {@link AttachmentsCardProps}.
 * @param props.size - Card sizing (unused).
 * @param props.attachments - Hosted URLs attached so far.
 * @param props.uploading - Whether an upload is running.
 * @param props.progress - Overall upload progress, 0-1.
 * @param props.onPick - Called with the files the teacher chose.
 * @param props.onRemove - Called with the URL to detach.
 * @returns The panel element.
 */
export function AttachmentsCard({ attachments, uploading, progress, onPick, onRemove }: AttachmentsCardProps) {
  const inputId = useId();
  const percent = Math.round(progress * 100);

  return (
    <ConfigCard title="Attachments">
      <div className="flex flex-col gap-2.5">
        <input
          type="file"
          multiple
          id={inputId}
          className="peer sr-only"
          accept="image/*,application/pdf"
          disabled={uploading}
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            // Let the same file be chosen again after a failure.
            e.target.value = "";
            onPick(files);
          }}
        />
        <label
          htmlFor={inputId}
          className={`flex min-h-[46px] w-full cursor-pointer items-center justify-center gap-2 rounded-[13px] border-2 border-dashed border-tl-control px-3 text-sm font-bold text-tl-brand hover:bg-tl-select peer-focus-visible:ring-2 peer-focus-visible:ring-tl-link peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-tl-surface ${
            uploading ? "pointer-events-none opacity-50" : ""
          }`}
        >
          <Upload className="h-4 w-4" aria-hidden />
          {uploading ? `Uploading… ${percent}%` : "Add images or PDFs"}
        </label>

        {uploading ? (
          <div role="progressbar" aria-label="Upload progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} className="h-1.5 w-full overflow-hidden rounded-full bg-tl-line-soft">
            <div className="h-full bg-tl-brand-fill transition-all" style={{ width: `${percent}%` }} />
          </div>
        ) : null}

        {attachments.length > 0 ? (
          <ul className="flex max-h-44 flex-col gap-1.5 overflow-y-auto" aria-label={`${attachments.length} attached`}>
            {attachments.map((url) => (
              <li key={url} className="flex items-center gap-1 rounded-xl bg-tl-subtle pl-3">
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex min-h-[44px] min-w-0 flex-1 items-center gap-1.5 rounded text-sm font-bold text-tl-link hover:underline ${focusRing}`}
                  title={url}
                >
                  <Paperclip className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  <span className="truncate">{fileNameOf(url)}</span>
                </a>
                <button
                  type="button"
                  onClick={() => onRemove(url)}
                  aria-label={`Remove ${fileNameOf(url)}`}
                  title="Remove"
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-tl-muted hover:bg-tl-danger-bg hover:text-tl-danger ${focusRing}`}
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </ConfigCard>
  );
}
