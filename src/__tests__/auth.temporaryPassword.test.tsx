/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SetPasswordPage from "@/app/set-password/page";
import { AppProvider, useAppContext } from "@/app/context/AppContext";
import { fetchTeacherDetails } from "@/app/services/api.service";

const replace = jest.fn();
const router = { replace }; // one object: the page re-runs its effect when `router` changes identity
jest.mock("next/navigation", () => ({ useRouter: () => router }));
jest.mock("@/components/CustomToast", () => ({ toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }));
jest.mock("@/app/services/api.service", () => ({ fetchTeacherDetails: jest.fn() }));

const changePassword = jest.fn();
const updateUser = jest.fn();
let authUser: { userId: string; mustChangePassword?: boolean } | null = null;
jest.mock("@/app/hooks/useAuth", () => ({
  useAuth: () => ({ logout: jest.fn(), changePassword, updateUser }),
}));
jest.mock("@/app/context/AuthContext", () => ({
  useAuth: () => ({ user: authUser, accessToken: authUser ? "token" : null, updateUser }),
}));

const NEW_PASSWORD = "Sturdy#Pass2026";
const fetchDetails = fetchTeacherDetails as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  authUser = null;
  fetchDetails.mockResolvedValue({ assignedClasses: [{ _id: "c1" }], assignedCourses: [] });
  changePassword.mockResolvedValue(undefined);
});

describe("set-password page", () => {
  it("changes the password through the auth context, so the whole app sees the unlocked account", async () => {
    localStorage.setItem("user", JSON.stringify({ userId: "u1", firstName: "Temi", mustChangePassword: true }));
    const user = userEvent.setup({ delay: null });
    render(<SetPasswordPage />);

    await user.type(await screen.findByLabelText(/Temporary password/i), "Temp#Pass2026x");
    await user.type(screen.getByLabelText(/^New password/i), NEW_PASSWORD);
    await user.type(screen.getByLabelText(/Confirm/i), NEW_PASSWORD);
    await user.click(document.querySelector('form button[type="submit"]') as HTMLButtonElement);

    await waitFor(() => expect(changePassword).toHaveBeenCalledWith("Temp#Pass2026x", NEW_PASSWORD, NEW_PASSWORD));
    expect(updateUser).toHaveBeenCalledWith({ mustChangePassword: false });
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/onboarding"));
  });
});

/** Shows the roster the app context loaded, so a test can wait on it. */
function Roster() {
  const { classes } = useAppContext();
  return <p>{classes.length} classes</p>;
}

describe("AppProvider", () => {
  it("does not ask for the teacher record while a temporary password is in use", async () => {
    authUser = { userId: "u1", mustChangePassword: true };
    render(<AppProvider><Roster /></AppProvider>);
    await waitFor(() => expect(screen.getByText("0 classes")).toBeInTheDocument());
    expect(fetchDetails).not.toHaveBeenCalled();
  });

  it("loads it as soon as the password is replaced", async () => {
    authUser = { userId: "u1", mustChangePassword: true };
    const { rerender } = render(<AppProvider><Roster /></AppProvider>);
    expect(fetchDetails).not.toHaveBeenCalled();

    authUser = { userId: "u1", mustChangePassword: false };
    rerender(<AppProvider><Roster /></AppProvider>);
    await waitFor(() => expect(screen.getByText("1 classes")).toBeInTheDocument());
    expect(fetchDetails).toHaveBeenCalledTimes(1);
  });

  it("loads it for an ordinary teacher", async () => {
    authUser = { userId: "u1" };
    render(<AppProvider><Roster /></AppProvider>);
    await waitFor(() => expect(fetchDetails).toHaveBeenCalledWith("u1", "token"));
  });
});
