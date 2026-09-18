import { api, apiClient } from "@/lib/apiClient";
import { persistAccessToken } from "@/lib/session";
import { AuthResponse, LoginCredentials, User } from "../../types/auth";

/** `POST /auth/introspect` response. */
export interface IntrospectResponse {
  active: boolean;
  user?: User;
}

/** `POST /auth/refresh` response — the refresh token itself stays in an httpOnly cookie. */
export interface RefreshResponse {
  access_token: string;
}

/**
 * Authentication calls for the Teachers portal. Every method throws `ApiError`
 * on failure; callers turn it into a message with `getErrorMessage()` or read
 * `fieldErrors()` for form binding.
 */
class AuthService {
  /**
   * Signs in with an email or staff identifier.
   *
   * @param credentials - Identifier, password and device details.
   * @returns The access token (the refresh token is set as an httpOnly cookie).
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    return api.post<AuthResponse>("/auth/login", credentials, { skipAuth: true });
  }

  /**
   * Loads the user behind an access token.
   *
   * @param token - The access token to introspect.
   * @returns Whether the token is active and, if so, its user.
   */
  async introspect(token: string): Promise<IntrospectResponse> {
    return api.post<IntrospectResponse>("/auth/introspect", { token }, {
      skipAuth: true,
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  /**
   * Exchanges the httpOnly refresh cookie for a new access token.
   *
   * @returns The new access token.
   */
  async refresh(): Promise<RefreshResponse> {
    return api.post<RefreshResponse>("/auth/refresh", undefined, { skipAuth: true });
  }

  /** Revokes the refresh cookie server-side. Failing here only means it expires on its own. */
  async logout(): Promise<void> {
    await apiClient.post("/auth/logout", undefined, { skipAuth: true });
  }

  /**
   * Emails a 6-digit reset code. Resolves with the same message whether or not
   * the email is registered.
   *
   * @param email - The account's email address.
   * @returns The server's confirmation message.
   */
  async forgotPassword(email: string): Promise<{ message: string }> {
    return api.post<{ message: string }>("/auth/forgot-password", { email: email.trim() }, { skipAuth: true });
  }

  /**
   * Checks a reset code with the server before the user picks a new password.
   * Wrong guesses count towards the code's attempt limit.
   *
   * @param email - The account's email address.
   * @param token - The 6-digit code.
   * @returns `{ valid: true }` when the code is usable.
   * @throws ApiError with `VALIDATION_FAILED` (field `token`) for a wrong or expired code.
   */
  async verifyResetCode(email: string, token: string): Promise<{ valid: true }> {
    return api.post<{ valid: true }>("/auth/verify-reset-code", { email: email.trim(), token }, { skipAuth: true });
  }

  /**
   * Sets a new password with an emailed code. Signs out every session.
   *
   * @param email - The account's email address.
   * @param token - The 6-digit code.
   * @param newPassword - Must satisfy the password policy.
   * @returns The server's confirmation message.
   */
  async resetPassword(email: string, token: string, newPassword: string): Promise<{ message: string }> {
    return api.post<{ message: string }>(
      "/auth/reset-password",
      { email: email.trim(), token, newPassword },
      { skipAuth: true },
    );
  }

  /**
   * Changes the signed-in teacher's password — from settings, or to replace a
   * temporary password on first sign-in. The server rotates the session and
   * returns a fresh access token, which the caller must adopt.
   *
   * @param currentPassword - Current or temporary password.
   * @param newPassword - Must satisfy the password policy.
   * @param confirmPassword - Must equal `newPassword`.
   * @returns The new access token and the server's confirmation message.
   */
  async changePassword(
    currentPassword: string,
    newPassword: string,
    confirmPassword: string,
  ): Promise<{ access_token: string; message: string }> {
    const result = await api.post<{ access_token: string; message: string }>("/auth/change-password", {
      currentPassword,
      newPassword,
      confirmPassword,
    });
    // The server rotated the session; adopt the new token immediately so the
    // next request does not 401, whether or not the caller went through
    // `AuthContext.changePassword`.
    if (result.access_token) {
      apiClient.setAccessToken(result.access_token);
      persistAccessToken(result.access_token);
    }
    return result;
  }
}

export const authService = new AuthService();
