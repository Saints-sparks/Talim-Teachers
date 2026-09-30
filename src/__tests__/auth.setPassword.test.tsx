/**
 * @jest-environment jsdom
 *
 * The first-sign-in password change: its rules checklist, when the button
 * unlocks, and how the server's answers are shown.
 */
import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SetPasswordPage from "@/app/set-password/page";
import { ApiError } from "@/lib/apiError";

const replace = jest.fn();
const router = { replace };
jest.mock("next/navigation", () => ({ useRouter: () => router }));
jest.mock("@/components/CustomToast", () => ({ toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }));

const changePassword = jest.fn();
const updateUser = jest.fn();
const logout = jest.fn();
jest.mock("@/app/hooks/useAuth", () => ({ useAuth: () => ({ logout, changePassword, updateUser }) }));

const STRONG = "Sturdy#Pass2026";

/**
 * Renders the page for a teacher on a temporary password.
 *
 * @returns The user-event instance.
 */
async function renderPage() {
  localStorage.setItem("user", JSON.stringify({ userId: "u1", firstName: "Temi", mustChangePassword: true }));
  const user = userEvent.setup({ delay: null });
  render(<SetPasswordPage />);
  await screen.findByRole("heading", { level: 1, name: "Set your password" });
  return user;
}

const submit = () => screen.getByRole("button", { name: "Set password and continue" });

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  changePassword.mockResolvedValue(undefined);
});

describe("set-password rules", () => {
  it("greets the teacher and ticks each rule of the policy as it is met", async () => {
    const user = await renderPage();
    expect(screen.getByText(/Hi Temi, your school created this account with a temporary password/)).toBeInTheDocument();

    const rules = screen.getByRole("list", { name: "Password rules" });
    expect(within(rules).getAllByText(/^Not yet:/)).toHaveLength(5);

    await user.type(screen.getByLabelText("New password"), "abcdefgh");
    expect(within(rules).getAllByText(/^Met:/)).toHaveLength(2); // length and lower case
    await user.type(screen.getByLabelText("New password"), "A1!");
    expect(within(rules).getAllByText(/^Met:/)).toHaveLength(5);
    expect(screen.getByLabelText("New password")).toHaveAccessibleDescription(/At least 8 characters/);
  });

  it("keeps the button disabled until the temporary password is in, every rule is met and the confirmation matches", async () => {
    const user = await renderPage();
    expect(submit()).toBeDisabled();

    await user.type(screen.getByLabelText("Temporary password"), "Temp#Pass2026x");
    await user.type(screen.getByLabelText("New password"), "weakpass");
    await user.type(screen.getByLabelText("Confirm new password"), "weakpass");
    expect(submit()).toBeDisabled();

    await user.clear(screen.getByLabelText("New password"));
    await user.type(screen.getByLabelText("New password"), STRONG);
    expect(submit()).toBeDisabled(); // the confirmation still says "weakpass"
    const confirm = screen.getByLabelText("Confirm new password");
    expect(confirm).toHaveAttribute("aria-invalid", "true");
    expect(confirm).toHaveAccessibleDescription("Passwords do not match");

    await user.clear(confirm);
    await user.type(confirm, STRONG);
    expect(confirm).not.toHaveAttribute("aria-invalid");
    expect(submit()).toBeEnabled();

    await user.click(submit());
    await waitFor(() => expect(changePassword).toHaveBeenCalledWith("Temp#Pass2026x", STRONG, STRONG));
    expect(updateUser).toHaveBeenCalledWith({ mustChangePassword: false });
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/onboarding"));
  });

  it("puts the server's field errors under their fields", async () => {
    changePassword.mockRejectedValue(
      new ApiError("VALIDATION_FAILED", "Validation failed", 400, [{ field: "currentPassword", reason: "The temporary password is wrong." }]),
    );
    const user = await renderPage();
    await user.type(screen.getByLabelText("Temporary password"), "Wrong#Temp1");
    await user.type(screen.getByLabelText("New password"), STRONG);
    await user.type(screen.getByLabelText("Confirm new password"), STRONG);
    await user.click(submit());

    const current = screen.getByLabelText("Temporary password");
    await waitFor(() => expect(current).toHaveAttribute("aria-invalid", "true"));
    expect(current).toHaveAccessibleDescription("The temporary password is wrong.");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it("shows any other failure above the form", async () => {
    changePassword.mockRejectedValue(new ApiError("SERVICE_UNAVAILABLE", "Try again in a minute.", 503));
    const user = await renderPage();
    await user.type(screen.getByLabelText("Temporary password"), "Temp#Pass2026x");
    await user.type(screen.getByLabelText("New password"), STRONG);
    await user.type(screen.getByLabelText("Confirm new password"), STRONG);
    await user.click(submit());
    expect(await screen.findByRole("alert")).toHaveTextContent("Try again in a minute.");
  });

  it("shows and hides all three passwords with one toggle, which never submits", async () => {
    const user = await renderPage();
    const fields = [screen.getByLabelText("Temporary password"), screen.getByLabelText("New password"), screen.getByLabelText("Confirm new password")];
    fields.forEach((f) => expect(f).toHaveAttribute("type", "password"));
    await user.click(screen.getByRole("button", { name: "Show passwords" }));
    fields.forEach((f) => expect(f).toHaveAttribute("type", "text"));
    expect(screen.getByRole("button", { name: "Hide passwords" })).toHaveAttribute("type", "button");
    expect(changePassword).not.toHaveBeenCalled();
  });

  it("uses the autocomplete hints a password manager needs", async () => {
    await renderPage();
    expect(screen.getByLabelText("Temporary password")).toHaveAttribute("autocomplete", "current-password");
    expect(screen.getByLabelText("New password")).toHaveAttribute("autocomplete", "new-password");
    expect(screen.getByLabelText("Confirm new password")).toHaveAttribute("autocomplete", "new-password");
  });

  it("sends a teacher who has already set a password on", async () => {
    localStorage.setItem("user", JSON.stringify({ userId: "u1", mustChangePassword: false }));
    render(<SetPasswordPage />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/onboarding"));
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
  });
});
