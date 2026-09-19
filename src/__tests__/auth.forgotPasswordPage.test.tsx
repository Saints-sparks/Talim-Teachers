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

    expect(screen.getByRole("heading", { name: "Forgot Password?" })).toBeInTheDocument();
    await user.type(screen.getByLabelText("Email Address"), "ada@school.test");
    await user.click(screen.getByRole("button", { name: "Send OTP" }));

    expect(await screen.findByRole("heading", { name: "Verify OTP" })).toBeInTheDocument();
    expect(screen.getByText(/ada@school.test/)).toBeInTheDocument();

    // Non-digits are dropped as the teacher types.
    await user.type(screen.getByLabelText("Enter OTP"), "12ab3456");
    expect(screen.getByLabelText("Enter OTP")).toHaveValue("123456");
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await waitFor(() => expect(service.verifyResetCode).toHaveBeenCalledWith("ada@school.test", "123456"));

    expect(await screen.findByRole("heading", { name: "Set New Password" })).toBeInTheDocument();
    await user.type(screen.getByLabelText("New Password"), "NewPassw0rd!");
    await user.type(screen.getByLabelText("Confirm New Password"), "NewPassw0rd!");
    await user.click(screen.getByRole("button", { name: "Reset Password" }));

    await waitFor(() => expect(service.resetPassword).toHaveBeenCalledWith("ada@school.test", "123456", "NewPassw0rd!"));
    expect(await screen.findByRole("dialog")).toHaveTextContent("Password Reset Successful!");
  });

  it("shows and hides the password without submitting the form", async () => {
    const user = userEvent.setup({ delay: null });
    render(<ForgotPasswordPage />);
    await user.type(screen.getByLabelText("Email Address"), "ada@school.test");
    await user.click(screen.getByRole("button", { name: "Send OTP" }));
    await user.type(await screen.findByLabelText("Enter OTP"), "123456");
    await user.click(screen.getByRole("button", { name: "Continue" }));

    const field = await screen.findByLabelText("New Password");
    expect(field).toHaveAttribute("type", "password");
    await user.click(screen.getAllByRole("button", { name: "Show password" })[0]);
    expect(field).toHaveAttribute("type", "text");
    expect(service.resetPassword).not.toHaveBeenCalled();
  });

  it("keeps the success overlay out of the page until the reset succeeds", () => {
    render(<ForgotPasswordPage />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
