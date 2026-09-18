"use client";

/**
 * Axios-shaped adapter over the single fetch client in `src/lib/apiClient.ts`.
 *
 * The app was written against axios (`const { data } = await apiClient.get(...)`,
 * `err.response?.data?.message`). Rather than rewrite a hundred call sites at
 * once, this module keeps that surface while every request now goes through
 * one client with single-flight token refresh, `skipAuth`, timeouts and typed
 * `ApiError`s. Axios itself is gone.
 *
 * New and migrated code should import `api` from `@/lib/apiClient` instead —
 * it returns the parsed body directly and throws `ApiError`.
 */

import { api, apiClient as client, type RequestConfig } from "@/lib/apiClient";
import { persistAccessToken } from "@/lib/session";

/** The subset of axios request options this app actually uses. */
export interface LegacyRequestConfig extends Omit<RequestConfig, "body"> {
  /** Query string values. */
  params?: Record<string, string | number | boolean | null | undefined>;
  /** Only `"blob"` differs from the default JSON handling. */
  responseType?: "json" | "blob" | "text";
  /** Ignored: the client always sends credentials. */
  withCredentials?: boolean;
}

/** Axios-shaped response. */
export interface LegacyResponse<T = unknown> {
  data: T;
  status: number;
  headers: Headers;
}

/**
 * Stores a rotated access token. Kept for call sites that adopt a token
 * returned by the API (a password change, for instance).
 *
 * @param token - The new access token.
 */
export const setAccessTokenCookie = (token: string): void => {
  client.setAccessToken(token);
  persistAccessToken(token);
};

/**
 * Exchanges the httpOnly refresh cookie for a new access token. Concurrent
 * callers (the API client and the realtime socket) share one request, because
 * the refresh runs through the single client.
 *
 * @returns The new access token.
 */
export const refreshAccessToken = async (): Promise<string> => {
  const { access_token } = await api.post<{ access_token: string }>("/auth/refresh", undefined, { skipAuth: true });
  if (!access_token) throw new Error("No access token returned from refresh");
  setAccessTokenCookie(access_token);
  return access_token;
};

/**
 * Performs one request and shapes the result like an axios response.
 *
 * @param method - HTTP method.
 * @param url - Path or absolute URL.
 * @param data - Request body, for body-carrying methods.
 * @param config - Axios-shaped options.
 * @returns The parsed body plus status and headers.
 */
async function send<T>(
  method: string,
  url: string,
  data: unknown,
  config: LegacyRequestConfig = {},
): Promise<LegacyResponse<T>> {
  const { responseType, withCredentials: _withCredentials, ...rest } = config;
  const requestConfig: RequestConfig =
    data === undefined && method === "GET"
      ? { ...rest, method }
      : client.bodyConfig(method, data, rest as RequestConfig);

  if (responseType === "blob") {
    const response = await client.request(url, requestConfig);
    if (!response.ok) {
      const { ApiError } = await import("@/lib/apiError");
      throw ApiError.fromResponse(response, null);
    }
    return { data: (await response.blob()) as unknown as T, status: response.status, headers: response.headers };
  }

  const body = await client.json<T>(url, requestConfig);
  return { data: body, status: 200, headers: new Headers() };
}

/**
 * The app-wide client, in the axios shape the existing services use.
 * Prefer `api` from `@/lib/apiClient` in new code.
 *
 * The `T = any` defaults mirror axios's own: the call sites still to be
 * migrated do not pass a type argument, and `unknown` would break every one
 * of them at once. Each becomes a real type as its page is migrated to `api`.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
export const apiClient = {
  /**
   * `GET` request.
   *
   * @param url - Path or absolute URL.
   * @param config - Axios-shaped options.
   * @returns The response.
   */
  get: <T = any>(url: string, config?: LegacyRequestConfig) => send<T>("GET", url, undefined, config),
  /**
   * `POST` request.
   *
   * @param url - Path or absolute URL.
   * @param data - Request body.
   * @param config - Axios-shaped options.
   * @returns The response.
   */
  post: <T = any>(url: string, data?: unknown, config?: LegacyRequestConfig) => send<T>("POST", url, data, config),
  /**
   * `PUT` request.
   *
   * @param url - Path or absolute URL.
   * @param data - Request body.
   * @param config - Axios-shaped options.
   * @returns The response.
   */
  put: <T = any>(url: string, data?: unknown, config?: LegacyRequestConfig) => send<T>("PUT", url, data, config),
  /**
   * `PATCH` request.
   *
   * @param url - Path or absolute URL.
   * @param data - Request body.
   * @param config - Axios-shaped options.
   * @returns The response.
   */
  patch: <T = any>(url: string, data?: unknown, config?: LegacyRequestConfig) => send<T>("PATCH", url, data, config),
  /**
   * `DELETE` request.
   *
   * @param url - Path or absolute URL.
   * @param config - Axios-shaped options.
   * @returns The response.
   */
  delete: <T = any>(url: string, config?: LegacyRequestConfig) => send<T>("DELETE", url, undefined, config),
};

/* eslint-enable @typescript-eslint/no-explicit-any */

/** The axios-shaped client, as returned by {@link createApiClient}. */
export type LegacyApiClient = typeof apiClient;

/**
 * Returns the one client. The `token` argument is ignored: the client reads
 * the session token itself, so per-call tokens can no longer drift from it.
 *
 * @param _token - Unused; kept so existing call sites compile.
 * @returns The app-wide client.
 */
export const createApiClient = (_token?: string | null): LegacyApiClient => apiClient;
