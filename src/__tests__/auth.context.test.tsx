/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthProvider, useAuth } from "@/app/context/AuthContext";
import { useSchoolId } from "@/hooks/useSchoolId";
import { sessionStore } from "@/lib/session";
import { apiClient } from "@/lib/apiClient";

const replace = jest.fn();
const push = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push }),
}));

jest.mock("@/components/CustomToast", () => ({
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

jest.mock("@/app/hooks/usePushNotifications", () => ({
  unsubscribeWebPushOnLogout: jest.fn().mockResolvedValue(undefined),
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
