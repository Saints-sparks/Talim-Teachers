"use client";
import { useRef, useState } from "react";
import { Mic, Paperclip, X } from "lucide-react";
import {
  ATTACHMENT_ACCEPT,
  ComposerAttachments,
  ComposerTextarea,
  addToSelection,
  formatDuration,
  useVoiceRecorder,
  type VoiceRecording,
} from "@/components/chat-kit";
import { focusRing } from "@/components/tl/styles";

/** Props for {@link MessageInput}. */
interface MessageInputProps {
  value?: string;
  onValueChange?: (value: string) => void;
  onSend?: () => void;
  /** Sends the picked files with whatever was typed as their caption. */
  onSendFiles?: (files: File[], caption: string) => void;
  onSendVoice?: (file: File, durationSeconds: number) => void;
  disabled?: boolean;
  placeholder?: string;
}

const squareButton = `flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-[13px] border border-tl-control text-tl-muted transition-colors hover:bg-tl-bg disabled:cursor-not-allowed disabled:opacity-40 ${focusRing}`;
const sendButton = `flex min-h-[46px] shrink-0 items-center rounded-[13px] bg-tl-brand-fill px-5 text-sm font-bold text-tl-on-brand transition-colors hover:bg-tl-brand-fill-hover disabled:cursor-not-allowed disabled:opacity-40 ${focusRing}`;

/**
 * The composer (the design's: attach, the message box, Send): text, files
 * (the paperclip, up to 10, checked against the upload allowlist, shown as
 * chips above) and voice notes (the microphone). The chat remounts it per
 * room, so switching rooms throws away a recording in progress and
 * releases the microphone. Enter sends with a mouse; on a touch screen it is
 * a new line and Send sends.
 *
 * @param props - See {@link MessageInputProps}.
 * @returns The composer.
 */
export default function MessageInput({
  value,
  onValueChange,
  onSend,
  onSendFiles,
  onSendVoice,
  disabled = false,
  placeholder = "Write a message",
}: MessageInputProps) {
  const [message, setMessage] = useState(value || "");
  const [files, setFiles] = useState<File[]>([]);
  const [fileErrors, setFileErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sendRecording = (recording: VoiceRecording | null) => {
    if (recording) onSendVoice?.(recording.file, recording.duration);
  };

  // The 5-minute limit sends what was recorded; unmount cancels it.
  const recorder = useVoiceRecorder({ onAutoStop: sendRecording });

  const handleChange = (text: string) => {
    if (onValueChange) onValueChange(text);
    else setMessage(text);
  };

  const currentMessage = value !== undefined ? value : message;
  const hasText = currentMessage.trim().length > 0;
  const hasFiles = files.length > 0;
  const canSend = (hasText || hasFiles) && !recorder.isRecording;

  const handleSend = () => {
    if (disabled) return;
    if (hasFiles && onSendFiles) {
      onSendFiles(files, currentMessage);
      setFiles([]);
      setFileErrors([]);
      return;
    }
    if (!hasText) return;
    if (onSend) onSend();
    else setMessage("");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (picked.length === 0) return;
    const result = addToSelection(files, picked);
    setFiles(result.files);
    setFileErrors(result.errors);
  };

  const startRecording = async () => {
    if (disabled) return;
    recorder.clearError();
    await recorder.start();
  };

  const stopAndSend = async () => {
    sendRecording(await recorder.stop());
  };

  return (
    <div className={`flex flex-col gap-2 p-3.5 ${hasFiles ? "" : "border-t border-tl-line-soft"}`}>
      <ComposerAttachments
        files={files}
        onRemove={(index) => setFiles((prev) => prev.filter((_, i) => i !== index))}
        errors={fileErrors}
        onDismissErrors={() => setFileErrors([])}
        disabled={disabled}
      />

      {recorder.error && !recorder.isRecording ? (
        <div role="alert" className="flex items-center gap-2 rounded-xl bg-tl-danger-bg px-3 py-2 text-xs font-bold text-tl-danger">
          <span className="flex-1">{recorder.error}</span>
          <button type="button" onClick={recorder.clearError} className={`flex h-8 w-8 items-center justify-center rounded-lg ${focusRing}`} aria-label="Dismiss">
            <X size={14} aria-hidden />
          </button>
        </div>
      ) : null}

      <div className="flex items-end gap-2.5">
        {recorder.isRecording ? (
          <div className="flex min-h-[46px] flex-1 items-center gap-3 rounded-[13px] border border-tl-danger/30 bg-tl-danger-bg px-4">
            <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-tl-danger" aria-hidden />
            <span className="text-sm font-bold text-tl-danger">Recording</span>
            <span className="ml-auto text-sm tabular-nums text-tl-danger" aria-live="polite">
              {formatDuration(recorder.elapsed)}
            </span>
            <button
              type="button"
              onClick={recorder.cancel}
              className={`flex h-9 w-9 items-center justify-center rounded-full text-tl-danger hover:bg-tl-surface ${focusRing}`}
              title="Cancel recording"
              aria-label="Cancel recording"
            >
              <X size={16} aria-hidden />
            </button>
          </div>
        ) : (
          <>
            <input ref={fileInputRef} type="file" multiple className="hidden" accept={ATTACHMENT_ACCEPT} onChange={handleFileChange} tabIndex={-1} aria-hidden />
            <button
              type="button"
              className={squareButton}
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || !onSendFiles}
              title="Attach a document, photo or video"
              aria-label="Attach files"
            >
              <Paperclip size={17} aria-hidden />
            </button>

            <div className="min-w-0 flex-1">
              <ComposerTextarea
                aria-label="Message"
                placeholder={hasFiles ? "Add a caption" : placeholder}
                className="block min-h-[46px] w-full resize-none rounded-[13px] border border-tl-control bg-tl-surface px-3.5 py-[11px] text-[15px] font-semibold leading-6 text-tl-ink outline-none placeholder:text-tl-faint focus-visible:ring-2 focus-visible:ring-tl-link disabled:opacity-60"
                value={currentMessage}
                onValueChange={handleChange}
                onSubmit={() => {
                  if (canSend) handleSend();
                }}
                disabled={disabled}
              />
            </div>

            {!canSend && onSendVoice ? (
              <button
                type="button"
                className={squareButton}
                onClick={() => void startRecording()}
                disabled={disabled}
                title="Record a voice note"
                aria-label="Record voice note"
              >
                <Mic size={17} aria-hidden />
              </button>
            ) : null}
          </>
        )}

        {recorder.isRecording ? (
          <button type="button" className={sendButton} onClick={() => void stopAndSend()} title="Stop and send" aria-label="Stop and send voice note">
            Send
          </button>
        ) : (
          <button type="button" className={sendButton} onClick={handleSend} disabled={disabled || !canSend} title="Send (Enter)">
            Send
          </button>
        )}
      </div>
    </div>
  );
}
