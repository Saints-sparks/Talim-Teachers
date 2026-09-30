"use client";

import { Check } from "lucide-react";

/**
 * The confirmation shown once the password is reset, before the teacher is
 * sent to sign in. It is only mounted while visible, so nothing invisible
 * sits over the page.
 *
 * @param props - Component props.
 * @param props.open - Whether the confirmation is showing.
 * @returns The overlay, or `null` when closed.
 */
export function ResetSuccessModal({ open }: { open: boolean }) {
  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="reset-success-title"
      aria-describedby="reset-success-text"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(15,27,46,0.45)] p-4"
    >
      <div className="w-full max-w-[400px] rounded-[24px] border border-tl-line bg-tl-surface p-[clamp(24px,4vw,34px)] text-center shadow-[0_30px_70px_-30px_rgba(15,27,46,0.45)]">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-tl-success-bg text-tl-success">
          <Check className="h-7 w-7" strokeWidth={3} aria-hidden />
        </div>
        <h2 id="reset-success-title" className="mt-4 text-[21px] font-extrabold tracking-[-0.4px] text-tl-ink">
          Password reset
        </h2>
        <p id="reset-success-text" className="mt-1.5 text-[15px] leading-[1.55] text-tl-muted" aria-live="polite">
          Your password has been changed. Taking you to sign in…
        </p>
      </div>
    </div>
  );
}
