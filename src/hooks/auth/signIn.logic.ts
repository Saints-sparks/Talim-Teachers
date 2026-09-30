/**
 * Pure logic of the sign-in form: what must be filled in before the form is
 * sent, and how a refused sign-in is explained. No React.
 */

/** The sign-in form's values. */
export interface SignInValues {
  identifier: string;
  password: string;
  rememberMe: boolean;
}

/** A message per field that is not ready to send. */
export type SignInFieldErrors = Partial<Record<"identifier" | "password", string>>;

/**
 * Why a sign-in was refused, as the form explains it:
 * - `access_denied`: the account is not a teacher's (the portal names the role);
 * - `invalid_credentials`: the email, staff number or password is wrong;
 * - `unknown`: anything else, with the server's message.
 */
export type LoginError =
  | { kind: "access_denied"; message: string }
  | { kind: "invalid_credentials" }
  | { kind: "unknown"; message: string };

/** Shown for a wrong email, staff number or password. */
export const INVALID_CREDENTIALS_TEXT = "Incorrect email, staff number, or password. Please double-check your credentials and try again.";

/**
 * Checks the fields before anything is sent: both are required. The password
 * is not trimmed (spaces can be part of it); the identifier is.
 *
 * @param values - The form's values.
 * @returns A message per empty field; an empty object when the form can be sent.
 */
export function validateSignIn(values: Pick<SignInValues, "identifier" | "password">): SignInFieldErrors {
  const errors: SignInFieldErrors = {};
  if (!values.identifier.trim()) errors.identifier = "Enter your email or staff number.";
  if (!values.password) errors.password = "Enter your password.";
  return errors;
}

/**
 * Sorts a refused sign-in by its message, exactly as the sign-in page always
 * has: the auth context throws "Access denied … registered as …" for another
 * role, and "Incorrect email or password …" for a 401.
 *
 * @param error - What `login` threw.
 * @returns The kind of failure and its message.
 */
export function classifyLoginError(error: unknown): LoginError {
  const message = error instanceof Error ? error.message : "";
  const lower = message.toLowerCase();
  if (lower.includes("access denied") || lower.includes("registered as")) return { kind: "access_denied", message };
  if (lower.includes("incorrect") || lower.includes("invalid") || lower.includes("credentials")) return { kind: "invalid_credentials" };
  return { kind: "unknown", message: message || "An unexpected error occurred. Please try again." };
}
