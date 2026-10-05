// The API origin comes from the environment so each deployment (local, preview,
// production) points at its own backend. Next.js inlines NEXT_PUBLIC_* at build
// time, so a missing value fails the build here rather than at runtime.
const configuredApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
if (!configuredApiBaseUrl) {
  throw new Error(
    "NEXT_PUBLIC_API_BASE_URL is not set. Copy .env.example to .env.local for local development, or set it in the deployment's environment variables."
  );
}

/**
 * The API origin, without a trailing slash (the realtime socket connects to
 * it too). HTTP requests go through the client in `src/lib/apiClient.ts`,
 * which adds the `X-Talim-App` header the auth routes need, so there are
 * deliberately no ready-made endpoint URLs here for a raw `fetch` to use.
 */
export const API_BASE_URL = configuredApiBaseUrl.replace(/\/+$/, "");
