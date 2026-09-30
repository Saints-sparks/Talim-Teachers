"use client";

import React, { useEffect, useId, useState } from "react";
import { Sheet } from "@/components/tl/Sheet";
import { chip, fieldControl, ghostButton, primaryButton } from "@/components/tl/styles";
import { getErrorMessage } from "@/lib/apiError";
import { APP_VERSION } from "@/lib/appVersion";
import { useCreateSupportTicket } from "@/hooks/settings/useAccount";
import { SUPPORT_AREAS, isSupportDescriptionValid, supportCountLabel } from "@/hooks/settings/settings.logic";
import { SUPPORT_DESCRIPTION_MAX, type SupportArea } from "@/types/inboxSettings";

/** Props for {@link ReportProblemSheet}. */
export interface ReportProblemSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Where Talim support replies. */
  email?: string;
}

/**
 * The design's `report` sheet: where the problem happened, what went wrong
 * (10–2000 characters), then `POST /support/tickets` with the page, app
 * version and browser, and the reference to quote.
 *
 * @param props - See {@link ReportProblemSheetProps}.
 * @param props.open - Whether the sheet is open.
 * @param props.onOpenChange - Opens or closes it.
 * @param props.email - The teacher's email, where support replies.
 * @returns The sheet.
 */
export function ReportProblemSheet({ open, onOpenChange, email }: ReportProblemSheetProps) {
  const areaLabelId = useId();
  const textId = useId();
  const countId = useId();
  const ticket = useCreateSupportTicket();
  const [area, setArea] = useState<SupportArea>("grading");
  const [text, setText] = useState("");
  const [reference, setReference] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const { reset } = ticket;

  useEffect(() => {
    if (!open) return;
    setArea("grading");
    setText("");
    setReference(null);
    setSendError(null);
    reset();
  }, [open, reset]);

  const valid = isSupportDescriptionValid(text);
  const sending = ticket.isPending;
  const replyTo = email || "your school email";

  /** Sends the report; the text is kept if it fails. */
  const send = () => {
    if (!valid || sending) return;
    setSendError(null);
    ticket.mutate(
      {
        area,
        description: text.trim(),
        context: {
          path: `${window.location.pathname}${window.location.search}`,
          appVersion: APP_VERSION,
          userAgent: window.navigator.userAgent,
        },
      },
      {
        onSuccess: (result) => setReference(result.reference),
        onError: (error) => setSendError(getErrorMessage(error, "We couldn't send your report. Please try again.")),
      },
    );
  };

  /** Closes the sheet. */
  const close = () => onOpenChange(false);
  return (
    <Sheet
      open={open}
      onOpenChange={(value) => !sending && onOpenChange(value)}
      eyebrowText="Report a problem"
      title="Tell Talim what is not working"
      subtitle="This goes to the Talim support team, not your school."
      footer={
        reference ? (
          <button type="button" className={`${primaryButton} min-h-[48px] flex-1`} onClick={close}>
            Done
          </button>
        ) : (
          <>
            <button type="button" className={`${ghostButton} min-h-[48px] flex-1`} onClick={close} disabled={sending}>
              Cancel
            </button>
            <button type="button" className={`${primaryButton} min-h-[48px] flex-1`} onClick={send} disabled={!valid || sending}>
              {sending ? "Sending…" : "Send to Talim support"}
            </button>
          </>
        )
      }
    >
      {reference ? (
        <div>
          <div aria-hidden className="flex h-[54px] w-[54px] items-center justify-center rounded-full bg-tl-success-bg text-[26px] font-extrabold text-tl-success">
            ✓
          </div>
          <p role="status" className="mt-4 text-[19px] font-extrabold tracking-[-0.3px] text-tl-ink">
            Report sent
          </p>
          <p className="mt-1.5 text-sm leading-[1.6] text-tl-muted">Talim support will reply to {replyTo} within one working day.</p>
          <div className="mt-[18px] rounded-2xl border border-tl-line-soft bg-tl-subtle p-4">
            <div className="text-xs font-extrabold uppercase tracking-[0.05em] text-tl-faint">Reference</div>
            <div className="mt-[5px] text-base font-extrabold text-tl-ink">{reference}</div>
          </div>
        </div>
      ) : (
        <>
          <div>
            <div id={areaLabelId} className="mb-2.5 text-[13px] font-extrabold text-tl-muted">
              Where did it happen?
            </div>
            <div role="group" aria-labelledby={areaLabelId} className="flex flex-wrap gap-[9px]">
              {SUPPORT_AREAS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={area === option.id}
                  className={chip(area === option.id)}
                  onClick={() => setArea(option.id)}
                  disabled={sending}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-[7px]">
            <label htmlFor={textId} className="text-xs font-extrabold uppercase tracking-[0.05em] text-tl-faint">
              What went wrong
            </label>
            <textarea
              id={textId}
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="e.g. I published 1st CA for JSS2 B but students say they cannot see it."
              maxLength={SUPPORT_DESCRIPTION_MAX}
              aria-describedby={countId}
              disabled={sending}
              className={`${fieldControl} min-h-[120px] resize-y py-3 text-sm leading-[1.6]`}
            />
            <p id={countId} className="text-right text-xs font-semibold text-tl-muted">
              {supportCountLabel(text)}
            </p>
          </div>
          <p className="text-[13px] leading-[1.6] text-tl-muted">
            We reply to {replyTo}. Student records are not shared with support unless you ask us to look at them.
          </p>
          {sendError ? (
            <p role="alert" className="text-[13px] font-semibold text-tl-danger">
              {sendError}
            </p>
          ) : null}
        </>
      )}
    </Sheet>
  );
}
