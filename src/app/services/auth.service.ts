import { api, apiClient } from "@/lib/apiClient";
import { persistAccessToken } from "@/lib/session";
import type {
  ChangePasswordPayload,
  ForgotPasswordPayload,
  IntrospectPayload,
  LoginPayload,
  ResetPasswordPayload,
  VerifyResetCodePayload,
} from "@/types/apiPayloads";
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
    const body: LoginPayload = credentials;
    return api.post<AuthResponse>("/auth/login", body, { skipAuth: true });
  }

  /**
   * Loads the user behind an access token.
   *
   * @param token - The access token to introspect.
   * @returns Whether the token is active and, if so, its user.
   */
  async introspect(token: string): Promise<IntrospectResponse> {
    const body: IntrospectPayload = { token };
    return api.post<IntrospectResponse>("/auth/introspect", body, {
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

  /**
   * Refreshes the session and adopts the new access token everywhere at once
   * (the API client, `sessionStore` and the persisted copy), so the next
   * request and the next socket handshake both use it. Concurrent callers share
   * one request because the refresh runs through the single client.
   *
   * @returns The new access token.
   * @throws ApiError when the refresh cookie is missing or rejected; Error when the server returns no token.
   */
  async refreshSession(): Promise<string> {
    const { access_token } = await this.refresh();
    if (!access_token) throw new Error("No access token returned from refresh");
    apiClient.setAccessToken(access_token);
    persistAccessToken(access_token);
    return access_token;
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
    const body: ForgotPasswordPayload = { email: email.trim() };
    return api.post<{ message: string }>("/auth/forgot-password", body, { skipAuth: true });
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
    const body: VerifyResetCodePayload = { email: email.trim(), token };
    return api.post<{ valid: true }>("/auth/verify-reset-code", body, { skipAuth: true });
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
    const body: ResetPasswordPayload = { email: email.trim(), token, newPassword };
    return api.post<{ message: string }>("/auth/reset-password", body, { skipAuth: true });
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
    const body: ChangePasswordPayload = { currentPassword, newPassword, confirmPassword };
    const result = await api.post<{ access_token: string; message: string }>("/auth/change-password", body);
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
