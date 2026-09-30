/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ForgotPasswordPage from "@/app/forgot-password/page";
import { authService } from "@/app/services/auth.service";

jest.mock("next/navigation", () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock("@/components/CustomToast", () => ({ toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }));
jest.mock("@/app/services/auth.service", () => ({
  authService: { forgotPassword: jest.fn(), verifyResetCode: jest.fn(), resetPassword: jest.fn() },
}));

const service = authService as jest.Mocked<typeof authService>;

// The walk types into several fields; give it room when the suite runs under load.
jest.setTimeout(30_000);

beforeEach(() => {
  jest.clearAllMocks();
  service.forgotPassword.mockResolvedValue({ message: "sent" });
  service.verifyResetCode.mockResolvedValue({ valid: true });
  service.resetPassword.mockResolvedValue({ message: "done" });
});

describe("ForgotPasswordPage", () => {
  it("walks email, code and password, calling the real reset endpoints in order", async () => {
    const user = userEvent.setup({ delay: null });
    render(<ForgotPasswordPage />);

    expect(screen.getByRole("heading", { name: "Reset your password" })).toBeInTheDocument();
    await user.type(screen.getByLabelText("Email address"), "ada@school.test");
    await user.click(screen.getByRole("button", { name: "Send code" }));

    expect(await screen.findByRole("heading", { name: "Enter the code" })).toBeInTheDocument();
    expect(screen.getByText(/ada@school.test/)).toBeInTheDocument();

    // Non-digits are dropped as the teacher types.
    await user.type(screen.getByLabelText("6-digit code"), "12ab3456");
    expect(screen.getByLabelText("6-digit code")).toHaveValue("123456");
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await waitFor(() => expect(service.verifyResetCode).toHaveBeenCalledWith("ada@school.test", "123456"));

    expect(await screen.findByRole("heading", { name: "Choose a new password" })).toBeInTheDocument();
    await user.type(screen.getByLabelText("New password"), "NewPassw0rd!");
    await user.type(screen.getByLabelText("Confirm new password"), "NewPassw0rd!");
    await user.click(screen.getByRole("button", { name: "Reset password" }));

    await waitFor(() => expect(service.resetPassword).toHaveBeenCalledWith("ada@school.test", "123456", "NewPassw0rd!"));
    expect(await screen.findByRole("dialog")).toHaveTextContent("Password reset");
  });

  it("shows and hides the password without submitting the form", async () => {
    const user = userEvent.setup({ delay: null });
    render(<ForgotPasswordPage />);
    await user.type(screen.getByLabelText("Email address"), "ada@school.test");
    await user.click(screen.getByRole("button", { name: "Send code" }));
    await user.type(await screen.findByLabelText("6-digit code"), "123456");
    await user.click(screen.getByRole("button", { name: "Continue" }));

    const field = await screen.findByLabelText("New password");
    expect(field).toHaveAttribute("type", "password");
    await user.click(screen.getAllByRole("button", { name: "Show password" })[0]);
    expect(field).toHaveAttribute("type", "text");
    expect(service.resetPassword).not.toHaveBeenCalled();
  });

  it("keeps the success overlay out of the page until the reset succeeds", () => {
    render(<ForgotPasswordPage />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("ties the errors to their fields: an empty email, a short code, a confirmation that differs", async () => {
    const user = userEvent.setup({ delay: null });
    render(<ForgotPasswordPage />);

    await user.click(screen.getByRole("button", { name: "Send code" }));
    const email = screen.getByLabelText("Email address");
    expect(email).toHaveAttribute("aria-invalid", "true");
    expect(email).toHaveAccessibleDescription("Enter your email address.");
    expect(email).toHaveAttribute("autocomplete", "email");
    expect(service.forgotPassword).not.toHaveBeenCalled();

    await user.type(email, "ada@school.test");
    expect(email).not.toHaveAttribute("aria-invalid");
    await user.click(screen.getByRole("button", { name: "Send code" }));

    const code = await screen.findByLabelText("6-digit code");
    expect(code).toHaveAttribute("autocomplete", "one-time-code");
    await user.type(code, "123");
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(code).toHaveAccessibleDescription(/Enter the 6-digit code from your email\./);
    expect(service.verifyResetCode).not.toHaveBeenCalled();
    await user.type(code, "456");
    await user.click(screen.getByRole("button", { name: "Continue" }));

    const next = await screen.findByLabelText("New password");
    expect(next).toHaveAttribute("autocomplete", "new-password");
    await user.type(next, "NewPassw0rd!");
    await user.type(screen.getByLabelText("Confirm new password"), "NewPassw0rd?");
    expect(screen.getByLabelText("Confirm new password")).toHaveAccessibleDescription("Passwords do not match");
    expect(screen.getByLabelText("Confirm new password")).toHaveAttribute("aria-invalid", "true");
  });

  it("flags a password that misses a rule under the field when it is sent", async () => {
    const user = userEvent.setup({ delay: null });
    render(<ForgotPasswordPage />);
    await user.type(screen.getByLabelText("Email address"), "ada@school.test");
    await user.click(screen.getByRole("button", { name: "Send code" }));
    await user.type(await screen.findByLabelText("6-digit code"), "123456");
    await user.click(screen.getByRole("button", { name: "Continue" }));

    const next = await screen.findByLabelText("New password");
    await user.type(next, "short");
    await user.type(screen.getByLabelText("Confirm new password"), "short");
    await user.click(screen.getByRole("button", { name: "Reset password" }));
    expect(next).toHaveAccessibleDescription(/doesn't meet every rule yet/);
    expect(service.resetPassword).not.toHaveBeenCalled();
  });

  it("steps back with the Back button, and from the first step to sign in", async () => {
    const user = userEvent.setup({ delay: null });
    render(<ForgotPasswordPage />);
    expect(screen.getByText("Step 1 of 3")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Email address"), "ada@school.test");
    await user.click(screen.getByRole("button", { name: "Send code" }));
    expect(await screen.findByText("Step 2 of 3")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Change email" }));
    expect(screen.getByRole("heading", { name: "Reset your password" })).toBeInTheDocument();
    expect(screen.getByLabelText("Email address")).toHaveValue("ada@school.test");
  });
});
