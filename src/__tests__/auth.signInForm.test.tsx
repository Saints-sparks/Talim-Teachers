/**
 * @jest-environment jsdom
 *
 * The redesigned sign-in page, rendered inside the real AuthProvider with the
 * auth service mocked: empty fields are caught before anything is sent and
 * tied to their fields, and each refused sign-in is explained the way it
 * always was (the e2e specs look for the same sentences).
 */
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LoginPage from "@/app/page";
import { AuthProvider } from "@/app/context/AuthContext";
import { authService } from "@/app/services/auth.service";
import { ApiError } from "@/lib/apiError";
import { classifyLoginError, validateSignIn } from "@/hooks/auth/signIn.logic";

const replace = jest.fn();
const push = jest.fn();
jest.mock("next/navigation", () => ({ useRouter: () => ({ replace, push }) }));
jest.mock("@/components/CustomToast", () => ({ toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }));
jest.mock("@/lib/webPushSync", () => ({
  unsubscribeWebPushOnLogout: jest.fn().mockResolvedValue(undefined),
  unsubscribeBrowserPush: jest.fn().mockResolvedValue(undefined),
  startWebPushSync: jest.fn(() => () => undefined),
}));
jest.mock("@/app/services/auth.service", () => ({
  authService: { login: jest.fn(), introspect: jest.fn(), refresh: jest.fn(), logout: jest.fn(), changePassword: jest.fn() },
}));

const service = authService as jest.Mocked<typeof authService>;

const teacher = {
  _id: "68c0a1b2c3d4e5f600000001",
  userId: "68c0a1b2c3d4e5f600000001",
  email: "tolu@school.test",
  role: "teacher",
  firstName: "Tolu",
  lastName: "Ade",
  schoolId: "68c0a1b2c3d4e5f6000000aa",
};

/**
 * Renders the sign-in page with the session provider and waits for the
 * restore attempt (no stored session) to settle.
 *
 * @returns The user-event instance.
 */
async function renderSignIn() {
  const user = userEvent.setup({ delay: null });
  render(
    <AuthProvider>
      <LoginPage />
    </AuthProvider>,
  );
  await waitFor(() => expect(service.refresh).toHaveBeenCalled());
  // The page shows a status line, not the form, until the session restore settles.
  await screen.findByRole("button", { name: "Sign in" });
  return user;
}

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  sessionStorage.clear();
  service.refresh.mockRejectedValue(new ApiError("UNAUTHENTICATED", "No session", 401));
});

describe("sign-in validation", () => {
  it("requires both fields before anything is sent", () => {
    expect(validateSignIn({ identifier: "  ", password: "" })).toEqual({
      identifier: "Enter your email or staff number.",
      password: "Enter your password.",
    });
    expect(validateSignIn({ identifier: "ESEC-260200001", password: " secret " })).toEqual({});
  });

  it("shows each error under its field, ties it with aria-describedby and focuses the first", async () => {
    const user = await renderSignIn();
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    const identifier = screen.getByLabelText("Email or staff number");
    expect(identifier).toHaveAttribute("aria-invalid", "true");
    expect(identifier).toHaveAccessibleDescription(/Enter your email or staff number\./);
    expect(identifier).toHaveFocus();
    const password = screen.getByLabelText("Password");
    expect(password).toHaveAccessibleDescription("Enter your password.");
    expect(service.login).not.toHaveBeenCalled();

    // Typing clears that field's error; the other one stays until it is fixed.
    await user.type(identifier, "tolu@school.test");
    expect(identifier).not.toHaveAttribute("aria-invalid");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(password).toHaveFocus();
    expect(service.login).not.toHaveBeenCalled();
  });

  it("has the autocomplete hints password managers need", async () => {
    await renderSignIn();
    expect(screen.getByLabelText("Email or staff number")).toHaveAttribute("autocomplete", "username");
    expect(screen.getByLabelText("Password")).toHaveAttribute("autocomplete", "current-password");
    expect(screen.getByLabelText("Email or staff number")).toHaveAttribute("id", "identifier");
    expect(screen.getByLabelText("Password")).toHaveAttribute("id", "password");
  });

  it("shows and hides the password without sending the form", async () => {
    const user = await renderSignIn();
    const password = screen.getByLabelText("Password");
    expect(password).toHaveAttribute("type", "password");
    await user.click(screen.getByRole("button", { name: "Show password" }));
    expect(password).toHaveAttribute("type", "text");
    await user.click(screen.getByRole("button", { name: "Hide password" }));
    expect(password).toHaveAttribute("type", "password");
    expect(service.login).not.toHaveBeenCalled();
  });
});

describe("a refused sign-in", () => {
  /**
   * Fills the form and sends it.
   *
   * @param user - The user-event instance.
   * @param identifier - Email or staff number.
   * @param password - Password.
   */
  async function signIn(user: ReturnType<typeof userEvent.setup>, identifier = "tolu@school.test", password = "Wrong#Pass1") {
    await user.type(screen.getByLabelText("Email or staff number"), identifier);
    await user.type(screen.getByLabelText("Password"), password);
    await user.click(screen.getByRole("button", { name: "Sign in" }));
  }

  it("explains a wrong password in the banner and marks the fields", async () => {
    service.login.mockRejectedValue(new ApiError("UNAUTHENTICATED", "Invalid credentials", 401));
    const user = await renderSignIn();
    await signIn(user, "  tolu@school.test ");

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Incorrect email, staff number, or password. Please double-check your credentials and try again.");
    expect(service.login).toHaveBeenCalledWith(
      expect.objectContaining({ identifier: "tolu@school.test", email: "tolu@school.test", password: "Wrong#Pass1", platform: "web" }),
    );
    expect(screen.getByLabelText("Password")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Password")).toHaveAccessibleDescription(/Incorrect email, staff number, or password/);
    expect(replace).not.toHaveBeenCalled();
  });

  it("refuses a student account with 'Access denied' and the role", async () => {
    service.login.mockResolvedValue({ access_token: "t" } as never);
    service.introspect.mockResolvedValue({ active: true, user: { ...teacher, role: "student" } } as never);
    const user = await renderSignIn();
    await signIn(user, "ada@school.test", "Right#Pass1");

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Access denied");
    expect(alert).toHaveTextContent(/registered as "student"/);
    expect(replace).not.toHaveBeenCalled();
    expect(localStorage.getItem("accessToken")).toBeNull();
  });

  it("shows any other failure as the server said it", async () => {
    service.login.mockRejectedValue(new ApiError("SERVICE_UNAVAILABLE", "The server is having a moment", 503));
    const user = await renderSignIn();
    await signIn(user);
    expect(await screen.findByRole("alert")).toHaveTextContent("The server is having a moment");
  });

  it("clears the banner on the next attempt, and a right password routes on", async () => {
    service.login.mockRejectedValueOnce(new ApiError("UNAUTHENTICATED", "Invalid credentials", 401));
    service.login.mockResolvedValueOnce({ access_token: "t" } as never);
    service.introspect.mockResolvedValue({ active: true, user: teacher } as never);
    const user = await renderSignIn();
    await signIn(user);
    expect(await screen.findByRole("alert")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/onboarding"));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("classifyLoginError", () => {
  it("sorts messages the way the page always has", () => {
    expect(classifyLoginError(new Error('Access denied. Your account is registered as "parent".'))).toEqual({
      kind: "access_denied",
      message: 'Access denied. Your account is registered as "parent".',
    });
    expect(classifyLoginError(new Error("Incorrect email or password."))).toEqual({ kind: "invalid_credentials" });
    expect(classifyLoginError(new Error("Network down"))).toEqual({ kind: "unknown", message: "Network down" });
    expect(classifyLoginError("nope")).toEqual({ kind: "unknown", message: "An unexpected error occurred. Please try again." });
  });
});

describe("the signed-out card", () => {
  it("has the design's heading, line and footnote", async () => {
    await renderSignIn();
    expect(screen.getByRole("heading", { level: 1, name: "Welcome back" })).toBeInTheDocument();
    expect(screen.getByText("Teachers see only the classes and subjects the school has assigned to them.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Forgot password?" })).toHaveAttribute("href", "/forgot-password");
    expect(screen.getByLabelText(/Keep me signed in/)).not.toBeChecked();
  });
});
