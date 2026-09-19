import { useId } from "react";
import { Paperclip, Trash, Upload } from "lucide-react";
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
 * The attachment picker and the list of files already attached, with a
 * progress bar while an upload runs.
 *
 * @param props - See {@link AttachmentsCardProps}.
 * @param props.size - Card sizing.
 * @param props.attachments - Hosted URLs attached so far.
 * @param props.uploading - Whether an upload is running.
 * @param props.progress - Overall upload progress, 0-1.
 * @param props.onPick - Called with the files the teacher chose.
 * @param props.onRemove - Called with the URL to detach.
 * @returns The card element.
 */
export function AttachmentsCard({ size, attachments, uploading, progress, onPick, onRemove }: AttachmentsCardProps) {
  const inputId = useId();
  const percent = Math.round(progress * 100);

  return (
    <ConfigCard icon={<Upload className={`${size === "sm" ? "w-4 h-4" : "w-5 h-5"} text-[#003366]`} />} title="Attachments" size={size}>
      <div className="space-y-3">
        <input
          type="file"
          multiple
          id={inputId}
          className="hidden"
          accept="image/*,application/pdf"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            // Let the same file be chosen again after a failure.
            e.target.value = "";
            onPick(files);
          }}
        />
        <label
          htmlFor={inputId}
          className={`flex items-center justify-center gap-2 w-full p-3 border-2 border-dashed border-[#F0F0F0] rounded-lg cursor-pointer hover:border-[#003366] hover:bg-[#003366]/5 transition-all ${
            uploading ? "opacity-50 pointer-events-none" : ""
          }`}
        >
          <Upload className="w-5 h-5 text-[#6F6F6F]" />
          <span className="text-sm text-[#6F6F6F]">{uploading ? `Uploading… ${percent}%` : "Choose Files"}</span>
        </label>

        {uploading && (
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            className="h-1.5 w-full overflow-hidden rounded-full bg-[#F0F0F0]"
          >
            <div className="h-full bg-[#003366] transition-all" style={{ width: `${percent}%` }} />
          </div>
        )}

        {attachments.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-[#030E18]">Uploaded Files ({attachments.length})</p>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {attachments.map((url) => (
                <div key={url} className="flex items-center justify-between p-2 bg-[#F8F8F8] rounded-lg">
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#003366] hover:text-[#002244] text-sm truncate flex-1 mr-2 flex items-center gap-1"
                    title={url}
                  >
                    <Paperclip className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{fileNameOf(url)}</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => onRemove(url)}
                    className="p-1 text-[#878787] hover:text-red-600 hover:bg-red-50 rounded"
                    title="Remove"
                  >
                    <Trash className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </ConfigCard>
  );
}
