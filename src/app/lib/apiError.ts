import axios from "axios";

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

interface ErrorBody {
  message?: string | string[];
  error?: { code?: string; message?: string; details?: Array<{ field?: string; reason: string }> } | string;
}

/**
 * Turns anything thrown by an API call into `ApiErrorInfo`. Understands the
 * backend's error envelope (`error.code`, `error.details`) and the older
 * `{ message }` shape, and distinguishes offline / unreachable failures.
 *
 * @param err - Whatever was thrown (usually an AxiosError).
 * @param fallback - Message used when nothing better is available.
 */
export function getApiError(err: unknown, fallback = "Something went wrong. Please try again."): ApiErrorInfo {
  if (axios.isAxiosError(err)) {
    if (!err.response) {
      const offline = typeof navigator !== "undefined" && navigator.onLine === false;
      return {
        code: offline ? "NETWORK_OFFLINE" : "SERVICE_UNAVAILABLE",
        message: offline ? "You're offline. Check your connection and try again." : "We couldn't reach the server. Please try again in a moment.",
        fieldErrors: {},
        status: 0,
      };
    }
    const body = (err.response.data ?? {}) as ErrorBody;
    const errorObj = typeof body.error === "object" ? body.error : undefined;
    const fieldErrors: Record<string, string> = {};
    for (const detail of errorObj?.details ?? []) {
      if (detail.field && !fieldErrors[detail.field]) fieldErrors[detail.field] = detail.reason;
    }
    const message =
      errorObj?.message ??
      (Array.isArray(body.message) ? body.message[0] : body.message) ??
      fallback;
    return { code: errorObj?.code ?? `HTTP_${err.response.status}`, message, fieldErrors, status: err.response.status };
  }
  if (err instanceof Error && err.message) return { code: "CLIENT_ERROR", message: err.message, fieldErrors: {}, status: 0 };
  return { code: "UNKNOWN", message: fallback, fieldErrors: {}, status: 0 };
}
