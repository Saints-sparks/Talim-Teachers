"use client";

import { RouteErrorScreen } from "@/components/tl/RouteStates";

/**
 * The error boundary of every page: a page that throws while rendering shows
 * the redesign's "This page could not be shown" card instead of a blank
 * screen, with Try again (Next's `reset`) and Go to Today.
 *
 * @param props - What Next passes an error boundary.
 * @param props.error - What was thrown.
 * @param props.reset - Renders the page again.
 * @returns The error screen.
 */
export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteErrorScreen error={error} onRetry={reset} />;
}
