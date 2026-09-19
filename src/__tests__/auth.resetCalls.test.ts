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
  sessionStore._resetForTests();
  // A signed-in token that must never leak onto the public reset calls.
  apiClient.setAccessToken("stale-token");
  apiClient.setRefreshCallback(jest.fn().mockResolvedValue(true));
});

describe("password reset calls", () => {
  it.each([
    ["forgotPassword", () => authService.forgotPassword(" Ada@School.test "), "/auth/forgot-password", { email: "Ada@School.test" }],
    ["verifyResetCode", () => authService.verifyResetCode("ada@school.test", "123456"), "/auth/verify-reset-code", { email: "ada@school.test", token: "123456" }],
    [
      "resetPassword",
      () => authService.resetPassword("ada@school.test", "123456", "NewPassw0rd!"),
      "/auth/reset-password",
      { email: "ada@school.test", token: "123456", newPassword: "NewPassw0rd!" },
    ],
  ])("%s goes out without a session and sends exactly the DTO fields", async (_name, call, path, body) => {
    fetchMock.mockResolvedValueOnce(json(200, { message: "ok", valid: true }));

    await call();

    const [url, config] = fetchMock.mock.calls[0];
    expect(url).toBe(`http://api.test${path}`);
    expect((config.headers as Record<string, string>).Authorization).toBeUndefined();
    expect(JSON.parse(config.body as string)).toEqual(body);
  });

  it("treats a 401 from a reset call as the server's answer, never as an expired session", async () => {
    fetchMock.mockResolvedValueOnce(json(401, { statusCode: 401, message: "Unauthorized" }));

    await expect(authService.verifyResetCode("ada@school.test", "123456")).rejects.toMatchObject({ status: 401 });

    // No token refresh and no retry: skipAuth suppresses both.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
