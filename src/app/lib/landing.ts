/**
 * The "First screen after sign-in" preference (Settings → Teaching
 * preferences, `teaching.landingPage` in `GET /teacher/settings`), made real:
 *
 * - {@link landingRouteFor} maps the stored value to a route.
 * - A per-user copy is cached in `localStorage` whenever the preference is
 *   loaded or saved, so sign-in can still honour it when the settings request
 *   is slow or fails.
 * - {@link resolveSignedInRoute} is what sign-in, `/` and set-password call:
 *   the set-password and onboarding rules of `resolvePostLoginRoute` come
 *   first, and only a teacher who would have gone to the dashboard is sent to
 *   their landing page instead.
 */
import { api } from "@/lib/apiClient";
import { logger } from "@/lib/logger";
import type { TeacherSettings } from "@/hooks/settings/useTeacherSettings";
import { resolvePostLoginRoute, type PostLoginUser } from "./postLoginRoute";

/** The values `teaching.landingPage` takes. */
export type LandingPage = "dashboard" | "timetable" | "attendance" | "messages";

/** Where each landing value opens. */
export const LANDING_ROUTES: Readonly<Record<LandingPage, string>> = {
  dashboard: "/dashboard",
  timetable: "/timetable",
  attendance: "/attendance",
  messages: "/messages",
};

/** Where a teacher lands when there is no (known) preference. */
export const DEFAULT_LANDING_ROUTE = LANDING_ROUTES.dashboard;

/** How long sign-in waits for `GET /teacher/settings` before using the cached value. */
export const LANDING_FETCH_TIMEOUT_MS = 2500;

/**
 * Whether a value is one of the landing pages.
 *
 * @param value - Anything read from the server or storage.
 * @returns True for `dashboard`, `timetable`, `attendance` or `messages`.
 */
export function isLandingPage(value: unknown): value is LandingPage {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(LANDING_ROUTES, value);
}

/**
 * The route for a landing value.
 *
 * @param page - The stored `teaching.landingPage`.
 * @returns Its route; the dashboard for anything unknown.
 */
export function landingRouteFor(page: unknown): string {
  return isLandingPage(page) ? LANDING_ROUTES[page] : DEFAULT_LANDING_ROUTE;
}

/**
 * The storage key of one teacher's cached landing page.
 *
 * @param userId - The teacher.
 * @returns The `localStorage` key.
 */
export function landingCacheKey(userId: string): string {
  return `talim_teacher_landing_${userId}`;
}

/**
 * Remembers a teacher's landing page on this device. Unknown values and a
 * missing user are ignored; storage failures are swallowed (private mode).
 *
 * @param userId - The teacher.
 * @param page - The landing value to remember.
 */
export function cacheLandingPage(userId: string | null | undefined, page: unknown): void {
  if (!userId || !isLandingPage(page) || typeof window === "undefined") return;
  try {
    window.localStorage.setItem(landingCacheKey(userId), page);
  } catch {
    /* storage unavailable: sign-in falls back to the dashboard */
  }
}

/**
 * The landing route remembered on this device.
 *
 * @param userId - The teacher.
 * @returns The route, or null when nothing (valid) is cached.
 */
export function readCachedLandingRoute(userId: string | null | undefined): string | null {
  if (!userId || typeof window === "undefined") return null;
  try {
    const page = window.localStorage.getItem(landingCacheKey(userId));
    return isLandingPage(page) ? LANDING_ROUTES[page] : null;
  } catch {
    return null;
  }
}

/**
 * The id a post-login user is known by.
 *
 * @param user - The introspected user.
 * @returns `userId`, `_id` or `id`, whichever is set.
 */
function userIdOf(user: PostLoginUser): string | undefined {
  return user.userId || user._id || user.id;
}

/**
 * Reads the landing preference from `GET /teacher/settings` (with a short
 * timeout), caching what it finds. When the request fails or is slow, the
 * value cached on this device is used, then the dashboard.
 *
 * @param userId - The teacher, for the cache.
 * @param timeoutMs - How long to wait for the server.
 * @returns The route to open.
 */
export async function fetchLandingRoute(userId?: string | null, timeoutMs: number = LANDING_FETCH_TIMEOUT_MS): Promise<string> {
  try {
    const settings = await api.get<TeacherSettings>("/teacher/settings", { timeoutMs });
    const page = settings?.preferences?.teaching?.landingPage;
    cacheLandingPage(userId, page ?? "dashboard");
    return landingRouteFor(page);
  } catch (error) {
    logger.debug("landing", "could not read the landing preference; using the cached one", error);
    return readCachedLandingRoute(userId) ?? DEFAULT_LANDING_ROUTE;
  }
}

/**
 * Where a signed-in teacher goes: set-password and onboarding first (see
 * `resolvePostLoginRoute`), otherwise their landing page. The settings are
 * only fetched when the landing page matters.
 *
 * @param user - The introspected user.
 * @param timeoutMs - How long to wait for the settings.
 * @returns The route to open. Never rejects.
 */
export async function resolveSignedInRoute(user: PostLoginUser, timeoutMs: number = LANDING_FETCH_TIMEOUT_MS): Promise<string> {
  const base = resolvePostLoginRoute(user);
  if (base !== DEFAULT_LANDING_ROUTE) return base;
  const landing = await fetchLandingRoute(userIdOf(user), timeoutMs);
  return resolvePostLoginRoute(user, landing);
}
