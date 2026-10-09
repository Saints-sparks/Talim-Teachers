"use client";

import React, { type ReactNode } from "react";
import { Sheet } from "./Sheet";
import { dangerButton, ghostButton, primaryButton } from "./styles";

/** Props for {@link ConfirmSheet}. */
export interface ConfirmSheetProps {
  open: boolean;
  /** Closes without confirming (Cancel, Escape, the close button, the overlay). */
  onCancel: () => void;
  onConfirm: () => void;
  eyebrowText?: ReactNode;
  title: ReactNode;
  /** The one paragraph the design shows (its `sec("", …)`). */
  body: ReactNode;
  confirmLabel: string;
  /** Shown on the confirm button while `busy`. */
  busyLabel?: string;
  busy?: boolean;
  /** The red confirm of a destructive action (Remove). */
  danger?: boolean;
  /** Holds the confirm button until the content is complete (a password typed, a box ticked). */
  confirmDisabled?: boolean;
  /** Extra content under the paragraph (an optional reason field). */
  children?: ReactNode;
}

/**
 * A confirmation sheet: one paragraph, Cancel and the action (the design's
 * publish, unlock and remove sheets).
 *
 * @param props - See {@link ConfirmSheetProps}.
 * @returns The sheet.
 */
export function ConfirmSheet({
  open,
  onCancel,
  onConfirm,
  eyebrowText,
  title,
  body,
  confirmLabel,
  busyLabel,
  busy = false,
  danger = false,
  confirmDisabled = false,
  children,
}: ConfirmSheetProps) {
  return (
    <Sheet
      open={open}
      onOpenChange={(next) => !next && !busy && onCancel()}
      eyebrowText={eyebrowText}
      title={title}
      footer={
        <>
          <button type="button" className={`${ghostButton} min-h-[48px] flex-1`} onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button type="button" className={`${danger ? dangerButton : primaryButton} min-h-[48px] flex-1`} onClick={onConfirm} disabled={busy || confirmDisabled}>
            {busy ? (busyLabel ?? confirmLabel) : confirmLabel}
          </button>
        </>
      }
    >
      <p className="text-sm leading-[1.7] text-tl-body">{body}</p>
      {children}
    </Sheet>
  );
}
