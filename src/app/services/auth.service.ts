import axios from "axios";
import { API_BASE_URL } from "../lib/api/config";
import { apiClient, setAccessTokenCookie } from "../lib/api/apiClient";
import { AuthResponse, LoginCredentials } from "../../types/auth";

/** Unauthenticated client for sign-in and password-reset calls (sends the refresh cookie). */
const publicClient = axios.create({ baseURL: API_BASE_URL, withCredentials: true });

/**
 * Authentication calls for the Teachers portal. Every method throws the
 * underlying AxiosError on failure; callers turn it into a message with
 * `getApiError()`, which also exposes `fieldErrors` for form binding.
 */
class AuthService {
  /**
   * Signs in with an email or staff identifier.
   *
   * @param credentials - Identifier, password and device details.
   * @returns The access token (the refresh token is set as an httpOnly cookie).
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const { data } = await publicClient.post<AuthResponse>("/auth/login", credentials);
    return data;
  }

  /**
   * Emails a 6-digit reset code. Resolves with the same message whether or not
   * the email is registered.
   *
   * @param email - The account's email address.
   */
  async forgotPassword(email: string): Promise<{ message: string }> {
    const { data } = await publicClient.post<{ message: string }>("/auth/forgot-password", { email: email.trim() });
    return data;
  }

  /**
   * Checks a reset code with the server before the user picks a new password.
   * Wrong guesses count towards the code's attempt limit.
   *
   * @param email - The account's email address.
   * @param token - The 6-digit code.
   * @throws AxiosError with `VALIDATION_FAILED` (field `token`) for a wrong or expired code.
   */
  async verifyResetCode(email: string, token: string): Promise<{ valid: true }> {
    const { data } = await publicClient.post<{ valid: true }>("/auth/verify-reset-code", { email: email.trim(), token });
    return data;
  }

  /**
   * Sets a new password with an emailed code. Signs out every session.
   *
   * @param email - The account's email address.
   * @param token - The 6-digit code.
   * @param newPassword - Must satisfy the password policy.
   */
  async resetPassword(email: string, token: string, newPassword: string): Promise<{ message: string }> {
    const { data } = await publicClient.post<{ message: string }>("/auth/reset-password", { email: email.trim(), token, newPassword });
    return data;
  }

  /**
   * Changes the signed-in teacher's password — from settings, or to replace a
   * temporary password on first sign-in. Stores the fresh access token the
   * server returns (other sessions are signed out).
   *
   * @param currentPassword - Current or temporary password.
   * @param newPassword - Must satisfy the password policy.
   * @param confirmPassword - Must equal `newPassword`.
   * @returns The server's confirmation message.
   */
  async changePassword(currentPassword: string, newPassword: string, confirmPassword: string): Promise<{ message: string }> {
    const { data } = await apiClient.post<{ access_token: string; message: string }>("/auth/change-password", {
      currentPassword,
      newPassword,
      confirmPassword,
    });
    if (data.access_token) setAccessTokenCookie(data.access_token);
    return { message: data.message };
  }
}

export const authService = new AuthService();
