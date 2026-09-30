"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { AuthCard } from "@/components/auth/AuthCard";
import { logger } from "@/lib/logger";
import { ghostButton, primaryButton } from "./styles";

/**
 * The 404 page in the redesign's card: what happened (with a pointer to
 * Subjects, where the old Resources page went), Go to Today and Open
 * Subjects. The card works whether or not anyone is signed in (a signed-out
 * visitor who follows a link is sent to sign in as usual).
 *
 * @returns The screen.
 */
export function NotFoundScreen() {
  return (
    <AuthCard
      before={<p className="text-xs font-extrabold uppercase tracking-[0.07em] text-tl-faint">Error 404</p>}
      title="We couldn't find that page"
      description="The link may be old or mistyped. Some pages moved when the teacher portal was redesigned: the scheme of work and resources now live in Subjects."
      footnote={
        <p>
          Followed a link from the school? Ask the office to send it again, or email{" "}
          <a href="mailto:support@mytalim.com" className="font-bold text-tl-link underline-offset-2 hover:underline">
            support@mytalim.com
          </a>
          .
        </p>
      }
    >
      <div className="flex flex-wrap gap-2.5">
        <Link href="/dashboard" className={`${primaryButton} flex-1`}>
          Go to Today
        </Link>
        <Link href="/subjects" className={`${ghostButton} flex-1`}>
          Open Subjects
        </Link>
      </div>
    </AuthCard>
  );
}

/** Props for {@link RouteErrorScreen}. */
export interface RouteErrorScreenProps {
  /** What was thrown; `digest` is the server's reference for it. */
  error: Error & { digest?: string };
  /** Renders the page again (Next's `reset`). */
  onRetry: () => void;
}

/**
 * The error boundary's screen in the redesign's card: the page could not be
 * shown, Try again re-renders it, Go to Today leaves. The error is logged and
 * its reference (`digest`) shown so it can be quoted to support; the message
 * itself is not shown, as it is written for developers.
 *
 * @param props - See {@link RouteErrorScreenProps}.
 * @param props.error - What was thrown.
 * @param props.onRetry - Re-renders the page.
 * @returns The screen.
 */
export function RouteErrorScreen({ error, onRetry }: RouteErrorScreenProps) {
  useEffect(() => {
    logger.error("route", "a page failed to render", error);
  }, [error]);

  return (
    <AuthCard
      before={<p className="text-xs font-extrabold uppercase tracking-[0.07em] text-tl-faint">Something went wrong</p>}
      title="This page could not be shown"
      description="Something went wrong while it was loading. Try again, or go back to Today. Nothing you had already saved is lost."
      footnote={
        <p>
          If it keeps happening, email{" "}
          <a href="mailto:support@mytalim.com" className="font-bold text-tl-link underline-offset-2 hover:underline">
            support@mytalim.com
          </a>
          {error.digest ? (
            <>
              {" "}
              and quote reference <code className="rounded bg-tl-track px-1.5 py-0.5 font-mono text-[12px] text-tl-ink">{error.digest}</code>
            </>
          ) : null}
          .
        </p>
      }
    >
      <div className="flex flex-wrap gap-2.5">
        <button type="button" onClick={onRetry} className={`${primaryButton} flex-1`}>
          Try again
        </button>
        <Link href="/dashboard" className={`${ghostButton} flex-1`}>
          Go to Today
        </Link>
      </div>
    </AuthCard>
  );
}
