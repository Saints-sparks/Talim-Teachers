/**
 * @jest-environment jsdom
 */
import React from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@/test-utils/render";
import { render as plainRender } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient } from "@tanstack/react-query";
import LoginPage from "@/app/page";
import { AuthProvider, useAuth } from "@/app/context/AuthContext";
import { DeleteAccountSection } from "@/components/settings/DeleteAccountSection";
import { SignInFooter } from "@/components/auth/signin-ui";
import { accountService } from "@/app/services/account/account.service";
import { toast } from "@/components/CustomToast";
import { ApiError } from "@/lib/apiError";
import { apiClient } from "@/lib/apiClient";
import { sessionStore } from "@/lib/session";
import { clearQueriesOnLogout } from "@/providers/query-provider";
import { unsubscribeBrowserPush } from "@/lib/webPushSync";
import {
  DELETION_CANCELLED_MESSAGE,
  deletionErrorMessage,
  deletionNoticeFromSearch,
  deletionScheduledMessage,
  deletionScheduledRoute,
} from "@/hooks/settings/settings.logic";

const replace = jest.fn();
const push = jest.fn();
jest.mock("next/navigation", () => ({ useRouter: () => ({ replace, push }) }));
jest.mock("next/image", () => ({
  __esModule: true,
  default: ({ priority: _priority, fill: _fill, ...props }: Record<string, unknown>) => <img alt="" {...props} />,
}));
jest.mock("@/components/CustomToast", () => ({ toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }));
jest.mock("@/lib/webPushSync", () => ({
  unsubscribeWebPushOnLogout: jest.fn().mockResolvedValue(undefined),
  unsubscribeBrowserPush: jest.fn().mockResolvedValue(undefined),
  startWebPushSync: jest.fn(() => () => undefined),
}));
jest.mock("@/app/services/account/account.service", () => ({ accountService: { requestDeletion: jest.fn() } }));

const service = accountService as jest.Mocked<typeof accountService>;
const SCHEDULED = { status: "scheduled" as const, requestedAt: "2026-10-09T10:00:00.000Z", scheduledFor: "2026-11-08T10:00:00.000Z" };

/**
 * A refusal of `POST /auth/account/deletion` as the API client throws it.
 *
 * @param status - HTTP status.
 * @param reason - The route's top-level `code`.
 * @param message - The server's message.
 * @returns The error.
 */
function refusal(status: number, reason: string, message: string): ApiError {
  return new ApiError(status === 401 ? "UNAUTHENTICATED" : "CONFLICT", message, status, [], undefined, {
    success: false,
    code: reason,
    error: { code: status === 401 ? "UNAUTHENTICATED" : "CONFLICT", message },
  });
}

/**
 * Opens the sheet from the danger zone.
 *
 * @returns The dialog.
 */
async function openSheet(): Promise<HTMLElement> {
  fireEvent.click(screen.getByRole("button", { name: "Delete account" }));
  return screen.findByRole("dialog", { name: "Delete your account?" });
}

/**
 * Types a password and ticks the box.
 *
 * @param dialog - The open sheet.
 * @param password - What to type.
 */
function complete(dialog: HTMLElement, password = "Correct#Pass1") {
  fireEvent.change(within(dialog).getByLabelText("Password"), { target: { value: password } });
  fireEvent.click(within(dialog).getByRole("checkbox", { name: /I understand/ }));
}

beforeEach(() => {
  jest.clearAllMocks();
  window.history.replaceState({}, "", "/");
});

describe("Settings → Security → Danger zone", () => {
  it("explains the 30 days, what is erased and kept, and links the full explanation", () => {
    render(<DeleteAccountSection />);
    const zone = screen.getByRole("region", { name: "Danger zone" });
    expect(zone).toHaveTextContent("deleted in 30 days");
    expect(zone).toHaveTextContent("signing in before then cancels it");
    expect(zone).toHaveTextContent("name, email, phone number and photo are erased");
    expect(zone).toHaveTextContent("Your school keeps grades, attendance and payments");
    expect(within(zone).getByRole("link", { name: /What happens when you delete your account/ })).toHaveAttribute(
      "href",
      "https://www.mytalim.com/delete-account",
    );
  });

  it("keeps Delete disabled until a password is typed and the box is ticked", async () => {
    render(<DeleteAccountSection />);
    const dialog = await openSheet();
    const confirm = within(dialog).getByRole("button", { name: "Delete account" });
    expect(confirm).toBeDisabled();

    fireEvent.change(within(dialog).getByLabelText("Password"), { target: { value: "pw" } });
    expect(confirm).toBeDisabled();

    fireEvent.click(within(dialog).getByRole("checkbox", { name: /I understand/ }));
    expect(confirm).toBeEnabled();

    fireEvent.change(within(dialog).getByLabelText("Password"), { target: { value: "" } });
    expect(confirm).toBeDisabled();
    expect(service.requestDeletion).not.toHaveBeenCalled();
  });

  it("on 200 signs out through logout and lands on sign-in with the date", async () => {
    service.requestDeletion.mockResolvedValueOnce(SCHEDULED);
    const logout = jest.fn().mockResolvedValue(undefined);
    render(<DeleteAccountSection />, { auth: { logout } });
    const dialog = await openSheet();
    complete(dialog);
    fireEvent.change(within(dialog).getByLabelText(/Why are you leaving/), { target: { value: "  Moving schools " } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete account" }));

    await waitFor(() => expect(logout).toHaveBeenCalledWith({ redirectTo: "/?deletionScheduledFor=2026-11-08T10%3A00%3A00.000Z", sessionEnded: true }));
    expect(service.requestDeletion).toHaveBeenCalledWith({ password: "Correct#Pass1", reason: "Moving schools" });
  });

  it("shows INVALID_PASSWORD on the password field and stays signed in", async () => {
    service.requestDeletion.mockRejectedValueOnce(refusal(401, "INVALID_PASSWORD", "Invalid password"));
    const logout = jest.fn();
    render(<DeleteAccountSection />, { auth: { logout } });
    const dialog = await openSheet();
    complete(dialog, "wrong");
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete account" }));

    const field = within(dialog).getByLabelText("Password");
    await waitFor(() => expect(field).toHaveAttribute("aria-invalid", "true"));
    expect(field).toHaveAccessibleDescription("That password is not right. Please try again.");
    expect(logout).not.toHaveBeenCalled();

    fireEvent.change(field, { target: { value: "again" } });
    expect(field).not.toHaveAttribute("aria-invalid");
  });

  it("shows LAST_SCHOOL_ADMIN's message in a banner", async () => {
    const message = "You are the only admin of your school. Make another admin first or contact Talim support.";
    service.requestDeletion.mockRejectedValueOnce(refusal(409, "LAST_SCHOOL_ADMIN", message));
    render(<DeleteAccountSection />);
    const dialog = await openSheet();
    complete(dialog);
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete account" }));

    expect(await within(dialog).findByRole("alert")).toHaveTextContent(message);
    expect(within(dialog).getByLabelText("Password")).not.toHaveAttribute("aria-invalid");
  });
});

describe("delete-account helpers", () => {
  it("builds the sign-in route and reads its notice back", () => {
    const route = deletionScheduledRoute(SCHEDULED.scheduledFor);
    expect(deletionNoticeFromSearch(route.slice(route.indexOf("?")))).toBe(
      "Your account will be deleted on 8 Nov 2026. Sign in before then to cancel.",
    );
    expect(deletionNoticeFromSearch("?deletionScheduledFor=nonsense")).toBeNull();
    expect(deletionNoticeFromSearch("")).toBeNull();
    expect(deletionScheduledMessage(undefined)).toBe("Your account will be deleted in 30 days. Sign in before then to cancel.");
  });

  it("falls back to its own copy when a refusal carries no message", () => {
    expect(deletionErrorMessage(refusal(403, "ADMIN_ACCOUNT", "")).banner).toBe("Talim platform admin accounts can't be deleted from here.");
    expect(deletionErrorMessage(new Error("boom")).banner).toBe("boom");
  });
});

describe("sign-in after a deletion request", () => {
  it("shows when the account will be deleted", async () => {
    window.history.replaceState({}, "", deletionScheduledRoute(SCHEDULED.scheduledFor));
    render(<LoginPage />, { user: null });
    expect(await screen.findByText("Your account will be deleted on 8 Nov 2026. Sign in before then to cancel.")).toBeInTheDocument();
  });

  it("links Privacy, Terms and Support in the footer", () => {
    plainRender(<SignInFooter supportEmail="support@mytalim.com" year={2026} />);
    const nav = screen.getByRole("navigation", { name: "Talim policies and support" });
    expect(within(nav).getByRole("link", { name: /Privacy/ })).toHaveAttribute("href", "https://www.mytalim.com/privacy");
    expect(within(nav).getByRole("link", { name: /Terms/ })).toHaveAttribute("href", "https://www.mytalim.com/terms");
    expect(within(nav).getByRole("link", { name: /Support/ })).toHaveAttribute("href", "https://www.mytalim.com/support");
  });
});

describe("AuthContext and the deletion", () => {
  const fetchMock = jest.fn();
  const teacher = {
    _id: "68c0a1b2c3d4e5f600000001",
    userId: "68c0a1b2c3d4e5f600000001",
    email: "teacher@talim.test",
    role: "teacher",
    firstName: "Ada",
    lastName: "Bello",
    schoolId: "68c0a1b2c3d4e5f6000000aa",
    schoolName: "Talim Test School",
  };

  /**
   * Builds a fetch response with a JSON body.
   *
   * @param status - HTTP status.
   * @param body - Body to serialise.
   * @returns The response.
   */
  const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

  /**
   * Buttons that sign in and sign out with a redirect.
   *
   * @returns The probe.
   */
  function Probe() {
    const { login, logout, isAuthenticated } = useAuth();
    return (
      <div>
        <span data-testid="state">{isAuthenticated ? "in" : "out"}</span>
        <button onClick={() => login({ email: teacher.email, password: "pw", deviceToken: "web", platform: "web" }).catch(() => undefined)}>sign in</button>
        <button onClick={() => void logout({ redirectTo: "/?deletionScheduledFor=x", sessionEnded: true })}>sign out</button>
      </div>
    );
  }

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
    localStorage.clear();
    sessionStorage.clear();
    sessionStore._resetForTests();
    apiClient.setAccessToken(null);
  });

  it("toasts the cancelled notice when login answers deletionCancelled: true", async () => {
    fetchMock
      .mockResolvedValueOnce(json(401, { error: { code: "UNAUTHENTICATED" } }))
      .mockResolvedValueOnce(json(200, { access_token: "token-1", deletionCancelled: true }))
      .mockResolvedValueOnce(json(200, { active: true, user: teacher }));
    plainRender(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByTestId("state")).toHaveTextContent("out"));
    await userEvent.click(screen.getByText("sign in"));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith(DELETION_CANCELLED_MESSAGE));
    expect(DELETION_CANCELLED_MESSAGE).toBe("Welcome back. Your account deletion has been cancelled.");
    expect(toast.success).not.toHaveBeenCalledWith("Login successful!");
  });

  it("signs out to the given sign-in URL and empties the query cache", async () => {
    localStorage.setItem("accessToken", "stored-token");
    fetchMock.mockResolvedValue(json(200, { active: true, user: teacher }));
    const client = new QueryClient();
    client.setQueryData(["settings", "teacher"], { profile: { firstName: "Ada" } });
    const stop = clearQueriesOnLogout(client);
    plainRender(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByTestId("state")).toHaveTextContent("in"));

    await act(async () => {
      await userEvent.click(screen.getByText("sign out"));
    });

    await waitFor(() => expect(push).toHaveBeenCalledWith("/?deletionScheduledFor=x"));
    // The server already ended the session: no logout call, push dropped locally only.
    const calls = fetchMock.mock.calls.map(([url]) => String(url));
    expect(calls.some((url) => url.endsWith("/auth/logout"))).toBe(false);
    expect(unsubscribeBrowserPush).toHaveBeenCalledWith("68c0a1b2c3d4e5f600000001", null);
    expect(screen.getByTestId("state")).toHaveTextContent("out");
    expect(localStorage.getItem("accessToken")).toBeNull();
    expect(client.getQueryData(["settings", "teacher"])).toBeUndefined();
    stop();
  });
});
