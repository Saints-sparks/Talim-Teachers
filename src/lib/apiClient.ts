import { API_BASE_URL } from "@/app/lib/api/config";
import { ApiError, ApiErrorBody } from "./apiError";
import { sessionStore } from "./session";

/** Request options accepted by the client (a superset of `fetch`'s). */
export interface RequestConfig extends RequestInit {
  /** Abort after this many milliseconds. Default 30 000. */
  timeoutMs?: number;
  /**
   * Send without the bearer token and never attempt a token refresh. Use for
   * public auth calls (login, refresh, password reset): a 401 there means
   * "wrong credentials", not "session expired".
   */
  skipAuth?: boolean;
  /** Query string values, appended to the URL (`undefined`/`null` are dropped). */
  params?: Record<string, string | number | boolean | null | undefined>;
  /** Internal: set once a request has been retried after a token refresh. */
  _retry?: boolean;
}

/** Route the app sends a teacher to while their password must be replaced. */
export const SET_PASSWORD_ROUTE = "/set-password";

type ErrorListener = (error: ApiError) => void;

const DEFAULT_TIMEOUT_MS = 30_000;

/**
 * Appends query parameters to a URL, skipping empty values.
 *
 * @param url - The URL so far.
 * @param params - Values to append.
 * @returns The URL with its query string.
 */
function withParams(url: string, params?: RequestConfig["params"]): string {
  if (!params) return url;
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.append(key, String(value));
  }
  const query = search.toString();
  if (!query) return url;
  return url.includes("?") ? `${url}&${query}` : `${url}?${query}`;
}

/**
 * Unwraps the canonical success envelope `{ success: true, data }` when the
 * backend's `API_ENVELOPE_SUCCESS` flag is on. Bodies that are not exactly
 * that shape (including the ~85 endpoints that return
 * `{ success: true, ...fields }`) are returned untouched.
 *
 * @param body - A successful response body.
 * @returns The payload the caller cares about.
 */
export function unwrapEnvelope<T>(body: unknown): T {
  if (body && typeof body === "object" && !Array.isArray(body)) {
    const record = body as Record<string, unknown>;
    const keys = Object.keys(record);
    const isEnvelope =
      record.success === true &&
      "data" in record &&
      keys.every((key) => key === "success" || key === "data" || key === "meta");
    if (isEnvelope) return record.data as T;
  }
  return body as T;
}

/**
 * The single HTTP client for the Teachers app.
 *
 * - Prefixes relative paths with `API_BASE_URL` and attaches the bearer token
 *   held by `sessionStore` — the one place the session lives.
 * - Refreshes the token once on 401 (queueing concurrent requests), then
 *   signs the teacher out if that fails.
 * - Detects offline / unreachable / timed-out requests and reports them as
 *   `ApiError`s with stable codes, so pages never see a raw `TypeError`.
 * - `get/post/put/patch/delete` return the raw `Response`; the typed `api`
 *   facade at the bottom of this file parses JSON and throws `ApiError` on any
 *   non-2xx, and is what new and migrated code should use.
 */
class ApiClient {
  private accessToken: string | null = null;
  private refreshCallback: (() => Promise<boolean>) | null = null;
  private isRefreshing = false;
  private failedQueue: Array<{ resolve: (value: string | null) => void; reject: (error?: unknown) => void }> = [];
  private errorListeners = new Set<ErrorListener>();

  /**
   * Stores the access token for subsequent requests.
   *
   * @param token - The new token, or `null` when signing out.
   */
  setAccessToken(token: string | null): void {
    this.accessToken = token;
    sessionStore.setToken(token);
  }

  /**
   * The access token requests are sent with right now. Updated synchronously
   * by a refresh, so the socket handshake can read it straight after one.
   *
   * @returns The token, or `null`.
   */
  getAccessToken(): string | null {
    return this.accessToken ?? sessionStore.getToken();
  }

  /**
   * Registers the function that obtains a fresh token (provided by AuthContext).
   *
   * @param callback - Resolves `true` once a new token is stored.
   */
  setRefreshCallback(callback: () => Promise<boolean>): void {
    this.refreshCallback = callback;
  }

  /**
   * Called once by AuthContext on mount.
   *
   * @param token - The token the session starts with.
   * @param refreshCallback - How to obtain a fresh one.
   */
  initialize(token: string | null, refreshCallback: () => Promise<boolean>): void {
    this.accessToken = token;
    this.setRefreshCallback(refreshCallback);
  }

  /**
   * Subscribes to every `ApiError` the client produces — a global banner or
   * toast uses this so pages don't each handle connectivity.
   *
   * @param listener - Called with each error.
   * @returns An unsubscribe function.
   */
  onError(listener: ErrorListener): () => void {
    this.errorListeners.add(listener);
    return () => {
      this.errorListeners.delete(listener);
    };
  }

  /**
   * Tells the error listeners about a failure.
   *
   * @param error - The error to report.
   */
  private emitError(error: ApiError): void {
    for (const listener of this.errorListeners) {
      try {
        listener(error);
      } catch {
        /* a listener must never break a request */
      }
    }
  }

  /**
   * Settles everything queued behind an in-flight refresh.
   *
   * @param error - The refresh failure, if any.
   * @param token - The new token on success.
   */
  private processQueue(error: unknown, token: string | null = null): void {
    for (const { resolve, reject } of this.failedQueue) (error ? reject(error) : resolve(token));
    this.failedQueue = [];
  }

  /**
   * Single-flight token refresh: concurrent 401s share one request.
   *
   * @returns The new token.
   */
  private async handleRefresh(): Promise<string | null> {
    if (this.isRefreshing) {
      return new Promise<string | null>((resolve, reject) => this.failedQueue.push({ resolve, reject }));
    }
    this.isRefreshing = true;
    try {
      if (!this.refreshCallback) throw new Error("No refresh callback set");
      const success = await this.refreshCallback();
      if (!success) throw new Error("Refresh failed");
      this.processQueue(null, this.accessToken);
      return this.accessToken;
    } catch (error) {
      this.processQueue(error, null);
      throw error;
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * Resolves a path against the API origin.
   *
   * @param endpoint - Absolute URL or a path.
   * @returns The absolute URL.
   */
  private buildUrl(endpoint: string): string {
    if (endpoint.startsWith("http")) return endpoint;
    return `${API_BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
  }

  /**
   * Adds the bearer token and the refresh cookie to a request.
   *
   * @param config - The request config.
   * @returns The same config, with credentials and auth applied.
   */
  private withAuth(config: RequestConfig): RequestConfig {
    config.credentials = "include";
    if (config.skipAuth) return config;
    const token = this.getAccessToken();
    if (token) {
      if (!this.accessToken) this.accessToken = token;
      config.headers = { Authorization: `Bearer ${token}`, ...(config.headers as Record<string, string>) };
    }
    return config;
  }

  /**
   * Performs `fetch` with timeout and connectivity handling. Throws
   * `ApiError` for offline / unreachable / timeout; returns the `Response`
   * (of any status) otherwise.
   *
   * @param url - Absolute URL.
   * @param config - Fetch options plus `timeoutMs`.
   * @returns The response.
   */
  private async doFetch(url: string, config: RequestConfig): Promise<Response> {
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      const error = ApiError.offline();
      this.emitError(error);
      throw error;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), config.timeoutMs ?? DEFAULT_TIMEOUT_MS);
    const upstream = config.signal;
    if (upstream) upstream.addEventListener("abort", () => controller.abort(), { once: true });

    try {
      return await fetch(url, { ...config, signal: controller.signal });
    } catch (err) {
      let error: ApiError;
      if ((err as Error)?.name === "AbortError") {
        if (upstream?.aborted) throw err;
        error = ApiError.timeout();
      } else if (typeof navigator !== "undefined" && navigator.onLine === false) {
        error = ApiError.offline();
      } else {
        error = ApiError.unreachable();
      }
      this.emitError(error);
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Low-level request. Returns the `Response` for any status; refreshes the
   * token once on 401 and retries.
   *
   * @param url - Absolute URL or a path relative to `API_BASE_URL`.
   * @param config - Fetch options plus `timeoutMs`, `params` and `skipAuth`.
   * @returns The response.
   */
  async request(url: string, config: RequestConfig = {}): Promise<Response> {
    const fullUrl = withParams(this.buildUrl(url), config.params);
    let response = await this.doFetch(fullUrl, this.withAuth({ ...config }));

    if (response.status === 401 && !config._retry && !config.skipAuth) {
      try {
        await this.handleRefresh();
      } catch (refreshError) {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("auth-changed", { detail: { type: "logout" } }));
        }
        throw refreshError;
      }
      response = await this.doFetch(fullUrl, this.withAuth({ ...config, _retry: true }));
    }

    return response;
  }

  /**
   * Performs a request and parses the JSON body. Any non-2xx status becomes an
   * `ApiError` carrying the server's `error.code`, message and field details.
   *
   * @typeParam T - Shape of the successful body.
   * @param url - Absolute URL or a path relative to `API_BASE_URL`.
   * @param config - Fetch options.
   * @returns The parsed body.
   */
  async json<T>(url: string, config: RequestConfig = {}): Promise<T> {
    const response = await this.request(url, config);
    const text = await response.text();
    let body: unknown = null;
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        body = null;
      }
    }

    if (!response.ok) {
      const error = ApiError.fromResponse(response, body as ApiErrorBody | null);
      this.emitError(error);
      if (
        error.code === "PASSWORD_CHANGE_REQUIRED" &&
        typeof window !== "undefined" &&
        window.location.pathname !== SET_PASSWORD_ROUTE
      ) {
        window.location.assign(SET_PASSWORD_ROUTE);
      }
      throw error;
    }
    return unwrapEnvelope<T>(body);
  }

  /**
   * Performs a request and returns the raw bytes (file exports, avatars).
   *
   * @param url - Absolute URL or a path relative to `API_BASE_URL`.
   * @param config - Fetch options.
   * @returns The response body as a `Blob`.
   */
  async blob(url: string, config: RequestConfig = {}): Promise<Blob> {
    const response = await this.request(url, config);
    if (!response.ok) {
      const error = ApiError.fromResponse(response, null);
      this.emitError(error);
      throw error;
    }
    return response.blob();
  }

  /**
   * Uploads a `FormData` body and reports progress. `fetch` cannot report
   * upload progress, so this one method uses `XMLHttpRequest` — with the same
   * base URL, bearer token and `ApiError` handling as every other request.
   *
   * @typeParam T - Shape of the successful body.
   * @param url - Path or absolute URL.
   * @param form - The multipart body.
   * @param onProgress - Called with a 0–1 fraction as bytes are sent.
   * @returns The parsed body.
   */
  upload<T>(url: string, form: FormData, onProgress?: (fraction: number) => void): Promise<T> {
    const fullUrl = this.buildUrl(url);
    const token = this.getAccessToken();

    return new Promise<T>((resolve, reject) => {
      const request = new XMLHttpRequest();
      request.open("POST", fullUrl, true);
      request.withCredentials = true;
      if (token) request.setRequestHeader("Authorization", `Bearer ${token}`);

      if (onProgress) {
        request.upload.onprogress = (event) => {
          const total = event.total || 0;
          // Stop short of 1: the server still has to store the file.
          if (total) onProgress(Math.min(0.99, event.loaded / total));
        };
      }

      request.onerror = () => {
        const error = ApiError.unreachable();
        this.emitError(error);
        reject(error);
      };
      request.ontimeout = () => {
        const error = ApiError.timeout();
        this.emitError(error);
        reject(error);
      };
      request.onload = () => {
        let body: unknown = null;
        try {
          body = request.responseText ? JSON.parse(request.responseText) : null;
        } catch {
          body = null;
        }
        if (request.status >= 200 && request.status < 300) {
          onProgress?.(1);
          resolve(unwrapEnvelope<T>(body));
          return;
        }
        const error = ApiError.fromResponse({ status: request.status }, body as ApiErrorBody | null);
        this.emitError(error);
        reject(error);
      };

      request.send(form);
    });
  }

  /**
   * Builds a JSON (or FormData) request config for a body-carrying method.
   *
   * @param method - HTTP method.
   * @param data - The body, already in its final shape.
   * @param config - Caller options to merge.
   * @returns The config to pass to `request`.
   */
  bodyConfig(method: string, data: unknown, config: RequestConfig): RequestConfig {
    const isFormData = typeof FormData !== "undefined" && data instanceof FormData;
    return {
      ...config,
      method,
      headers: isFormData ? config.headers : { "Content-Type": "application/json", ...(config.headers as Record<string, string>) },
      body: data === undefined ? undefined : isFormData ? (data as FormData) : JSON.stringify(data),
    };
  }

  // ─── Raw-Response surface. New code should use the typed `api` facade below.

  /**
   * `GET` returning the raw `Response`. Prefer `api.get<T>()`.
   *
   * @param url - Path or absolute URL.
   * @param config - Fetch options.
   * @returns The response.
   */
  get(url: string, config: RequestConfig = {}): Promise<Response> {
    return this.request(url, { ...config, method: "GET" });
  }

  /**
   * `POST` returning the raw `Response`. Prefer `api.post<T>()`.
   *
   * @param url - Path or absolute URL.
   * @param data - Request body.
   * @param config - Fetch options.
   * @returns The response.
   */
  post(url: string, data?: unknown, config: RequestConfig = {}): Promise<Response> {
    return this.request(url, this.bodyConfig("POST", data, config));
  }

  /**
   * `PUT` returning the raw `Response`. Prefer `api.put<T>()`.
   *
   * @param url - Path or absolute URL.
   * @param data - Request body.
   * @param config - Fetch options.
   * @returns The response.
   */
  put(url: string, data?: unknown, config: RequestConfig = {}): Promise<Response> {
    return this.request(url, this.bodyConfig("PUT", data, config));
  }

  /**
   * `PATCH` returning the raw `Response`. Prefer `api.patch<T>()`.
   *
   * @param url - Path or absolute URL.
   * @param data - Request body.
   * @param config - Fetch options.
   * @returns The response.
   */
  patch(url: string, data?: unknown, config: RequestConfig = {}): Promise<Response> {
    return this.request(url, this.bodyConfig("PATCH", data, config));
  }

  /**
   * `DELETE` returning the raw `Response`. Prefer `api.delete<T>()`.
   *
   * @param url - Path or absolute URL.
   * @param config - Fetch options.
   * @returns The response.
   */
  delete(url: string, config: RequestConfig = {}): Promise<Response> {
    return this.request(url, { ...config, method: "DELETE" });
  }
}

/** Singleton client. Import this everywhere; never call `fetch` directly. */
export const apiClient = new ApiClient();

/**
 * Typed facade over the same client: every method parses the JSON body and
 * throws `ApiError` on any non-2xx, offline, unreachable or timed-out request.
 * Use this in all new and migrated code.
 *
 * @example
 * const classes = await api.get<Class[]>("/classes");
 * await api.post<{ userId: string }>("/auth/register", payload);
 */
export const api = {
  /**
   * `GET` returning the parsed body.
   *
   * @param url - Path or absolute URL.
   * @param config - Fetch options.
   * @returns The parsed body.
   */
  get: <T = unknown>(url: string, config: RequestConfig = {}) => apiClient.json<T>(url, { ...config, method: "GET" }),
  /**
   * `POST` returning the parsed body.
   *
   * @param url - Path or absolute URL.
   * @param data - Request body.
   * @param config - Fetch options.
   * @returns The parsed body.
   */
  post: <T = unknown>(url: string, data?: unknown, config: RequestConfig = {}) =>
    apiClient.json<T>(url, apiClient.bodyConfig("POST", data, config)),
  /**
   * `PUT` returning the parsed body.
   *
   * @param url - Path or absolute URL.
   * @param data - Request body.
   * @param config - Fetch options.
   * @returns The parsed body.
   */
  put: <T = unknown>(url: string, data?: unknown, config: RequestConfig = {}) =>
    apiClient.json<T>(url, apiClient.bodyConfig("PUT", data, config)),
  /**
   * `PATCH` returning the parsed body.
   *
   * @param url - Path or absolute URL.
   * @param data - Request body.
   * @param config - Fetch options.
   * @returns The parsed body.
   */
  patch: <T = unknown>(url: string, data?: unknown, config: RequestConfig = {}) =>
    apiClient.json<T>(url, apiClient.bodyConfig("PATCH", data, config)),
  /**
   * `DELETE` returning the parsed body.
   *
   * @param url - Path or absolute URL.
   * @param config - Fetch options.
   * @returns The parsed body.
   */
  delete: <T = unknown>(url: string, config: RequestConfig = {}) => apiClient.json<T>(url, { ...config, method: "DELETE" }),
};
