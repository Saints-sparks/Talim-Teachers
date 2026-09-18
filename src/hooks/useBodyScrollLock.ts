"use client";

import { useEffect } from "react";

/**
 * Freezes the page behind an open modal and restores the previous scroll
 * behaviour when it closes — including when the component unmounts while the
 * modal is still open, which is what used to leave the page unscrollable.
 *
 * @param locked - True while the modal is open.
 */
export function useBodyScrollLock(locked: boolean): void {
  useEffect(() => {
    if (!locked || typeof document === "undefined") return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [locked]);
}
