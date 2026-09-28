"use client";

import React, { type ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { eyebrow, focusRing } from "./styles";

/** Props for {@link Sheet}. */
export interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Small uppercase line above the title. */
  eyebrowText?: ReactNode;
  title: ReactNode;
  /** One or two lines under the title; also the dialog's accessible description. */
  subtitle?: ReactNode;
  children?: ReactNode;
  /** Buttons along the bottom. */
  footer?: ReactNode;
}

/**
 * The redesign's sheet: a centred dialog (max 560px) on wider screens and a
 * bottom sheet on phones. Radix supplies the focus trap, Escape to close,
 * focus return and `aria-modal`.
 *
 * @param props - See {@link SheetProps}.
 * @returns The dialog.
 */
export function Sheet({ open, onOpenChange, eyebrowText, title, subtitle, children, footer }: SheetProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[80] bg-[rgba(15,27,46,0.45)] print:hidden" />
        <Dialog.Content
          {...(subtitle ? {} : { "aria-describedby": undefined })}
          className="fixed inset-x-0 bottom-0 z-[81] max-h-[88vh] overflow-y-auto rounded-t-[24px] bg-tl-surface p-[clamp(22px,3vw,30px)] pb-[max(22px,env(safe-area-inset-bottom))] text-tl-ink shadow-[0_30px_70px_-30px_rgba(15,27,46,0.45)] focus:outline-none sm:bottom-auto sm:left-1/2 sm:right-auto sm:top-1/2 sm:w-[calc(100%-40px)] sm:max-w-[560px] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[24px] dark:border dark:border-tl-line print:hidden"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              {eyebrowText ? <div className={eyebrow}>{eyebrowText}</div> : null}
              <Dialog.Title className="mt-1.5 text-[21px] font-extrabold leading-tight tracking-[-0.4px] text-tl-ink">{title}</Dialog.Title>
              {subtitle ? (
                <Dialog.Description className="mt-1 text-[13px] leading-[1.55] text-tl-muted">{subtitle}</Dialog.Description>
              ) : null}
            </div>
            <Dialog.Close
              aria-label="Close"
              className={`-mr-2 -mt-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-tl-faint hover:bg-tl-bg hover:text-tl-ink ${focusRing}`}
            >
              <X className="h-5 w-5" aria-hidden />
            </Dialog.Close>
          </div>
          {children ? <div className="mt-[18px] flex flex-col gap-[18px]">{children}</div> : null}
          {footer ? <div className="mt-[22px] flex gap-2.5">{footer}</div> : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** Props for {@link SheetRow}. */
export interface SheetRowProps {
  label: ReactNode;
  description?: ReactNode;
  /** The action control (a button or link styled with `rowButton`). */
  action: ReactNode;
}

/**
 * A bordered row with a label, a description and one action (the design's
 * `sheet.rows`).
 *
 * @param props - See {@link SheetRowProps}.
 * @returns The row.
 */
export function SheetRow({ label, description, action }: SheetRowProps) {
  return (
    <div className="flex items-center gap-3.5 rounded-2xl border border-tl-line-soft px-4 py-3.5">
      <div className="min-w-0 flex-1">
        <div className="text-[15px] font-bold text-tl-ink">{label}</div>
        {description ? <div className="mt-[3px] break-words text-[13px] text-tl-muted">{description}</div> : null}
      </div>
      {action}
    </div>
  );
}
