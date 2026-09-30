"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/** Props for {@link ChatInfoDialog}. */
interface ChatInfoDialogProps {
  open: boolean;
  onClose: () => void;
  /** Id of the element that names the dialog. */
  labelledBy: string;
  children: ReactNode;
  className?: string;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * The shell of the conversation info modal. Not the Radix dialog: that one
 * blocks pointer events and focus outside itself, which would break the chat
 * kit's Lightbox (portalled to <body>) opened from inside. It still behaves
 * like a modal: focus moves in on open, Tab cycles inside it, focus returns
 * on close, the page behind doesn't scroll, and Escape or the backdrop
 * closes it — unless something on top (the Lightbox) already handled the key
 * or holds the focus.
 *
 * @param props - See {@link ChatInfoDialogProps}.
 * @returns The dialog, portalled to <body>, or nothing while closed.
 */
export default function ChatInfoDialog({ open, onClose, labelledBy, children, className = "" }: ChatInfoDialogProps) {
  const [mounted, setMounted] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = setTimeout(() => {
      const panel = panelRef.current;
      if (!panel || panel.contains(document.activeElement)) return;
      (panel.querySelector<HTMLElement>("[data-autofocus]") ?? panel).focus();
    }, 0);

    // On window, so a Lightbox listening on document sees Escape first.
    const onKey = (event: KeyboardEvent) => {
      const panel = panelRef.current;
      if (!panel) return;
      if (event.key === "Escape" && !event.defaultPrevented) {
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      // Only trap focus that is ours: a Lightbox on top manages its own.
      const active = document.activeElement;
      if (active && active !== document.body && !panel.contains(active)) return;
      const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (focusable.length === 0) {
        event.preventDefault();
        panel.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (active === first || active === panel)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(focusTimer);
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      if (previousFocus && typeof previousFocus.focus === "function") previousFocus.focus();
    };
  }, [open]);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-[rgba(15,27,46,0.42)] sm:items-center sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        className={`relative flex max-h-[88vh] w-full overflow-hidden rounded-t-[22px] bg-tl-surface font-manrope text-tl-ink shadow-[0_30px_60px_-20px_rgba(15,27,46,0.4)] outline-none sm:max-h-[82vh] sm:rounded-[22px] dark:border dark:border-tl-line ${className}`}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
