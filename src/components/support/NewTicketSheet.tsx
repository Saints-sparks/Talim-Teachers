"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import { Sheet } from "@/components/tl/Sheet";
import { chip, fieldControl, fieldLabel, ghostButton, primaryButton } from "@/components/tl/styles";
import { getErrorMessage } from "@/lib/apiError";
import { useCreateTicket, useTicketUploads } from "@/hooks/support/useTickets";
import {
  allowedDesks,
  areaLabel,
  countLabel,
  deskLabel,
  hasErrors,
  ticketAreasFor,
  toCreatePayload,
  validateNewTicket,
  type NewTicketErrors,
  type NewTicketField,
} from "@/hooks/support/tickets.logic";
import { TICKET_BODY_MAX, TICKET_SUBJECT_MAX, type Ticket, type TicketArea, type TicketDesk } from "@/types/v15";
import { TicketFilePicker } from "./TicketFilePicker";

/** Props for {@link NewTicketSheet}. */
export interface NewTicketSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The signed-in user's role: decides the desks and the area chips. */
  role: string | null | undefined;
  /** The user's school, for the "My school" desk. */
  schoolName?: string | null;
  /** Called with the new ticket, to open its thread. */
  onCreated: (ticket: Ticket) => void;
}

/** The fields in the order they are shown, for focusing the first problem. */
const FIELD_ORDER: readonly NewTicketField[] = ["desk", "area", "subject", "body", "attachments"];

/**
 * Settings → Help → New ticket (v1.5 §1 `POST /tickets`): who gets it, what
 * it is about, a subject (3–140 characters), the message (up to 5000) and up
 * to five files. Staff (teachers, sub-admins) send to Talim support only, so
 * the desk is a fixed line; a student or parent would get a choice. The
 * checks run on Send, with the first field that needs attention focused; the
 * draft is kept if sending fails, and the new ticket's thread opens after.
 *
 * @param props - See {@link NewTicketSheetProps}.
 * @param props.open - Whether the sheet is open.
 * @param props.onOpenChange - Opens or closes it.
 * @param props.role - The user's role.
 * @param props.schoolName - The user's school.
 * @param props.onCreated - Receives the new ticket.
 * @returns The sheet.
 */
export function NewTicketSheet({ open, onOpenChange, role, schoolName, onCreated }: NewTicketSheetProps) {
  const ids = { desk: useId(), area: useId(), subject: useId(), body: useId(), subjectCount: useId(), bodyCount: useId(), error: useId() };
  const desks = allowedDesks(role);
  const areas = ticketAreasFor(role);
  const create = useCreateTicket();
  const uploads = useTicketUploads();
  const [desk, setDesk] = useState<TicketDesk | null>(desks.length === 1 ? desks[0] : null);
  const [area, setArea] = useState<TicketArea | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [fileErrors, setFileErrors] = useState<string[]>([]);
  const [errors, setErrors] = useState<NewTicketErrors>({});
  const [sendError, setSendError] = useState<string | null>(null);
  const fieldRefs = useRef<Partial<Record<NewTicketField, HTMLElement | null>>>({});
  const { reset } = create;
  const onlyDesk = desks.length === 1 ? desks[0] : null;

  useEffect(() => {
    if (!open) return;
    setDesk(onlyDesk);
    setArea(null);
    setSubject("");
    setBody("");
    setFiles([]);
    setFileErrors([]);
    setErrors({});
    setSendError(null);
    reset();
  }, [open, onlyDesk, reset]);

  const sending = create.isPending || uploads.isUploading;

  /** Checks the draft, then uploads the files and raises the ticket. */
  const send = async () => {
    if (sending) return;
    const draft = { desk, area, subject, body, attachments: files };
    const found = validateNewTicket(draft, role);
    setErrors(found);
    setSendError(null);
    if (hasErrors(found) || !draft.desk || !draft.area) {
      const first = FIELD_ORDER.find((field) => found[field]);
      if (first) fieldRefs.current[first]?.focus();
      return;
    }
    try {
      const attachments = await uploads.upload(files);
      const ticket = await create.mutateAsync(toCreatePayload({ ...draft, desk: draft.desk, area: draft.area }, attachments));
      onCreated(ticket);
    } catch (error) {
      setSendError(getErrorMessage(error, "We couldn't send your ticket. Please try again."));
    }
  };

  /**
   * The error line under a field, and its id for `aria-describedby`.
   *
   * @param field - The field.
   * @returns The line, or null.
   */
  const errorLine = (field: NewTicketField) =>
    errors[field] ? (
      <p id={`${ids.error}-${field}`} className="text-[13px] font-semibold text-tl-danger">
        {errors[field]}
      </p>
    ) : null;

  /**
   * The ids describing a field: its counter and its error, when shown.
   *
   * @param field - The field.
   * @param extra - Another id (a counter).
   * @returns The space-separated ids, or undefined.
   */
  const describedBy = (field: NewTicketField, extra?: string) =>
    [extra, errors[field] ? `${ids.error}-${field}` : null].filter(Boolean).join(" ") || undefined;

  return (
    <Sheet
      open={open}
      onOpenChange={(value) => !sending && onOpenChange(value)}
      eyebrowText="New ticket"
      title="How can we help?"
      subtitle={onlyDesk === "talim" ? "This goes to the Talim support team, not your school." : "Choose who should get it, then tell us what happened."}
      footer={
        <>
          <button type="button" className={`${ghostButton} min-h-[48px] flex-1`} onClick={() => onOpenChange(false)} disabled={sending}>
            Cancel
          </button>
          <button type="button" className={`${primaryButton} min-h-[48px] flex-1`} onClick={send} disabled={sending}>
            {sending ? "Sending…" : onlyDesk === "talim" ? "Send to Talim support" : "Send ticket"}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-2">
        <div id={ids.desk} className={fieldLabel}>
          Send to
        </div>
        {onlyDesk ? (
          <div aria-labelledby={ids.desk} role="group" className="rounded-2xl border border-tl-line-soft bg-tl-subtle p-3.5">
            <p className="text-sm font-extrabold text-tl-ink">{deskLabel(onlyDesk, schoolName)}</p>
            <p className="mt-0.5 text-[13px] text-tl-muted">
              {onlyDesk === "talim"
                ? "For something your school handles, use Contact the school office instead."
                : "Your school's office will reply here."}
            </p>
          </div>
        ) : (
          <div
            role="radiogroup"
            aria-labelledby={ids.desk}
            aria-describedby={describedBy("desk")}
            className="flex flex-wrap gap-[9px]"
            ref={(node) => {
              fieldRefs.current.desk = node?.querySelector("button") ?? null;
            }}
          >
            {desks.map((option) => (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={desk === option}
                className={chip(desk === option)}
                onClick={() => setDesk(option)}
                disabled={sending}
              >
                {deskLabel(option, schoolName)}
              </button>
            ))}
          </div>
        )}
        {errorLine("desk")}
      </div>

      <div className="flex flex-col gap-2">
        <div id={ids.area} className={fieldLabel}>
          What is it about?
        </div>
        <div
          role="group"
          aria-labelledby={ids.area}
          aria-describedby={describedBy("area")}
          className="flex flex-wrap gap-[9px]"
          ref={(node) => {
            fieldRefs.current.area = node?.querySelector("button") ?? null;
          }}
        >
          {areas.map((option) => (
            <button key={option} type="button" aria-pressed={area === option} className={chip(area === option)} onClick={() => setArea(option)} disabled={sending}>
              {areaLabel(option)}
            </button>
          ))}
        </div>
        {errorLine("area")}
      </div>

      <div className="flex flex-col gap-[7px]">
        <label htmlFor={ids.subject} className={fieldLabel}>
          Subject
        </label>
        <input
          id={ids.subject}
          ref={(node) => {
            fieldRefs.current.subject = node;
          }}
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          maxLength={TICKET_SUBJECT_MAX}
          placeholder="e.g. Students can't see 1st CA for JSS2 B"
          aria-invalid={Boolean(errors.subject)}
          aria-describedby={describedBy("subject", ids.subjectCount)}
          disabled={sending}
          className={fieldControl}
        />
        <p id={ids.subjectCount} className="text-right text-xs font-semibold text-tl-muted">
          {countLabel(subject, TICKET_SUBJECT_MAX)}
        </p>
        {errorLine("subject")}
      </div>

      <div className="flex flex-col gap-[7px]">
        <label htmlFor={ids.body} className={fieldLabel}>
          Message
        </label>
        <textarea
          id={ids.body}
          ref={(node) => {
            fieldRefs.current.body = node;
          }}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          maxLength={TICKET_BODY_MAX}
          placeholder="What happened, where, and what you expected to see."
          aria-invalid={Boolean(errors.body)}
          aria-describedby={describedBy("body", ids.bodyCount)}
          disabled={sending}
          className={`${fieldControl} min-h-[140px] resize-y py-3 text-sm leading-[1.6]`}
        />
        <p id={ids.bodyCount} className="text-right text-xs font-semibold text-tl-muted">
          {countLabel(body, TICKET_BODY_MAX)}
        </p>
        {errorLine("body")}
      </div>

      <TicketFilePicker
        files={files}
        onChange={setFiles}
        errors={errors.attachments ? [errors.attachments, ...fileErrors] : fileErrors}
        onErrors={setFileErrors}
        disabled={sending}
      />

      {sendError ? (
        <p role="alert" className="text-[13px] font-semibold text-tl-danger">
          {sendError}
        </p>
      ) : null}
    </Sheet>
  );
}
