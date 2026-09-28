/**
 * Shared class strings for the redesign (the design's PB/GB buttons, cards,
 * pills). Kept under src/components so Tailwind's content scan sees them.
 * Colours come from the `tl-*` tokens, which switch with the dark theme.
 */

/** Keyboard focus ring for every interactive element. */
export const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tl-link focus-visible:ring-offset-2 focus-visible:ring-offset-tl-surface";

/** The navy primary button (design `PB`). */
export const primaryButton = `inline-flex min-h-[44px] items-center justify-center gap-2 whitespace-nowrap rounded-[14px] bg-tl-brand-fill px-[18px] py-3 text-sm font-bold text-tl-on-brand transition-colors hover:bg-tl-brand-fill-hover disabled:cursor-not-allowed disabled:opacity-40 ${focusRing}`;

/** The outlined secondary button (design `GB`). */
export const ghostButton = `inline-flex min-h-[44px] items-center justify-center gap-2 whitespace-nowrap rounded-[14px] border border-tl-control bg-tl-surface px-[18px] py-3 text-sm font-bold text-tl-brand transition-colors hover:bg-tl-bg disabled:cursor-not-allowed disabled:opacity-40 ${focusRing}`;

/** The small outlined action on list rows (attention "Take register"). */
export const rowButton = `inline-flex min-h-[44px] items-center whitespace-nowrap rounded-[11px] border border-tl-control px-[13px] py-2 text-[13px] font-bold text-tl-brand transition-colors hover:bg-tl-bg ${focusRing}`;

/** A text link with an arrow ("Full timetable →"). */
export const textLink = `inline-flex min-h-[44px] items-center whitespace-nowrap rounded-md text-sm font-bold text-tl-link hover:underline ${focusRing}`;

/** The white card (radius 22, soft shadow). */
export const card =
  "rounded-[22px] border border-tl-line bg-tl-surface p-[clamp(18px,2.4vw,24px)] shadow-[0_1px_2px_rgba(15,27,46,0.04),0_14px_30px_-22px_rgba(15,27,46,0.18)] dark:shadow-none";

/** Page heading (clamp 24-32px, 800). */
export const pageTitle = "m-0 text-[clamp(24px,3.4vw,32px)] font-extrabold tracking-[-0.6px] text-tl-ink";

/** Card heading (19px, 800). */
export const cardTitle = "text-[19px] font-extrabold tracking-[-0.3px] text-tl-ink";

/** Small uppercase label. */
export const eyebrow = "text-xs font-extrabold uppercase tracking-[0.07em] text-tl-faint";

/** A rounded pill (design `pill()`); add colour classes. */
export const pill = "inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-[5px] text-xs font-extrabold";

/** Page padding and width inside the shell. */
export const pagePad = "w-full max-w-[1460px] px-[clamp(14px,3vw,26px)] pb-16 pt-[clamp(18px,3vw,28px)]";
