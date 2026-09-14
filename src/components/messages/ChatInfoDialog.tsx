"use client";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface ChatInfoDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Rendered under the title, e.g. tabs. */
  header?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

/**
 * The panel behind group info and the contact card. Not the Radix dialog:
 * that one blocks pointer events and focus outside itself, which would break
 * the chat kit's Lightbox (portalled to <body>) opened from inside. Escape
 * closes it unless something on top (the Lightbox) already handled the key.
 */
export default function ChatInfoDialog({
  open,
  onClose,
  title,
  header,
  children,
  className = "",
}: ChatInfoDialogProps) {
  const [mounted, setMounted] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const titleId = useId();

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = setTimeout(() => panelRef.current?.focus(), 0);

    // On window, so a Lightbox listening on document sees Escape first.
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !event.defaultPrevented) onCloseRef.current();
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`relative flex max-h-[90vh] w-full flex-col overflow-hidden rounded-lg bg-white font-manrope shadow-lg outline-none ${className}`}
      >
        <div className="border-b border-[#F0F0F0] px-5 pb-3 pt-5">
          <h2 id={titleId} className="pr-8 text-base font-semibold text-[#030E18]">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 rounded-full p-1.5 text-[#434343] hover:bg-gray-100"
            aria-label="Close"
          >
            <X size={18} />
          </button>
          {header}
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
