/**
 * @jest-environment jsdom
 */
import React from "react";
import { act, render, screen, waitFor } from "@/test-utils/render";
import { render as plainRender } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LoginPage from "@/app/page";
import { AuthProvider, useAuth } from "@/app/context/AuthContext";
import { TEACHER_ONBOARDING_STEPS } from "@/app/context/OnboardingContext";
import {
  DEFAULT_LANDING_ROUTE,
  LANDING_ROUTES,
  cacheLandingPage,
  fetchLandingRoute,
  isLandingPage,
  landingCacheKey,
  landingRouteFor,
  readCachedLandingRoute,
  resolveSignedInRoute,
} from "@/app/lib/landing";
import { resolvePostLoginRoute } from "@/app/lib/postLoginRoute";
import { api, apiClient } from "@/lib/apiClient";
import { ApiError } from "@/lib/apiError";
import { sessionStore } from "@/lib/session";
import { mockTeacher } from "@/test-utils/render";

const replace = jest.fn();
const push = jest.fn();
const router = { replace, push };
jest.mock("next/navigation", () => ({ useRouter: () => router }));
jest.mock("@/components/CustomToast", () => ({ toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }));
jest.mock("@/lib/logger", () => ({ logger: { error: jest.fn(), warn: jest.fn(), debug: jest.fn(), info: jest.fn() } }));
jest.mock("@/lib/webPushSync", () => ({
  unsubscribeWebPushOnLogout: jest.fn().mockResolvedValue(undefined),
  unsubscribeBrowserPush: jest.fn().mockResolvedValue(undefined),
  startWebPushSync: jest.fn(() => () => undefined),
}));

const USER_ID = mockTeacher.userId;

/**
 * Marks onboarding done (phase 1 and every required step) for a user, as
 * `OnboardingContext` stores it.
 *
 * @param userId - The teacher.
 * @param requiredDone - False to leave the required steps undone.
 */
function finishOnboarding(userId: string, requiredDone = true) {
  const completedSteps = requiredDone ? TEACHER_ONBOARDING_STEPS.filter((step) => step.required).map((step) => step.id) : [];
  localStorage.setItem(`teacher_onboarding_${userId}`, JSON.stringify({ phase1Completed: true, completedSteps }));
}

beforeEach(() => {
  jest.restoreAllMocks();
  replace.mockReset();
  push.mockReset();
  localStorage.clear();
  sessionStorage.clear();
});

describe("the landing preference mapping", () => {
  it("maps each value to its route and anything else to the dashboard", () => {
    expect(LANDING_ROUTES).toEqual({ dashboard: "/dashboard", timetable: "/timetable", attendance: "/attendance", messages: "/messages" });
    expect(landingRouteFor("timetable")).toBe("/timetable");
    expect(landingRouteFor("messages")).toBe("/messages");
    expect(landingRouteFor("grading")).toBe(DEFAULT_LANDING_ROUTE);
    expect(landingRouteFor(undefined)).toBe("/dashboard");
    expect(isLandingPage("attendance")).toBe(true);
    expect(isLandingPage("toString")).toBe(false);
  });

  it("caches a valid value per user, and ignores anything else", () => {
    cacheLandingPage(USER_ID, "attendance");
    cacheLandingPage(USER_ID, "grading");
    cacheLandingPage(null, "timetable");
    expect(localStorage.getItem(landingCacheKey(USER_ID))).toBe("attendance");
    expect(readCachedLandingRoute(USER_ID)).toBe("/attendance");
    expect(readCachedLandingRoute("someone-else")).toBeNull();
  });
});

describe("resolvePostLoginRoute precedence", () => {
  it("sends a temporary password to set-password before anything else", () => {
    finishOnboarding(USER_ID);
    expect(resolvePostLoginRoute({ userId: USER_ID, mustChangePassword: true }, "/timetable")).toBe("/set-password");
  });

  it("then onboarding: phase 1 first, then the required steps", () => {
    expect(resolvePostLoginRoute({ userId: USER_ID }, "/timetable")).toBe("/onboarding");
    finishOnboarding(USER_ID, false);
    expect(resolvePostLoginRoute({ userId: USER_ID }, "/timetable")).toBe("/onboarding/setup");
  });

  it("then the landing page, or the dashboard when none is known", () => {
    finishOnboarding(USER_ID);
    expect(resolvePostLoginRoute({ userId: USER_ID }, "/timetable")).toBe("/timetable");
    expect(resolvePostLoginRoute({ userId: USER_ID })).toBe("/dashboard");
  });
});

describe("resolveSignedInRoute", () => {
  it("reads the landing page from GET /teacher/settings with a short timeout, and caches it", async () => {
    finishOnboarding(USER_ID);
    const get = jest.spyOn(api, "get").mockResolvedValue({ preferences: { teaching: { landingPage: "attendance" } } });

    await expect(resolveSignedInRoute({ userId: USER_ID })).resolves.toBe("/attendance");
    expect(get).toHaveBeenCalledWith("/teacher/settings", { timeoutMs: 2500 });
    expect(readCachedLandingRoute(USER_ID)).toBe("/attendance");
  });

  it("falls back to the value cached on this device when the settings call fails", async () => {
    finishOnboarding(USER_ID);
    cacheLandingPage(USER_ID, "messages");
    jest.spyOn(api, "get").mockRejectedValue(ApiError.timeout());

    await expect(resolveSignedInRoute({ userId: USER_ID })).resolves.toBe("/messages");
  });

  it("falls back to the dashboard when the call fails and nothing is cached", async () => {
    finishOnboarding(USER_ID);
    jest.spyOn(api, "get").mockRejectedValue(ApiError.unreachable());

    await expect(fetchLandingRoute(USER_ID)).resolves.toBe("/dashboard");
    await expect(resolveSignedInRoute({ userId: USER_ID })).resolves.toBe("/dashboard");
  });

  it("does not ask for the settings while set-password or onboarding comes first", async () => {
    const get = jest.spyOn(api, "get");
    await expect(resolveSignedInRoute({ userId: USER_ID, mustChangePassword: true })).resolves.toBe("/set-password");
    await expect(resolveSignedInRoute({ userId: USER_ID })).resolves.toBe("/onboarding");
    expect(get).not.toHaveBeenCalled();
  });
});

describe("the sign-in page at /", () => {
  it("sends a signed-in teacher to their landing page instead of showing the form", async () => {
    finishOnboarding(USER_ID);
    jest.spyOn(api, "get").mockResolvedValue({ preferences: { teaching: { landingPage: "timetable" } } });
    render(<LoginPage />);

    expect(screen.getByRole("status", { name: "Signing in" })).toBeInTheDocument();
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/timetable"));
    expect(replace).toHaveBeenCalledTimes(1);
  });

  it("keeps a signed-in teacher with a temporary password on the way to set-password", async () => {
    render(<LoginPage />, { user: { ...mockTeacher, mustChangePassword: true } });
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/set-password"));
  });

  it("shows the loader, not the form's redirect, while the session is still restoring", () => {
    render(<LoginPage />, { user: null, auth: { isRestoringSession: true } });
    expect(screen.getByRole("status", { name: "Signing in" })).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it("shows the form to a signed-out visitor", async () => {
    const get = jest.spyOn(api, "get");
    render(<LoginPage />, { user: null });

    expect(screen.getByRole("heading", { name: "Welcome back" })).toBeInTheDocument();
    expect(screen.getByLabelText("Email or Staff Number")).toBeInTheDocument();
    expect(screen.queryByRole("status", { name: "Signing in" })).not.toBeInTheDocument();
    await act(async () => undefined);
    expect(replace).not.toHaveBeenCalled();
    expect(get).not.toHaveBeenCalled();
  });
});

describe("signing in (AuthContext.login)", () => {
  /**
   * Builds a fetch response with a JSON body.
   *
   * @param status - HTTP status.
   * @param body - Body to serialise.
   * @returns The response.
   */
  const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

  /** Signs in on click, so the test can drive `login`. */
  function SignIn() {
    const { login } = useAuth();
    return (
      <button type="button" onClick={() => login({ email: "teacher@talim.test", password: "pw", deviceToken: "web-token", platform: "web" }).catch(() => undefined)}>
        sign in
      </button>
    );
  }

  beforeEach(() => {
    sessionStore._resetForTests();
    apiClient.setAccessToken(null);
  });

  it("opens the teacher's landing page once onboarding is done", async () => {
    finishOnboarding(USER_ID);
    const fetchMock = jest.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/auth/refresh")) return Promise.resolve(json(401, { error: { code: "UNAUTHENTICATED" } }));
      if (url.includes("/auth/login")) return Promise.resolve(json(200, { access_token: "token-1" }));
      if (url.includes("/auth/introspect")) return Promise.resolve(json(200, { active: true, user: mockTeacher }));
      if (url.includes("/teacher/settings")) return Promise.resolve(json(200, { preferences: { teaching: { landingPage: "attendance" } } }));
      return Promise.resolve(json(404, {}));
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    plainRender(
      <AuthProvider>
        <SignIn />
      </AuthProvider>,
    );
    await act(async () => undefined);
    await userEvent.click(screen.getByText("sign in"));

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/attendance"));
    expect(fetchMock.mock.calls.some(([input]) => String(input).includes("/teacher/settings"))).toBe(true);
    expect(readCachedLandingRoute(USER_ID)).toBe("/attendance");
  });
});
