"use client";
import { useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Mic, Paperclip, SendHorizontal, X } from "lucide-react";
import {
  ATTACHMENT_ACCEPT,
  ComposerAttachments,
  addToSelection,
  formatDuration,
  useVoiceRecorder,
  type VoiceRecording,
} from "@/components/chat-kit";

interface MessageInputProps {
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSend?: () => void;
  /** Sends the picked files with whatever was typed as their caption. */
  onSendFiles?: (files: File[], caption: string) => void;
  onSendVoice?: (file: File, durationSeconds: number) => void;
  disabled?: boolean;
  placeholder?: string;
}

/**
 * The composer: text, files (paperclip, up to 10, checked against the upload
 * allowlist) and voice notes. The chat remounts it per room, so switching
 * rooms throws away a recording in progress and releases the microphone.
 */
export default function MessageInput({
  value,
  onChange,
  onSend,
  onSendFiles,
  onSendVoice,
  disabled = false,
  placeholder = "Type something here...",
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onChange) onChange(e);
    else setMessage(e.target.value);
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
    <div className="bg-white border-t border-gray-200 p-3 sm:p-4">
      <ComposerAttachments
        files={files}
        onRemove={(index) => setFiles((prev) => prev.filter((_, i) => i !== index))}
        errors={fileErrors}
        onDismissErrors={() => setFileErrors([])}
        disabled={disabled}
        className="mb-2"
      />

      {recorder.error && !recorder.isRecording && (
        <div
          role="alert"
          className="mb-2 flex items-center gap-2 rounded-md bg-red-50 px-2.5 py-1.5 text-xs text-red-700"
        >
          <span className="flex-1">{recorder.error}</span>
          <button
            type="button"
            onClick={recorder.clearError}
            className="rounded p-0.5 hover:bg-red-100"
            aria-label="Dismiss"
          >
            <X size={12} />
          </button>
        </div>
      )}

      <div className="flex items-end gap-2 sm:gap-3">
        {recorder.isRecording ? (
          <div className="flex-1 flex items-center gap-3 px-4 py-2 bg-red-50 border border-red-200 rounded-full">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse flex-shrink-0" aria-hidden />
            <span className="text-sm text-red-600 font-medium">Recording</span>
            <span className="text-sm text-red-500 ml-auto tabular-nums" aria-live="polite">
              {formatDuration(recorder.elapsed)}
            </span>
            <button
              type="button"
              onClick={recorder.cancel}
              className="p-1 rounded-full hover:bg-red-100"
              title="Cancel recording"
              aria-label="Cancel recording"
            >
              <X size={16} className="text-red-500" />
            </button>
          </div>
        ) : (
          <>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              accept={ATTACHMENT_ACCEPT}
              onChange={handleFileChange}
            />
            <Button
              variant="ghost"
              size="sm"
              className="w-8 h-8 p-0 rounded-full hover:bg-gray-100 flex-shrink-0"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || !onSendFiles}
              title="Attach files"
              aria-label="Attach files"
            >
              <Paperclip size={16} className="text-gray-500" />
            </Button>

            <div className="flex-1">
              <Input
                placeholder={hasFiles ? "Add a caption..." : placeholder}
                className="border border-gray-300 rounded-full bg-gray-50 focus:bg-white focus:border-blue-500 transition-colors"
                value={currentMessage}
                onChange={handleChange}
                disabled={disabled}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (canSend) handleSend();
                  }
                }}
              />
            </div>
          </>
        )}

        {recorder.isRecording ? (
          <Button
            className="h-8 sm:h-10 px-3 rounded-full bg-red-500 hover:bg-red-600 text-white flex-shrink-0 gap-1.5"
            onClick={() => void stopAndSend()}
            title="Stop and send"
            aria-label="Stop and send voice note"
          >
            <SendHorizontal size={16} />
            <span className="hidden sm:inline text-sm">Send</span>
          </Button>
        ) : canSend ? (
          <Button
            className="w-8 h-8 sm:w-10 sm:h-10 p-0 rounded-full transition-all flex-shrink-0 bg-blue-500 hover:bg-blue-600 shadow-md"
            onClick={handleSend}
            disabled={disabled}
            aria-label="Send"
          >
            <SendHorizontal size={16} className="text-white" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="w-8 h-8 sm:w-10 sm:h-10 p-0 rounded-full flex-shrink-0 hover:bg-gray-100"
            onClick={() => void startRecording()}
            disabled={disabled || !onSendVoice}
            title="Record voice note"
            aria-label="Record voice note"
          >
            <Mic size={16} className="text-gray-500" />
          </Button>
        )}
      </div>
    </div>
  );
}
