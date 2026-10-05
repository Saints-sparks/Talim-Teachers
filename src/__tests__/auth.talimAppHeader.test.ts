/**
 * @jest-environment jsdom
 *
 * Every request from the one API client names this portal with
 * `X-Talim-App: teachers`, so the API keeps the teacher's session in its own
 * refresh cookie (`refreshToken_teachers`) and another portal's sign-in in the
 * same browser can't replace it. The auth calls matter most: sign-in,
 * refresh, logout, change-password and the sessions routes all read or set
 * that cookie.
 */
import { authService } from "@/app/services/auth.service";
import { accountService } from "@/app/services/account/account.service";
import { refreshAccessToken } from "@/app/lib/api/apiClient";
import { api, apiClient } from "@/lib/apiClient";
import { sessionStore } from "@/lib/session";
import { TALIM_APP, TALIM_APP_HEADER } from "@/lib/talimApp";

const fetchMock = jest.fn();

/**
 * A JSON `fetch` response.
 *
 * @param status - HTTP status.
 * @param body - Body to serialise.
 * @returns The response.
 */
const json = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

/**
 * The URL, method and headers of one recorded `fetch` call.
 *
 * @param index - Which call (0 for the first).
 * @returns What the client sent.
 */
function sent(index = 0): { url: string; method: string | undefined; headers: Record<string, string> } {
  const [url, config] = fetchMock.mock.calls[index] as [string, RequestInit];
  return { url, method: config.method, headers: (config.headers ?? {}) as Record<string, string> };
}

beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
  localStorage.clear();
  sessionStore._resetForTests();
  apiClient.setAccessToken("token-1");
});

describe("X-Talim-App", () => {
  it("is this portal's value from the generated contract", () => {
    expect(TALIM_APP_HEADER).toBe("X-Talim-App");
    expect(TALIM_APP).toBe("teachers");
  });

  it("goes on the sign-in request, which carries no bearer token", async () => {
    fetchMock.mockResolvedValueOnce(json(200, { access_token: "new" }));

    await authService.login({ email: "tolu@school.test", password: "Right#Pass1", deviceToken: "web-token", platform: "web" });

    const { url, method, headers } = sent();
    expect(url).toBe("http://api.test/auth/login");
    expect(method).toBe("POST");
    expect(headers[TALIM_APP_HEADER]).toBe("teachers");
    expect(headers.Authorization).toBeUndefined();
  });

  it("goes on the refresh request, from the service and from the legacy helper", async () => {
    fetchMock.mockResolvedValue(json(200, { access_token: "rotated" }));

    await authService.refresh();
    await refreshAccessToken();

    for (const index of [0, 1]) {
      const { url, headers } = sent(index);
      expect(url).toBe("http://api.test/auth/refresh");
      expect(headers[TALIM_APP_HEADER]).toBe("teachers");
    }
  });

  it("goes on the logout request", async () => {
    fetchMock.mockResolvedValueOnce(json(200, { message: "Logged out" }));

    await authService.logout();

    const { url, method, headers } = sent();
    expect(url).toBe("http://api.test/auth/logout");
    expect(method).toBe("POST");
    expect(headers[TALIM_APP_HEADER]).toBe("teachers");
  });

  it("goes on change-password, beside the bearer token", async () => {
    fetchMock.mockResolvedValueOnce(json(200, { access_token: "after-change", message: "Password changed" }));

    await authService.changePassword("Old#Pass1", "New#Pass12", "New#Pass12");

    const { url, headers } = sent();
    expect(url).toBe("http://api.test/auth/change-password");
    expect(headers[TALIM_APP_HEADER]).toBe("teachers");
    expect(headers.Authorization).toBe("Bearer token-1");
  });

  it("goes on the sessions routes", async () => {
    fetchMock
      .mockResolvedValueOnce(json(200, []))
      .mockResolvedValueOnce(json(200, { revoked: 2 }))
      .mockResolvedValueOnce(json(200, { id: "s1", revoked: true, current: false }));

    await accountService.listSessions();
    await accountService.revokeOtherSessions();
    await accountService.revokeSession("s1");

    expect(fetchMock.mock.calls.map((_, index) => `${sent(index).method} ${sent(index).url}`)).toEqual([
      "GET http://api.test/auth/sessions",
      "POST http://api.test/auth/sessions/revoke-others",
      "DELETE http://api.test/auth/sessions/s1",
    ]);
    for (const index of [0, 1, 2]) expect(sent(index).headers[TALIM_APP_HEADER]).toBe("teachers");
  });

  it("goes on the retry after a refresh, and on every other request", async () => {
    apiClient.setRefreshCallback(async () => {
      apiClient.setAccessToken("token-2");
      return true;
    });
    fetchMock
      .mockResolvedValueOnce(json(401, { error: { code: "TOKEN_EXPIRED", message: "jwt expired" } }))
      .mockResolvedValueOnce(json(200, []));

    await api.get("/classes", { headers: { "X-Request-Source": "test" } });

    for (const index of [0, 1]) {
      const { headers } = sent(index);
      expect(headers[TALIM_APP_HEADER]).toBe("teachers");
      expect(headers["X-Request-Source"]).toBe("test");
    }
    expect(sent(1).headers.Authorization).toBe("Bearer token-2");
  });
});
