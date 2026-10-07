"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import { Paperclip } from "lucide-react";
import { formatBytes } from "@/components/chat-kit/mediaTypes";
import { Sheet } from "@/components/tl/Sheet";
import { dangerButton, dangerGhostButton, fieldControl, fieldLabel, focusRing, ghostButton, pill, pillTone, primaryButton } from "@/components/tl/styles";
import { PanelError, PanelSkeleton } from "@/components/settings/SettingsRows";
import { getErrorMessage } from "@/lib/apiError";
import { useCloseTicket, useReopenTicket, useReplyToTicket, useTicket, useTicketUploads } from "@/hooks/support/useTickets";
import {
  TICKET_CLOSED_MESSAGE,
  areaLabel,
  authorLabel,
  canReopen,
  countLabel,
  deskLabel,
  hasErrors,
  isPastReopenWindow,
  reopenHint,
  reopenWindowMessage,
  statusChip,
  threadMessages,
  ticketConflictMessage,
  ticketTime,
  validateReply,
  type TicketConflictAction,
} from "@/hooks/support/tickets.logic";
import { TICKET_BODY_MAX, type Ticket } from "@/types/v15";
import { TicketFilePicker } from "./TicketFilePicker";

/** Props for {@link TicketThreadSheet}. */
export interface TicketThreadSheetProps {
  /** The ticket to show; the sheet is open while one is set. */
  ticketId: string | null;
  /** Closes the sheet (called with `false`). */
  onOpenChange: (open: boolean) => void;
  /** Opens the new-ticket sheet (from a closed or expired ticket). */
  onNewTicket: () => void;
  /** The user's school, for the "My school" desk label. */
  schoolName?: string | null;
}

/**
 * One ticket's thread (v1.5 §1 `GET /tickets/:id`): the status, every
 * message oldest first with its files, and what the requester can do next.
 *
 * - Reply with up to five files (`POST /tickets/:id/messages`); a closed
 *   ticket shows why instead of the reply box.
 * - Reopen a resolved ticket within 7 days (`POST /tickets/:id/reopen`),
 *   with the deadline; past it, the reason and a "New ticket" button.
 * - Close the ticket after a confirm step (`POST /tickets/:id/close`).
 *
 * A 409 from the API (closed meanwhile, past the window, 500 messages) is
 * explained in an alert, the draft is kept, and the ticket is refetched.
 *
 * @param props - See {@link TicketThreadSheetProps}.
 * @param props.ticketId - The ticket, or null when closed.
 * @param props.onOpenChange - Closes the sheet.
 * @param props.onNewTicket - Opens the new-ticket sheet.
 * @param props.schoolName - The user's school.
 * @returns The sheet.
 */
export function TicketThreadSheet({ ticketId, onOpenChange, onNewTicket, schoolName }: TicketThreadSheetProps) {
  const query = useTicket(ticketId);
  const ticket = query.data;
  return (
    <Sheet
      open={Boolean(ticketId)}
      onOpenChange={onOpenChange}
      eyebrowText={ticket?.reference ?? "Support ticket"}
      title={ticket?.subject ?? "Support ticket"}
      subtitle={ticket ? `${deskLabel(ticket.desk, schoolName)} · ${areaLabel(ticket.area)}` : undefined}
    >
      {query.isPending ? (
        <PanelSkeleton label="Loading the ticket" rows={3} />
      ) : query.isError || !ticket ? (
        <PanelError error={query.error} fallback="We couldn't load this ticket." onRetry={() => void query.refetch()} />
      ) : (
        <ThreadBody key={ticket.id} ticket={ticket} onNewTicket={onNewTicket} />
      )}
    </Sheet>
  );
}

/** Props for {@link ThreadBody}. */
interface ThreadBodyProps {
  ticket: Ticket;
  onNewTicket: () => void;
}

/**
 * The loaded thread: status line, messages, next steps and the reply box.
 *
 * @param props - See {@link ThreadBodyProps}.
 * @param props.ticket - The ticket.
 * @param props.onNewTicket - Opens the new-ticket sheet.
 * @returns The content.
 */
function ThreadBody({ ticket, onNewTicket }: ThreadBodyProps) {
  const replyId = useId();
  const countId = useId();
  const errorId = useId();
  const reply = useReplyToTicket(ticket.id);
  const reopen = useReopenTicket(ticket.id);
  const close = useCloseTicket(ticket.id);
  const uploads = useTicketUploads();
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [fileErrors, setFileErrors] = useState<string[]>([]);
  const [bodyError, setBodyError] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [confirmingClose, setConfirmingClose] = useState(false);
  const confirmButton = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const wasConfirming = useRef(false);

  useEffect(() => {
    if (confirmingClose) confirmButton.current?.focus();
    else if (wasConfirming.current) closeButton.current?.focus();
    wasConfirming.current = confirmingClose;
  }, [confirmingClose]);

  const now = new Date();
  const chip = statusChip(ticket.status);
  const closed = ticket.status === "closed";
  const busy = reply.isPending || uploads.isUploading || reopen.isPending || close.isPending;
  const messages = threadMessages(ticket);

  /**
   * The words for a failed request: the 409 explanation, or the error's own.
   *
   * @param error - What the request threw.
   * @param action - What was being done.
   * @param fallback - Words when the error carries none.
   * @returns The message.
   */
  const explain = (error: unknown, action: TicketConflictAction, fallback: string) => ticketConflictMessage(error, action, ticket, new Date()) ?? getErrorMessage(error, fallback);

  /** Checks and sends the reply; the draft stays if it fails. */
  const send = async () => {
    if (busy) return;
    const found = validateReply(text, files);
    setBodyError(found.body ?? null);
    setProblem(null);
    if (hasErrors(found)) return;
    try {
      const attachments = await uploads.upload(files);
      await reply.mutateAsync(attachments.length > 0 ? { body: text.trim(), attachments } : { body: text.trim() });
      setText("");
      setFiles([]);
      setFileErrors([]);
    } catch (error) {
      setProblem(explain(error, "reply", "We couldn't send your reply. Please try again."));
    }
  };

  /** Reopens the resolved ticket. */
  const doReopen = async () => {
    setProblem(null);
    try {
      await reopen.mutateAsync();
    } catch (error) {
      setProblem(explain(error, "reopen", "We couldn't reopen this ticket. Please try again."));
    }
  };

  /** Closes the ticket after the confirm step. */
  const doClose = async () => {
    setProblem(null);
    try {
      await close.mutateAsync();
      setConfirmingClose(false);
    } catch (error) {
      setConfirmingClose(false);
      setProblem(explain(error, "close", "We couldn't close this ticket. Please try again."));
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2.5">
        <span className={`${pill} ${pillTone[chip.tone]}`}>{chip.label}</span>
        {ticket.createdAt ? <span className="text-[13px] text-tl-muted">Raised {ticketTime(ticket.createdAt, now)}</span> : null}
      </div>

      <ol aria-label="Messages" className="flex flex-col gap-3">
        {messages.map((message) => {
          const author = authorLabel(message, ticket);
          const mine = author.role === null;
          return (
            <li key={message.id} className={`rounded-2xl border p-3.5 ${mine ? "border-tl-line-soft bg-tl-subtle" : "border-tl-line bg-tl-surface"}`}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                <p className="text-sm font-extrabold text-tl-ink">
                  {author.name}
                  {author.role ? <span className="ml-1.5 text-xs font-bold text-tl-muted">{author.role}</span> : null}
                </p>
                <time dateTime={message.createdAt} className="text-xs text-tl-muted">
                  {ticketTime(message.createdAt, now)}
                </time>
              </div>
              <p className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-[1.6] text-tl-ink">{message.body}</p>
              {message.attachments.length > 0 ? (
                <ul aria-label="Attachments" className="mt-2.5 flex flex-wrap gap-2">
                  {message.attachments.map((file) => (
                    <li key={file.url}>
                      <a
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex min-h-[44px] max-w-full items-center gap-2 rounded-xl border border-tl-line px-3 text-[13px] font-bold text-tl-link hover:bg-tl-bg ${focusRing}`}
                      >
                        <Paperclip aria-hidden className="h-4 w-4 shrink-0" />
                        <span className="truncate">{file.name}</span>
                        {file.size ? <span className="shrink-0 font-semibold text-tl-muted">{formatBytes(file.size)}</span> : null}
                        <span className="sr-only">(opens in a new tab)</span>
                      </a>
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          );
        })}
      </ol>

      {ticket.status === "resolved" && canReopen(ticket, now) ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-tl-line-soft bg-tl-subtle p-3.5">
          <p className="text-[13px] text-tl-muted">{reopenHint(ticket, now)}</p>
          <button type="button" className={ghostButton} onClick={doReopen} disabled={busy}>
            {reopen.isPending ? "Reopening…" : "Reopen"}
          </button>
        </div>
      ) : null}

      {isPastReopenWindow(ticket, now) || closed ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-tl-line-soft bg-tl-subtle p-3.5">
          <p className="text-[13px] text-tl-muted">{closed ? TICKET_CLOSED_MESSAGE : reopenWindowMessage(ticket.reference)}</p>
          <button type="button" className={ghostButton} onClick={onNewTicket}>
            New ticket
          </button>
        </div>
      ) : null}

      {problem ? (
        <p role="alert" className="text-[13px] font-semibold text-tl-danger">
          {problem}
        </p>
      ) : null}

      {closed ? null : (
        <div className="flex flex-col gap-[7px] border-t border-tl-line-soft pt-4">
          <label htmlFor={replyId} className={fieldLabel}>
            Your reply
          </label>
          <textarea
            id={replyId}
            value={text}
            onChange={(event) => setText(event.target.value)}
            maxLength={TICKET_BODY_MAX}
            aria-invalid={Boolean(bodyError)}
            aria-describedby={bodyError ? `${countId} ${errorId}` : countId}
            disabled={busy}
            className={`${fieldControl} min-h-[100px] resize-y py-3 text-sm leading-[1.6]`}
          />
          <p id={countId} className="text-right text-xs font-semibold text-tl-muted">
            {countLabel(text, TICKET_BODY_MAX)}
          </p>
          {bodyError ? (
            <p id={errorId} className="text-[13px] font-semibold text-tl-danger">
              {bodyError}
            </p>
          ) : null}
          <TicketFilePicker files={files} onChange={setFiles} errors={fileErrors} onErrors={setFileErrors} disabled={busy} />
          <div className="mt-1 flex flex-wrap justify-between gap-2.5">
            {confirmingClose ? (
              <div className="flex flex-wrap items-center gap-2.5">
                <p className="w-full text-[13px] text-tl-muted">Close this ticket? You won&apos;t be able to reply to it afterwards.</p>
                <button type="button" className={ghostButton} onClick={() => setConfirmingClose(false)} disabled={close.isPending}>
                  Keep it open
                </button>
                <button ref={confirmButton} type="button" className={dangerButton} onClick={doClose} disabled={close.isPending}>
                  {close.isPending ? "Closing…" : "Yes, close ticket"}
                </button>
              </div>
            ) : (
              <button ref={closeButton} type="button" className={dangerGhostButton} onClick={() => setConfirmingClose(true)} disabled={busy}>
                Close ticket
              </button>
            )}
            {confirmingClose ? null : (
              <button type="button" className={primaryButton} onClick={send} disabled={busy}>
                {reply.isPending || uploads.isUploading ? "Sending…" : "Send reply"}
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
