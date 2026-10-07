"use client";

import React, { useId, useRef } from "react";
import { Paperclip, X } from "lucide-react";
import { ATTACHMENT_ACCEPT, formatBytes } from "@/components/chat-kit/mediaTypes";
import { focusRing, ghostButton } from "@/components/tl/styles";
import { MAX_TICKET_ATTACHMENTS, addTicketFiles } from "@/hooks/support/tickets.logic";

/** Props for {@link TicketFilePicker}. */
export interface TicketFilePickerProps {
  /** The files picked so far (uploaded when the ticket or reply is sent). */
  files: File[];
  /** The new list after a pick or a removal. */
  onChange: (files: File[]) => void;
  /** Problems with the last pick (type, size, too many), or a validation message. */
  errors: string[];
  /** Replaces the problems shown. */
  onErrors: (errors: string[]) => void;
  disabled?: boolean;
}

/**
 * The attach button and the picked files of a ticket or a reply: up to
 * {@link MAX_TICKET_ATTACHMENTS} files, checked with the chat kit's type and
 * size rules, each removable with a 44px button. The files are uploaded
 * (`POST /upload/chat-attachment`) only when the message is sent.
 *
 * @param props - See {@link TicketFilePickerProps}.
 * @param props.files - The files picked.
 * @param props.onChange - Receives the new list.
 * @param props.errors - The problems to show.
 * @param props.onErrors - Replaces the problems.
 * @param props.disabled - Locks the picker while sending.
 * @returns The picker.
 */
export function TicketFilePicker({ files, onChange, errors, onErrors, disabled = false }: TicketFilePickerProps) {
  const input = useRef<HTMLInputElement>(null);
  const hintId = useId();
  const full = files.length >= MAX_TICKET_ATTACHMENTS;

  /**
   * Adds the chosen files, keeping the problems to show.
   *
   * @param list - What the file dialog returned.
   */
  const pick = (list: FileList | null) => {
    const result = addTicketFiles(files, Array.from(list ?? []));
    onChange(result.files);
    onErrors(result.errors);
    if (input.current) input.current.value = "";
  };

  /**
   * Removes one picked file.
   *
   * @param index - Its position.
   */
  const remove = (index: number) => {
    onChange(files.filter((_, at) => at !== index));
    onErrors([]);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className={ghostButton}
          onClick={() => input.current?.click()}
          disabled={disabled || full}
          aria-describedby={hintId}
        >
          <Paperclip aria-hidden className="h-4 w-4" />
          Attach files
        </button>
        <span id={hintId} className="text-xs text-tl-muted">
          Up to {MAX_TICKET_ATTACHMENTS} files: images, PDF, Office documents, audio or video.
        </span>
        <input
          ref={input}
          type="file"
          multiple
          hidden
          accept={ATTACHMENT_ACCEPT}
          data-testid="ticket-file-input"
          onChange={(event) => pick(event.target.files)}
        />
      </div>
      {files.length > 0 ? (
        <ul aria-label="Files to send" className="flex flex-wrap gap-2">
          {files.map((file, index) => (
            <li key={`${file.name}-${file.size}-${index}`} className="flex min-h-[44px] max-w-full items-center gap-2 rounded-xl border border-tl-line bg-tl-subtle pl-3 text-sm">
              <span className="min-w-0 truncate font-semibold text-tl-ink">{file.name}</span>
              <span className="shrink-0 text-xs text-tl-muted">{formatBytes(file.size)}</span>
              <button
                type="button"
                onClick={() => remove(index)}
                disabled={disabled}
                aria-label={`Remove ${file.name}`}
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-tl-muted hover:bg-tl-bg hover:text-tl-ink disabled:opacity-50 ${focusRing}`}
              >
                <X aria-hidden className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {errors.length > 0 ? (
        <ul role="alert" className="flex flex-col gap-0.5 text-[13px] font-semibold text-tl-danger">
          {errors.map((message, index) => (
            <li key={`${message}-${index}`}>{message}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
