/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, waitFor, act, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthProvider, useAuth, type AuthContextType } from "@/app/context/AuthContext";
import { toast } from "@/components/CustomToast";
import { classifyLoginError } from "@/hooks/auth/signIn.logic";
import { useSchoolId } from "@/hooks/useSchoolId";
import { sessionStore } from "@/lib/session";
import { apiClient } from "@/lib/apiClient";
import { TALIM_APP_HEADER } from "@/lib/talimApp";

const replace = jest.fn();
const push = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push }),
}));

jest.mock("@/components/CustomToast", () => ({
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

jest.mock("@/lib/webPushSync", () => ({
  unsubscribeWebPushOnLogout: jest.fn().mockResolvedValue(undefined),
  unsubscribeBrowserPush: jest.fn().mockResolvedValue(undefined),
  startWebPushSync: jest.fn(() => () => undefined),
}));

const SCHOOL_ID = "68c0a1b2c3d4e5f6000000aa";

const teacher = {
  _id: "68c0a1b2c3d4e5f600000001",
  userId: "68c0a1b2c3d4e5f600000001",
  email: "teacher@talim.test",
  role: "teacher",
  firstName: "Ada",
  lastName: "Bello",
  schoolId: SCHOOL_ID,
  schoolName: "Talim Test School",
};

/**
 * Builds a fetch response with a JSON body.
 *
 * @param status - HTTP status.
 * @param body - Body to serialise.
 * @returns A Response the client can consume.
 */
function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

const fetchMock = jest.fn();

/** Renders the session, so a test can read it out of the DOM. */
function SessionProbe() {
  const { user, isAuthenticated, isRestoringSession, login, logout } = useAuth();
  const schoolId = useSchoolId();
  return (
    <div>
      <span data-testid="state">{isRestoringSession ? "restoring" : isAuthenticated ? "signed-in" : "signed-out"}</span>
      <span data-testid="email">{user?.email ?? "-"}</span>
      <span data-testid="school">{schoolId ?? "-"}</span>
      <button
        onClick={() =>
          login({ email: "teacher@talim.test", password: "pw", deviceToken: "web-token", platform: "web" }).catch(
            () => undefined,
          )
        }
      >
        sign in
      </button>
      <button onClick={() => logout()}>sign out</button>
    </div>
  );
}

beforeEach(() => {
  fetchMock.mockReset();
  replace.mockReset();
  push.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
  localStorage.clear();
  sessionStorage.clear();
  sessionStore._resetForTests();
  apiClient.setAccessToken(null);
});

describe("AuthContext", () => {
  it("starts signed out when there is no stored session and no refresh cookie", async () => {
    fetchMock.mockResolvedValue(jsonResponse(401, { error: { code: "UNAUTHENTICATED" } }));

    render(
      <AuthProvider>
        <SessionProbe />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId("state")).toHaveTextContent("signed-out"));
    expect(screen.getByTestId("school")).toHaveTextContent("-");
  });

  it("signs in, owns the token, the user and the school id, and routes onwards", async () => {
    fetchMock
      // the mount-time refresh attempt, before anything is stored
      .mockResolvedValueOnce(jsonResponse(401, { error: { code: "UNAUTHENTICATED" } }))
      .mockResolvedValueOnce(jsonResponse(200, { access_token: "token-1" }))
      .mockResolvedValueOnce(jsonResponse(200, { active: true, user: teacher }));

    render(
      <AuthProvider>
        <SessionProbe />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByTestId("state")).toHaveTextContent("signed-out"));

    await userEvent.click(screen.getByText("sign in"));

    await waitFor(() => expect(screen.getByTestId("state")).toHaveTextContent("signed-in"));
    expect(screen.getByTestId("email")).toHaveTextContent("teacher@talim.test");
    // One source of school context, for React and for services alike.
    expect(screen.getByTestId("school")).toHaveTextContent(SCHOOL_ID);
    expect(sessionStore.getSchoolId()).toBe(SCHOOL_ID);
    expect(sessionStore.getToken()).toBe("token-1");
    expect(localStorage.getItem("accessToken")).toBe("token-1");
    expect(replace).toHaveBeenCalled();
  });

  it("refuses a role this portal does not serve and keeps no session", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, { error: { code: "UNAUTHENTICATED" } }))
      .mockResolvedValueOnce(jsonResponse(200, { access_token: "token-1" }))
      .mockResolvedValueOnce(jsonResponse(200, { active: true, user: { ...teacher, role: "parent" } }));

    render(
      <AuthProvider>
        <SessionProbe />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByTestId("state")).toHaveTextContent("signed-out"));

    await userEvent.click(screen.getByText("sign in"));

    await waitFor(() => expect(sessionStore.getToken()).toBeNull());
    expect(screen.getByTestId("state")).toHaveTextContent("signed-out");
    expect(localStorage.getItem("accessToken")).toBeNull();
    expect(replace).not.toHaveBeenCalled();
  });

  it("restores a stored session on load by introspecting the stored token", async () => {
    localStorage.setItem("accessToken", "stored-token");
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { active: true, user: teacher }));

    render(
      <AuthProvider>
        <SessionProbe />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId("state")).toHaveTextContent("signed-in"));
    expect(screen.getByTestId("school")).toHaveTextContent(SCHOOL_ID);
    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe("http://api.test/auth/introspect");
  });

  it("clears the session everywhere on sign-out", async () => {
    localStorage.setItem("accessToken", "stored-token");
    fetchMock.mockResolvedValue(jsonResponse(200, { active: true, user: teacher }));

    render(
      <AuthProvider>
        <SessionProbe />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByTestId("state")).toHaveTextContent("signed-in"));

    await act(async () => {
      await userEvent.click(screen.getByText("sign out"));
    });

    await waitFor(() => expect(screen.getByTestId("state")).toHaveTextContent("signed-out"));
    expect(localStorage.getItem("accessToken")).toBeNull();
    expect(localStorage.getItem("user")).toBeNull();
    expect(sessionStore.getUser()).toBeNull();
    expect(sessionStore.getSchoolId()).toBeNull();
  });

  it("ends the session when a refresh fails anywhere in the app", async () => {
    localStorage.setItem("accessToken", "stored-token");
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { active: true, user: teacher }));

    render(
      <AuthProvider>
        <SessionProbe />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByTestId("state")).toHaveTextContent("signed-in"));

    // The API client raises this after a refresh it could not complete.
    await act(async () => {
      window.dispatchEvent(new CustomEvent("auth-changed", { detail: { type: "logout" } }));
    });

    await waitFor(() => expect(sessionStore.getToken()).toBeNull());
    expect(localStorage.getItem("accessToken")).toBeNull();
  });
});

describe("a sign-in refused for the role", () => {
  /** The wording of both gates: the API's (403 with `X-Talim-App`) and this portal's after introspect. */
  const GATE =
    'Access denied. This portal is for teachers only. Your account is registered as "school admin". ' +
    "Please use the correct Talim app for your role.";

  /**
   * Renders the provider, waits for the restore attempt to find no session,
   * signs in and returns what `login` threw.
   *
   * @returns The error `login` rejected with.
   */
  async function signInAndCatch(): Promise<unknown> {
    let auth: AuthContextType | null = null;
    /**
     * Hands the context to the test.
     *
     * @returns Nothing visible.
     */
    function Capture() {
      auth = useAuth();
      return null;
    }
    render(
      <AuthProvider>
        <Capture />
        <SessionProbe />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByTestId("state")).toHaveTextContent("signed-out"));
    let thrown: unknown = null;
    await act(async () => {
      thrown = await auth!
        .login({ email: "admin@talim.test", password: "pw", deviceToken: "web-token", platform: "web" })
        .then(() => null, (error: unknown) => error);
    });
    return thrown;
  }

  it("by the API (403 FORBIDDEN) ends exactly like the portal's own access-denied gate", async () => {
    (toast.error as jest.Mock).mockClear();
    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, { error: { code: "UNAUTHENTICATED" } }))
      .mockResolvedValueOnce(jsonResponse(403, { success: false, error: { code: "FORBIDDEN", message: GATE } }));
    const fromApi = await signInAndCatch();
    const loginCall = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(loginCall[0]).toBe("http://api.test/auth/login");
    expect((loginCall[1].headers as Record<string, string>)[TALIM_APP_HEADER]).toBe("teachers");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(classifyLoginError(fromApi)).toEqual({ kind: "access_denied", message: GATE });
    expect(toast.error).toHaveBeenLastCalledWith(GATE);
    expect(sessionStore.getToken()).toBeNull();
    expect(replace).not.toHaveBeenCalled();
  });

  it("classifies the API's refusal and the client-side gate the same way", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, { error: { code: "UNAUTHENTICATED" } }))
      .mockResolvedValueOnce(jsonResponse(403, { success: false, error: { code: "FORBIDDEN", message: GATE } }));
    const fromApi = await signInAndCatch();
    cleanup();

    fetchMock.mockReset();
    sessionStore._resetForTests();
    apiClient.setAccessToken(null);
    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, { error: { code: "UNAUTHENTICATED" } }))
      .mockResolvedValueOnce(jsonResponse(200, { access_token: "token-1" }))
      .mockResolvedValueOnce(jsonResponse(200, { active: true, user: { ...teacher, role: "school_admin" } }));
    const fromIntrospect = await signInAndCatch();

    expect(classifyLoginError(fromIntrospect)).toEqual(classifyLoginError(fromApi));
    expect((fromIntrospect as Error).message).toBe((fromApi as Error).message);
    expect(sessionStore.getToken()).toBeNull();
  });
});
