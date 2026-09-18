import { ApiError } from "@/lib/apiError";

/** Normalised view of any failed API call in the Teachers app. */
export interface ApiErrorInfo {
  /** Stable server code (`VALIDATION_FAILED`, `PASSWORD_CHANGE_REQUIRED`, …) or a client-side one. */
  code: string;
  /** User-safe message. */
  message: string;
  /** `{ field: reason }` for form binding. */
  fieldErrors: Record<string, string>;
  status: number;
}

/**
 * Turns anything thrown by an API call into `ApiErrorInfo`.
 *
 * Kept for call sites written before `ApiError` existed. New code should
 * `catch (err) { if (err instanceof ApiError) … }` and use `getErrorMessage()`
 * from `@/lib/apiError` directly.
 *
 * @param err - Whatever was thrown.
 * @param fallback - Message used when nothing better is available.
 * @returns The normalised error.
 */
export function getApiError(err: unknown, fallback = "Something went wrong. Please try again."): ApiErrorInfo {
  if (err instanceof ApiError) {
    return { code: err.code, message: err.message, fieldErrors: err.fieldErrors(), status: err.status };
  }
  if (err instanceof Error && err.message) {
    return { code: "CLIENT_ERROR", message: err.message, fieldErrors: {}, status: 0 };
  }
  return { code: "UNKNOWN", message: fallback, fieldErrors: {}, status: 0 };
}
