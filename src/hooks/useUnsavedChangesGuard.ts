"use client";

import { useEffect, useRef } from "react";

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

/** The page's own history entry, so a cancelled Back can put it back. */
interface PageEntry {
  state: unknown;
  url: string;
}

/**
 * Warns before the teacher leaves a page with unsaved work, and only while
 * there is some (`active`): once the work is saved the listeners are removed
 * and nothing is left behind, not even a history entry.
 *
 * - Reload, close, or an address typed in: the browser's own prompt
 *   (`beforeunload`).
 * - An in-app link to another page (sidebar, top bar, links in the page): a
 *   capture-phase click listener on the document asks first, before
 *   `next/link` sees the click. Modified clicks, `target="_blank"`,
 *   downloads, other origins and links to the same page (a change of query
 *   string) are let through.
 * - The browser's Back (or Forward, or `router.back()`) to another page of
 *   the app: the App Router has no hook for it, so a capture-phase
 *   `popstate` listener on `window` runs before the router's own (capture
 *   listeners at the target fire first) and holds the event back while it
 *   asks. On "leave" the event is re-dispatched for the router to handle; on
 *   "stay" this page's entry is pushed back (the router never left it). No
 *   sentinel entry is pushed while the work is unsaved, so Back behaves
 *   normally once it is saved. Limits: by the time `popstate` fires the
 *   browser has already moved, so "stay" re-pushes the page's entry, which
 *   drops any Forward history (and after a Forward, rather than a Back,
 *   leaves one extra entry); a history move between addresses of this same
 *   page is let through, as the page keeps its work.
 *
 * @param active - Whether there is unsaved work.
 * @param message - The confirm's text.
 */
export function useUnsavedChangesGuard(active: boolean, message: string): void {
  const entryRef = useRef<PageEntry | null>(null);

  // Remember this page's history entry after every render while guarded: the
  // page keeps its address in step with `router.replace`, which re-renders it.
  useEffect(() => {
    if (active && typeof window !== "undefined") entryRef.current = { state: window.history.state, url: window.location.href };
  });

  useEffect(() => {
    if (!active || typeof window === "undefined") return;
    // Set once the teacher has chosen to leave, so the way out is not asked about twice.
    let leaving = false;

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (leaving) return;
      event.preventDefault();
      // Older browsers need a return value to show the prompt.
      event.returnValue = "";
    };

    // Capture on the document runs before React's handlers on the root, so a
    // cancelled navigation never reaches next/link.
    const onClick = (event: MouseEvent) => {
      if (leaving || !leavingLink(event)) return;
      if (window.confirm(message)) {
        leaving = true;
        return;
      }
      event.preventDefault();
      event.stopPropagation();
    };

    const onPopState = (event: PopStateEvent) => {
      if (leaving) return;
      const entry = entryRef.current;
      if (!entry) return;
      if (new URL(entry.url).pathname === window.location.pathname) {
        entryRef.current = { state: event.state, url: window.location.href };
        return;
      }
      // Hold the router back until the teacher answers.
      event.stopImmediatePropagation();
      if (window.confirm(message)) {
        leaving = true;
        window.dispatchEvent(new PopStateEvent("popstate", { state: event.state }));
        return;
      }
      // Stay: the browser has already moved, so put this page's entry back. It
      // carries the router's own state, so the router does not navigate again.
      window.history.pushState(entry.state, "", entry.url);
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPopState, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPopState, true);
    };
  }, [active, message]);
}
