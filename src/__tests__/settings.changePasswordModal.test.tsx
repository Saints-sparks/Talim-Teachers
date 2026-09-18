/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ChangePasswordModal from "@/components/settings/ChangePasswordModal";
import { authService } from "@/app/services/auth.service";

jest.mock("@/components/CustomToast", () => ({
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

jest.mock("@/app/services/auth.service", () => ({
  authService: { changePassword: jest.fn() },
}));

describe("ChangePasswordModal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("blocks submission when the new passwords do not match", async () => {
    const user = userEvent.setup();
    render(<ChangePasswordModal onClose={jest.fn()} />);

    await user.type(screen.getByLabelText("Current Password"), "temp-pass-1");
    await user.type(screen.getByLabelText("New Password"), "NewPassw0rd!");
    await user.type(screen.getByLabelText("Confirm New Password"), "Different1!");
    await user.click(screen.getByRole("button", { name: /update password/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/do not match/i);
    expect(authService.changePassword).not.toHaveBeenCalled();
  });

  it("blocks submission when the new password fails the policy", async () => {
    const user = userEvent.setup();
    render(<ChangePasswordModal onClose={jest.fn()} />);

    await user.type(screen.getByLabelText("Current Password"), "temp-pass-1");
    await user.type(screen.getByLabelText("New Password"), "short");
    await user.type(screen.getByLabelText("Confirm New Password"), "short");
    await user.click(screen.getByRole("button", { name: /update password/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/doesn't meet every requirement/i);
    expect(authService.changePassword).not.toHaveBeenCalled();
  });

  it("calls the service and closes on a valid change", async () => {
    (authService.changePassword as jest.Mock).mockResolvedValue({ access_token: "t", message: "ok" });
    const onClose = jest.fn();
    const user = userEvent.setup();
    render(<ChangePasswordModal onClose={onClose} />);

    await user.type(screen.getByLabelText("Current Password"), "temp-pass-1");
    await user.type(screen.getByLabelText("New Password"), "NewPassw0rd!");
    await user.type(screen.getByLabelText("Confirm New Password"), "NewPassw0rd!");
    await user.click(screen.getByRole("button", { name: /update password/i }));

    await waitFor(() => expect(authService.changePassword).toHaveBeenCalledWith("temp-pass-1", "NewPassw0rd!", "NewPassw0rd!"));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});
