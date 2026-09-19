import { ApiError, getErrorMessage } from "@/lib/apiError";

/** Which call of the reset flow failed. */
export type ResetStage = "request" | "verify" | "reset";

/** What the reset flow should tell the teacher, and whether the code is now useless. */
export interface ResetFailure {
  /** A user-safe sentence to show in a toast. */
  message: string;
  /** True when the emailed code is spent or wrong and the teacher must enter a new one. */
  restartCode: boolean;
}

const FALLBACKS: Record<ResetStage, string> = {
  request: "Failed to send reset code. Please try again.",
  verify: "That code is invalid or has expired. Request a new one.",
  reset: "Failed to reset password. Please try again.",
};

/**
 * Turns whatever a password-reset call threw into a message keyed on the
 * server's `error.code`, never on message text.
 *
 * - `RATE_LIMITED` (the reset routes have a tight limit) asks the teacher to wait.
 * - `VALIDATION_FAILED` carries the field that was wrong: a bad `token` means
 *   the code is invalid or used up, a bad `newPassword` is a weak password.
 * - Offline, timeout and server errors already read well and pass through.
 *
 * @param err - What the call threw.
 * @param stage - Which call it was.
 * @returns The message to show and whether the teacher has to re-enter the code.
 */
export function describeResetFailure(err: unknown, stage: ResetStage): ResetFailure {
  if (!(err instanceof ApiError)) return { message: getErrorMessage(err, FALLBACKS[stage]), restartCode: false };

  if (err.code === "RATE_LIMITED") {
    return { message: "Too many attempts. Please wait a few minutes and try again.", restartCode: false };
  }

  if (err.code === "VALIDATION_FAILED") {
    const fields = err.fieldErrors();
    if (fields.token) return { message: fields.token, restartCode: stage === "reset" };
    if (stage === "reset" && fields.newPassword) return { message: fields.newPassword, restartCode: false };
    if (stage === "request" && fields.email) return { message: fields.email, restartCode: false };
    if (stage === "verify") return { message: FALLBACKS.verify, restartCode: false };
  }

  return { message: getErrorMessage(err, FALLBACKS[stage]), restartCode: false };
}
