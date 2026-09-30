/**
 * The one sign-in page. Every redirect that sends a teacher to sign in points
 * here; the old signin route only forwards to it, for old links and bookmarks.
 */
export const SIGN_IN_ROUTE = "/";

/**
 * The pages a signed-out visitor uses: sign-in and the forgotten-password
 * flow. A session that cannot be restored there (there is none) leaves the
 * visitor on the page instead of sending them to sign in.
 */
export const SIGNED_OUT_ROUTES: readonly string[] = [SIGN_IN_ROUTE, "/forgot-password"];

/**
 * Whether a path is one of {@link SIGNED_OUT_ROUTES}.
 *
 * @param pathname - The path, without the query.
 * @returns True for sign-in and the forgotten-password page.
 */
export function isSignedOutRoute(pathname: string): boolean {
  const path = pathname.replace(/\/+$/, "") || "/";
  return SIGNED_OUT_ROUTES.includes(path);
}
