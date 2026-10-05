/**
 * Which Talim portal this is, as the API needs to know it.
 *
 * Every portal talks to the same API. Without this header the API kept ONE
 * shared `refreshToken` cookie, so signing in to a second portal in the same
 * browser signed the first one out. With `X-Talim-App: teachers` the API keeps
 * this portal's session in its own httpOnly cookie, `refreshToken_teachers`,
 * and refuses (403 `FORBIDDEN`) a sign-in by a role the portal does not admit.
 *
 * The client in `./apiClient.ts` sends the header on every request; nothing
 * else should need these constants (the e2e suite reuses them for its raw
 * `fetch` probes).
 */
import type { operations } from "@/types/api";

/** The values the API accepts in `X-Talim-App`, from the generated contract. */
export type TalimApp = NonNullable<
  NonNullable<operations["AuthenticationController_refreshToken"]["parameters"]["header"]>["X-Talim-App"]
>;

/** The request header that names the calling portal. */
export const TALIM_APP_HEADER = "X-Talim-App";

/** This portal's value of {@link TALIM_APP_HEADER}. */
export const TALIM_APP: TalimApp = "teachers";
