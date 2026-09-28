"use client";

import { useEffect } from "react";

/**
 * Whether a click should leave the page: a plain left click on a same-origin
 * link to another path, opened in this tab.
 *
 * @param event - The click.
 * @returns The link's URL when the click navigates away, else null.
 */
export function leavingLink(event: MouseEvent): URL | null {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return null;
  const target = event.target as Element | null;
  const link = target?.closest?.("a[href]") as HTMLAnchorElement | null;
  if (!link || (link.target && link.target !== "_self") || link.hasAttribute("download")) return null;
  const url = new URL(link.href, window.location.href);
  if (url.origin !== window.location.origin || url.pathname === window.location.pathname) return null;
  return url;
}

/**
 * Warns before the teacher leaves a page with unsaved work: the browser's
 * own prompt on reload, close or an address typed in, and a confirm on any
 * in-app link to another page (sidebar, top bar, links in the page). A
 * change of query string on the same page is not "leaving". The browser's
 * Back button inside the app is not intercepted (the App Router offers no
 * hook for it).
 *
 * @param active - Whether there is unsaved work.
 * @param message - The confirm's text.
 */
export function useUnsavedChangesGuard(active: boolean, message: string): void {
  useEffect(() => {
    if (!active || typeof window === "undefined") return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // Older browsers need a return value to show the prompt.
      event.returnValue = "";
    };
    // Capture on the document runs before React's handlers on the root, so a
    // cancelled navigation never reaches next/link.
    const onClick = (event: MouseEvent) => {
      if (!leavingLink(event)) return;
      if (!window.confirm(message)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [active, message]);
}
