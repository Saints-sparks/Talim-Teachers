/**
 * @jest-environment jsdom
 */
import { authService } from "@/app/services/auth.service";
import { apiClient } from "@/lib/apiClient";
import { sessionStore } from "@/lib/session";

const fetchMock = jest.fn();

/**
 * A JSON `fetch` response.
 *
 * @param status - HTTP status.
 * @param body - Body to serialise.
 * @returns The response.
 */
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
  localStorage.clear();
  sessionStore._resetForTests();
  apiClient.setAccessToken("old-token");
});

describe("authService.refreshSession", () => {
  it("adopts the new token in the client, the session store and storage, without sending the old one", async () => {
    fetchMock.mockResolvedValueOnce(json(200, { access_token: "new-token" }));

    await expect(authService.refreshSession()).resolves.toBe("new-token");

    const [url, config] = fetchMock.mock.calls[0];
    expect(url).toBe("http://api.test/auth/refresh");
    expect((config.headers as Record<string, string>).Authorization).toBeUndefined();
    expect(apiClient.getAccessToken()).toBe("new-token");
    expect(sessionStore.getToken()).toBe("new-token");
    expect(localStorage.getItem("accessToken")).toBe("new-token");
  });

  it("rejects, leaving the old token alone, when the server returns no token", async () => {
    fetchMock.mockResolvedValueOnce(json(200, {}));

    await expect(authService.refreshSession()).rejects.toThrow(/no access token/i);
    expect(apiClient.getAccessToken()).toBe("old-token");
  });

  it("raises the server's error when the refresh cookie is rejected", async () => {
    fetchMock.mockResolvedValueOnce(json(401, { success: false, error: { code: "UNAUTHENTICATED", message: "Refresh token rejected" } }));

    await expect(authService.refreshSession()).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
  });
});
