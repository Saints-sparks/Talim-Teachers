"use client";

import "./globals.css";
import { RouteErrorScreen } from "@/components/tl/RouteStates";

/**
 * The last-resort boundary, for an error in the root layout itself (the
 * providers). It replaces the whole document, so it brings its own `html`
 * and `body`, the stylesheet and the theme switch the root layout would
 * have set.
 *
 * @param props - What Next passes an error boundary.
 * @param props.error - What was thrown.
 * @param props.reset - Renders the app again.
 * @returns The document.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>Something went wrong · Talim Teachers</title>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('talim_teacher_theme')||'system';var d=window.matchMedia('(prefers-color-scheme: dark)').matches;if(t==='dark'||(t==='system'&&d)){document.documentElement.classList.add('dark')}}catch(e){}})()`,
          }}
        />
      </head>
      <body>
        <RouteErrorScreen error={error} onRetry={reset} />
      </body>
    </html>
  );
}
