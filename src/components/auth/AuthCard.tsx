import React, { type ReactNode } from "react";
import Image from "next/image";

/** Props for {@link AuthCard}. */
export interface AuthCardProps {
  /** The page heading (the one `h1`). */
  title: ReactNode;
  /** One or two lines under the heading. */
  description?: ReactNode;
  /** Shown between the brand and the heading (a Back button, a step counter). */
  before?: ReactNode;
  /** The form or the content of the card. */
  children: ReactNode;
  /** The small print at the bottom of the card. */
  footnote?: ReactNode;
}

/**
 * The redesign's signed-out screen (the design's `signedOut` card): a white
 * card of at most 430px on the grey page, the Talim mark, an 800-weight
 * heading, a muted line under it and a faint footnote. Sign-in, the forgotten
 * password flow and the first-sign-in password change all sit in it. Colours
 * come from the `tl-*` tokens, so it follows the dark theme.
 *
 * @param props - See {@link AuthCardProps}.
 * @param props.title - The page heading.
 * @param props.description - The line under the heading.
 * @param props.before - Content between the brand and the heading.
 * @param props.children - The form.
 * @param props.footnote - The small print.
 * @returns The full-screen card.
 */
export function AuthCard({ title, description, before, children, footnote }: AuthCardProps) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-tl-bg px-4 py-6 font-manrope text-tl-ink sm:p-6">
      <div className="w-full max-w-[430px] rounded-[24px] border border-tl-line bg-tl-surface p-[clamp(24px,4vw,34px)] shadow-[0_30px_70px_-30px_rgba(15,27,46,0.35)] dark:shadow-none">
        <BrandMark />
        {before ? <div className="mt-[18px]">{before}</div> : null}
        <h1 className={`${before ? "mt-2.5" : "mt-[22px]"} text-[22px] font-extrabold leading-tight tracking-[-0.4px] text-tl-ink`}>{title}</h1>
        {description ? <div className="mt-1.5 text-[15px] leading-[1.55] text-tl-muted">{description}</div> : null}
        <div className="mt-[22px]">{children}</div>
        {footnote ? <div className="mt-5 text-[13px] leading-[1.55] text-tl-faint">{footnote}</div> : null}
      </div>
    </main>
  );
}

/**
 * The Talim mark and name with "Teacher portal" under it, as the sidebar
 * shows the school under the name.
 *
 * @returns The brand row.
 */
export function BrandMark() {
  return (
    <div className="flex items-center gap-2.5">
      <Image src="/icons/talim.svg" alt="" width={34} height={34} className="h-[34px] w-[34px] shrink-0 rounded-[11px]" priority />
      <div className="min-w-0">
        <div className="text-xl font-extrabold leading-tight tracking-[-0.2px] text-tl-ink">Talim</div>
        <div className="text-xs font-semibold text-tl-muted">Teacher portal</div>
      </div>
    </div>
  );
}
