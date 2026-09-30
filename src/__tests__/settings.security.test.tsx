/**
 * @jest-environment jsdom
 */
import React from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@/test-utils/render";
import { SecurityPanel } from "@/components/settings/SecurityPanel";
import { ChangePasswordSheet, passwordChangeMessage } from "@/components/settings/ChangePasswordSheet";
import { accountService } from "@/app/services/account/account.service";
import { toast } from "@/components/CustomToast";
import { ApiError } from "@/lib/apiError";
import { makePasswordPolicyFixture, resetSettingsFixtureStore } from "@/lib/fixtures/settings.fixture";
import type { AuthSession } from "@/types/inboxSettings";

jest.mock("next/navigation", () => ({ useRouter: () => ({ push: jest.fn(), replace: jest.fn() }) }));
jest.mock("@/components/CustomToast", () => ({ toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }));
jest.mock("@/app/services/account/account.service", () => {
  const fixture = jest.requireActual("@/lib/fixtures/settings.fixture");
  return {
    accountService: {
      listSessions: jest.fn(async () => fixture.listSessionsFixture()),
      revokeSession: jest.fn(async (id: string) => fixture.revokeSessionFixture(id)),
      revokeOtherSessions: jest.fn(async () => fixture.revokeOtherSessionsFixture()),
      getPasswordPolicy: jest.fn(async () => fixture.makePasswordPolicyFixture()),
    },
  };
});

const service = accountService as jest.Mocked<typeof accountService>;
const NEW_PASSWORD = "Sturdy#Pass2026";

/**
 * The session row whose label is `label`.
 *
 * @param label - e.g. "Chrome 129 on Windows 11".
 * @returns The row element.
 */
const sessionRow = (label: string) => screen.getByText(label).closest("div.flex") as HTMLElement;

beforeEach(() => {
  jest.clearAllMocks();
  resetSettingsFixtureStore();
});

describe("Security → Sessions", () => {
  it("lists every signed-in device, with the This device pill on the current one and Sign out on the others", async () => {
    render(<SecurityPanel />);

    await screen.findByText("Chrome 129 on Windows 11");
    const current = sessionRow("Chrome 129 on Windows 11");
    expect(within(current).getByText("This device")).toBeInTheDocument();
    expect(within(current).getByText("Desktop · 102.89.34.12 · Active now")).toBeInTheDocument();
    expect(within(current).queryByRole("button", { name: /Sign out/ })).not.toBeInTheDocument();

    const phone = sessionRow("Talim app on iOS 18");
    expect(within(phone).getByText(/^iPhone · 105\.112\.7\.40 · Last active /)).toBeInTheDocument();
    expect(within(phone).getByRole("button", { name: "Sign out of Talim app on iOS 18" })).toBeInTheDocument();
    expect(within(sessionRow("Safari 17 on macOS")).getByRole("button", { name: /Sign out/ })).toBeInTheDocument();
    expect(screen.getAllByText("This device")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Sign out of other devices" })).toHaveAccessibleDescription("Ends every other session immediately");
  });

  it("signs one device out, toasts, and reloads the list", async () => {
    render(<SecurityPanel />);
    fireEvent.click(await screen.findByRole("button", { name: "Sign out of Safari 17 on macOS" }));

    await waitFor(() => expect(service.revokeSession).toHaveBeenCalledWith("sess-laptop"));
    await waitFor(() => expect(screen.queryByText("Safari 17 on macOS")).not.toBeInTheDocument());
    expect(toast.success).toHaveBeenCalledWith("Signed out of that device.");
    expect(service.listSessions).toHaveBeenCalledTimes(2);
  });

  it("signs out every other device only after the confirmation", async () => {
    render(<SecurityPanel />);
    fireEvent.click(await screen.findByRole("button", { name: "Sign out of other devices" }));

    const dialog = await screen.findByRole("dialog", { name: "Sign out of other devices?" });
    expect(dialog).toHaveTextContent("The other 2 devices signed in to your account will be signed out now. This device stays signed in.");
    expect(service.revokeOtherSessions).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(service.revokeOtherSessions).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Sign out of other devices" }));
    fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Sign out" }));

    await waitFor(() => expect(service.revokeOtherSessions).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Signed out of 2 other devices."));
    await waitFor(() => expect(screen.queryByText("Talim app on iOS 18")).not.toBeInTheDocument());
    expect(screen.getByText("Chrome 129 on Windows 11")).toBeInTheDocument();
    // Nothing left to sign out.
    expect(screen.queryByRole("button", { name: "Sign out of other devices" })).not.toBeInTheDocument();
  });

  it("shows every session with Sign out and no badge when the current one can't be identified", async () => {
    const unknown: AuthSession[] = [
      { id: "a", device: null, browser: null, os: null, ip: null, lastUsedAt: "2026-09-20T10:00:00.000Z", createdAt: "2026-09-01T10:00:00.000Z", current: false },
      { id: "b", device: "Desktop", browser: "Edge 128", os: "Windows 10", ip: null, lastUsedAt: "2026-09-21T10:00:00.000Z", createdAt: "2026-09-01T10:00:00.000Z", current: false },
    ];
    service.listSessions.mockResolvedValueOnce(unknown);
    render(<SecurityPanel />);

    expect(await screen.findByText("Unknown browser on Unknown device")).toBeInTheDocument();
    expect(screen.queryByText("This device")).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /^Sign out of (Unknown|Edge)/ })).toHaveLength(2);
    expect(screen.queryByRole("button", { name: "Sign out of other devices" })).not.toBeInTheDocument();
  });

  it("shows loading and error states for the sessions", async () => {
    service.listSessions.mockReturnValueOnce(new Promise(() => undefined));
    const { unmount } = render(<SecurityPanel />);
    expect(screen.getByRole("status", { name: "Loading your signed-in devices" })).toBeInTheDocument();
    unmount();

    service.listSessions.mockRejectedValueOnce(new Error("Server down"));
    render(<SecurityPanel />);
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("We could not load your signed-in devices.");
    fireEvent.click(within(alert).getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("Chrome 129 on Windows 11")).toBeInTheDocument();
  });

  it("has no two-step sign-in", async () => {
    render(<SecurityPanel />);
    await screen.findByText("Chrome 129 on Windows 11");
    expect(screen.queryByText(/two-step/i)).not.toBeInTheDocument();
  });
});

describe("Security → Change password", () => {
  it("describes the server's policy on the row and opens the sheet", async () => {
    render(<SecurityPanel />);
    const row = screen.getByRole("button", { name: "Change password" });
    await waitFor(() => expect(row).toHaveAccessibleDescription("At least 8 characters, with upper and lower case letters, a number and a symbol"));

    fireEvent.click(row);
    const dialog = await screen.findByRole("dialog", { name: "Change password" });
    expect(within(dialog).getByText("Security")).toBeInTheDocument();
    expect(within(dialog).getByLabelText("New password")).toHaveAttribute("placeholder", "At least 8 characters, with upper and lower case letters, a number and a symbol");
  });

  it("keeps Update password off until the fields meet the policy, saying what is missing", async () => {
    render(<ChangePasswordSheet open onOpenChange={jest.fn()} policy={makePasswordPolicyFixture()} />);
    const update = screen.getByRole("button", { name: "Update password" });
    const current = screen.getByLabelText("Current password");
    const next = screen.getByLabelText("New password");
    const confirm = screen.getByLabelText("Confirm new password");

    expect(current).toHaveAttribute("autocomplete", "current-password");
    expect(next).toHaveAttribute("autocomplete", "new-password");
    expect(confirm).toHaveAttribute("autocomplete", "new-password");
    expect(update).toBeDisabled();
    expect(screen.getByText("You will stay signed in on this device.")).toBeInTheDocument();
    expect(screen.getByText("You can't reuse your last 5 passwords.")).toBeInTheDocument();

    fireEvent.change(current, { target: { value: "Old#Pass2025" } });
    fireEvent.change(next, { target: { value: "short" } });
    expect(screen.getByText("Use at least 8 characters.")).toBeInTheDocument();
    fireEvent.change(next, { target: { value: "sturdypass" } });
    expect(screen.getByText("Include an uppercase letter.")).toBeInTheDocument();
    fireEvent.change(next, { target: { value: "Sturdypass2026" } });
    expect(screen.getByText("Include a symbol such as ! @ # $ or %.")).toBeInTheDocument();
    fireEvent.change(next, { target: { value: NEW_PASSWORD } });
    fireEvent.change(confirm, { target: { value: "Sturdy#Pass" } });
    expect(screen.getByText("The two new passwords do not match yet.")).toBeInTheDocument();
    expect(update).toBeDisabled();

    fireEvent.change(confirm, { target: { value: NEW_PASSWORD } });
    expect(screen.getByText("Looks good.")).toBeInTheDocument();
    expect(update).toBeEnabled();
    expect(next).toHaveAccessibleDescription(/Looks good\./);
  });

  it("falls back to the built-in rules when the policy can't load", async () => {
    render(<ChangePasswordSheet open onOpenChange={jest.fn()} policy={undefined} />);
    fireEvent.change(screen.getByLabelText("Current password"), { target: { value: "Old#Pass2025" } });
    fireEvent.change(screen.getByLabelText("New password"), { target: { value: "Sturdypass2026" } });
    fireEvent.change(screen.getByLabelText("Confirm new password"), { target: { value: "Sturdypass2026" } });
    expect(screen.getByText("Include a symbol such as ! @ # $ or %.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Update password" })).toBeDisabled();
    expect(screen.queryByText(/can't reuse/)).not.toBeInTheDocument();
  });

  it("changes the password through the auth context, then shows the done state and refreshes the sessions", async () => {
    const changePassword = jest.fn().mockResolvedValue(undefined);
    const onChanged = jest.fn();
    const onOpenChange = jest.fn();
    render(<ChangePasswordSheet open onOpenChange={onOpenChange} policy={makePasswordPolicyFixture()} onChanged={onChanged} />, { auth: { changePassword } });

    fireEvent.change(screen.getByLabelText("Current password"), { target: { value: "Old#Pass2025" } });
    fireEvent.change(screen.getByLabelText("New password"), { target: { value: NEW_PASSWORD } });
    fireEvent.change(screen.getByLabelText("Confirm new password"), { target: { value: NEW_PASSWORD } });
    fireEvent.click(screen.getByRole("button", { name: "Update password" }));

    await waitFor(() => expect(changePassword).toHaveBeenCalledWith("Old#Pass2025", NEW_PASSWORD, NEW_PASSWORD));
    expect(await screen.findByText("Password updated")).toBeInTheDocument();
    expect(screen.getByText("Use your new password next time you sign in. Other devices have been signed out.")).toBeInTheDocument();
    expect(onChanged).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("shows why a change failed, keeping the form", async () => {
    const changePassword = jest.fn().mockRejectedValue(ApiError.fromResponse({ status: 401 }, { error: { code: "UNAUTHENTICATED", message: "Invalid credentials" } }));
    render(<ChangePasswordSheet open onOpenChange={jest.fn()} policy={makePasswordPolicyFixture()} />, { auth: { changePassword } });

    fireEvent.change(screen.getByLabelText("Current password"), { target: { value: "Wrong#Pass1" } });
    fireEvent.change(screen.getByLabelText("New password"), { target: { value: NEW_PASSWORD } });
    fireEvent.change(screen.getByLabelText("Confirm new password"), { target: { value: NEW_PASSWORD } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Update password" }));
    });

    expect(await screen.findByRole("alert")).toHaveTextContent("That current password is not right. Please try again.");
    expect(screen.getByLabelText("New password")).toHaveValue(NEW_PASSWORD);
    expect(screen.queryByText("Password updated")).not.toBeInTheDocument();
  });
});

describe("passwordChangeMessage", () => {
  it("prefers the field the server named, then the error code", () => {
    const named = ApiError.fromResponse(
      { status: 400 },
      { error: { code: "VALIDATION_FAILED", message: "Some fields need attention.", details: [{ field: "newPassword", reason: "You used this password recently" }] } },
    );
    expect(passwordChangeMessage(named)).toBe("You used this password recently");
    expect(passwordChangeMessage(ApiError.fromResponse({ status: 429 }, { error: { code: "RATE_LIMITED", message: "Slow down" } }))).toBe(
      "Too many attempts. Please wait a moment and try again.",
    );
    expect(passwordChangeMessage(new TypeError("Failed to fetch"))).toBe("Failed to update password.");
  });
});
