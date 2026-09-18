/**
 * @jest-environment jsdom
 */
import { ApiError, getErrorMessage } from "@/lib/apiError";
import { api, apiClient, unwrapEnvelope } from "@/lib/apiClient";
import { sessionStore } from "@/lib/session";

/**
 * Builds a `fetch` response with a JSON body.
 *
 * @param status - HTTP status.
 * @param body - Body to serialise.
 * @returns A Response the client can consume.
 */
function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const fetchMock = jest.fn();

beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
  localStorage.clear();
  sessionStore._resetForTests();
  apiClient.setAccessToken(null);
});

describe("apiClient", () => {
  it("prefixes relative paths with the API base URL and attaches the bearer token", async () => {
    apiClient.setAccessToken("token-1");
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { _id: "c1" }));

    await api.get("/classes/c1");

    const [url, config] = fetchMock.mock.calls[0];
    expect(url).toBe("http://api.test/classes/c1");
    expect((config.headers as Record<string, string>).Authorization).toBe("Bearer token-1");
    expect(config.credentials).toBe("include");
  });

  it("serialises query params and drops empty ones", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, []));

    await api.get("/notifications", { params: { page: 1, limit: 50, search: "", cursor: undefined } });

    expect(fetchMock.mock.calls[0][0]).toBe("http://api.test/notifications?page=1&limit=50");
  });

  it("does not attach a token when skipAuth is set", async () => {
    apiClient.setAccessToken("token-1");
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { access_token: "new" }));

    await api.post("/auth/login", { email: "a@b.c" }, { skipAuth: true });

    const [, config] = fetchMock.mock.calls[0];
    expect((config.headers as Record<string, string>).Authorization).toBeUndefined();
  });

  it("turns the error envelope into a typed ApiError with field errors", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(400, {
        success: false,
        error: {
          code: "VALIDATION_FAILED",
          message: "Some fields need attention.",
          details: [{ field: "score", reason: "must not be greater than 100" }],
        },
      }),
    );

    expect.assertions(5);
    try {
      await api.post("/grades", { score: 120 });
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      const apiError = error as ApiError;
      expect(apiError.code).toBe("VALIDATION_FAILED");
      expect(apiError.status).toBe(400);
      expect(apiError.fieldErrors()).toEqual({ score: "must not be greater than 100" });
      expect(getErrorMessage(error)).toBe("Some fields need attention.");
    }
  });

  it("maps a status with no error body onto a code and a user-safe message", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(500, {}));

    const error = (await api.get("/classes").catch((e) => e)) as ApiError;
    expect(error.code).toBe("INTERNAL_ERROR");
    expect(error.isTransient).toBe(true);
    expect(error.message).toBe("Something went wrong on our side. Please try again.");
  });

  it("reports an unreachable server rather than a raw TypeError", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));

    const error = (await api.get("/classes").catch((e) => e)) as ApiError;
    expect(error).toBeInstanceOf(ApiError);
    expect(error.code).toBe("SERVICE_UNAVAILABLE");
    expect(error.isTransient).toBe(true);
  });

  it("refreshes the token once on 401 and retries the request", async () => {
    apiClient.setAccessToken("stale");
    const refresh = jest.fn(async () => {
      apiClient.setAccessToken("fresh");
      return true;
    });
    apiClient.setRefreshCallback(refresh);

    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, { error: { code: "TOKEN_EXPIRED", message: "Token expired" } }))
      .mockResolvedValueOnce(jsonResponse(200, { _id: "c1" }));

    const result = await api.get<{ _id: string }>("/classes/c1");

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ _id: "c1" });
    const retryHeaders = fetchMock.mock.calls[1][1].headers as Record<string, string>;
    expect(retryHeaders.Authorization).toBe("Bearer fresh");
  });

  it("shares one refresh between concurrent 401s", async () => {
    apiClient.setAccessToken("stale");
    let completeRefresh!: (value: boolean) => void;
    const refreshed = new Promise<boolean>((resolve) => {
      completeRefresh = resolve;
    });
    const refresh = jest.fn(() => refreshed);
    apiClient.setRefreshCallback(refresh);

    fetchMock.mockImplementation((_url: string, config: RequestInit) =>
      Promise.resolve(
        (config.headers as Record<string, string> | undefined)?.Authorization === "Bearer fresh"
          ? jsonResponse(200, { ok: true })
          : jsonResponse(401, { error: { code: "TOKEN_EXPIRED" } }),
      ),
    );

    const first = api.get("/a");
    const second = api.get("/b");
    await new Promise((resolve) => setTimeout(resolve, 0));
    apiClient.setAccessToken("fresh");
    completeRefresh(true);

    await expect(first).resolves.toEqual({ ok: true });
    await expect(second).resolves.toEqual({ ok: true });
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("signs the user out when the refresh itself fails", async () => {
    apiClient.setAccessToken("stale");
    apiClient.setRefreshCallback(async () => false);
    const onAuthChanged = jest.fn();
    window.addEventListener("auth-changed", onAuthChanged);

    fetchMock.mockResolvedValueOnce(jsonResponse(401, { error: { code: "TOKEN_EXPIRED" } }));

    await expect(api.get("/classes")).rejects.toBeDefined();
    expect(onAuthChanged).toHaveBeenCalled();
    window.removeEventListener("auth-changed", onAuthChanged);
  });

  it("never refreshes on a 401 from a skipAuth call", async () => {
    const refresh = jest.fn(async () => true);
    apiClient.setRefreshCallback(refresh);
    fetchMock.mockResolvedValueOnce(jsonResponse(401, { error: { code: "UNAUTHENTICATED", message: "Bad password" } }));

    const error = (await api.post("/auth/login", {}, { skipAuth: true }).catch((e) => e)) as ApiError;

    expect(refresh).not.toHaveBeenCalled();
    expect(error.code).toBe("UNAUTHENTICATED");
    expect(error.isAuthError).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("publishes every error to the client's error listeners", async () => {
    const listener = jest.fn();
    const unsubscribe = apiClient.onError(listener);
    fetchMock.mockResolvedValueOnce(jsonResponse(404, { error: { code: "NOT_FOUND" } }));

    await api.get("/classes/missing").catch(() => undefined);

    expect(listener).toHaveBeenCalledTimes(1);
    expect((listener.mock.calls[0][0] as ApiError).code).toBe("NOT_FOUND");
    unsubscribe();
  });
});

describe("unwrapEnvelope", () => {
  it("unwraps the canonical success envelope", () => {
    expect(unwrapEnvelope({ success: true, data: [1, 2] })).toEqual([1, 2]);
    expect(unwrapEnvelope({ success: true, data: { _id: "x" }, meta: { total: 1 } })).toEqual({ _id: "x" });
  });

  it("leaves the endpoints that return their own fields alongside `success` untouched", () => {
    const body = { success: true, data: [1], total: 1 };
    expect(unwrapEnvelope(body)).toBe(body);
    expect(unwrapEnvelope({ _id: "x" })).toEqual({ _id: "x" });
    expect(unwrapEnvelope([1, 2])).toEqual([1, 2]);
  });
});
