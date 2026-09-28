/**
 * Whether the redesign's services answer from local fixtures instead of the
 * API. Only when `NEXT_PUBLIC_USE_FIXTURES=true` AND this is not a production
 * build: Next inlines both values at build time, so in production the fixture
 * branch is dead code and the fixture module (loaded with a dynamic import) is
 * never fetched.
 *
 * @returns True in a dev build with the flag set.
 */
export function fixturesEnabled(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_USE_FIXTURES === "true";
}
