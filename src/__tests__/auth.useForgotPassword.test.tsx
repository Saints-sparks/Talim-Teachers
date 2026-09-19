/**
 * @jest-environment jsdom
 */
import { act, renderHook } from "@testing-library/react";
import type { FormEvent } from "react";
import { ApiError } from "@/lib/apiError";
import { authService } from "@/app/services/auth.service";
import { REDIRECT_DELAY_MS, useForgotPassword } from "@/hooks/auth/useForgotPassword";
import { toast } from "@/components/CustomToast";

const push = jest.fn();
jest.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
jest.mock("@/components/CustomToast", () => ({ toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }));
jest.mock("@/app/services/auth.service", () => ({
  authService: { forgotPassword: jest.fn(), verifyResetCode: jest.fn(), resetPassword: jest.fn() },
}));

const service = authService as jest.Mocked<typeof authService>;
const submit = { preventDefault: jest.fn() } as unknown as FormEvent<HTMLFormElement>;
const STRONG = "NewPassw0rd!";

/**
 * Drives the hook to the second step with an email typed in.
 *
 * @returns The hook's render result.
 */
async function atOtpStep() {
  const hook = renderHook(() => useForgotPassword());
  act(() => hook.result.current.setEmail("ada@school.test"));
  await act(async () => hook.result.current.submitEmail(submit));
  return hook;
}

/**
 * Drives the hook to the third step with a code that verified.
 *
 * @returns The hook's render result.
 */
async function atPasswordStep() {
  const hook = await atOtpStep();
  act(() => hook.result.current.setOtp("123456"));
  await act(async () => hook.result.current.submitCode(submit));
  return hook;
}

beforeEach(() => {
  jest.clearAllMocks();
  service.forgotPassword.mockResolvedValue({ message: "sent" });
  service.verifyResetCode.mockResolvedValue({ valid: true });
  service.resetPassword.mockResolvedValue({ message: "done" });
});

describe("useForgotPassword", () => {
  it("refuses an empty email without calling the server", async () => {
    const { result } = renderHook(() => useForgotPassword());
    await act(async () => result.current.submitEmail(submit));

    expect(toast.error).toHaveBeenCalledWith("Please enter your email address");
    expect(service.forgotPassword).not.toHaveBeenCalled();
    expect(result.current.step).toBe("email");
  });

  it("sends the code and moves to the code step", async () => {
    const { result } = await atOtpStep();

    expect(service.forgotPassword).toHaveBeenCalledWith("ada@school.test");
    expect(result.current.step).toBe("otp");
    expect(toast.success).toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
  });

  it("stays on the email step and explains a rate limit", async () => {
    service.forgotPassword.mockRejectedValue(new ApiError("RATE_LIMITED", "slow down", 429));
    const { result } = await atOtpStep();

    expect(result.current.step).toBe("email");
    expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/too many attempts/i));
    expect(result.current.loading).toBe(false);
  });

  it("resends the code from the code step", async () => {
    const { result } = await atOtpStep();
    await act(async () => result.current.resendCode());

    expect(service.forgotPassword).toHaveBeenCalledTimes(2);
    expect(result.current.step).toBe("otp");
  });

  it("checks the code with the server before asking for a password", async () => {
    const { result } = await atOtpStep();

    act(() => result.current.setOtp("12345"));
    await act(async () => result.current.submitCode(submit));
    expect(service.verifyResetCode).not.toHaveBeenCalled();
    expect(result.current.step).toBe("otp");

    act(() => result.current.setOtp("123456"));
    await act(async () => result.current.submitCode(submit));
    expect(service.verifyResetCode).toHaveBeenCalledWith("ada@school.test", "123456");
    expect(result.current.step).toBe("newPassword");
  });

  it("keeps a wrong code on the code step with the server's reason", async () => {
    service.verifyResetCode.mockRejectedValue(
      new ApiError("VALIDATION_FAILED", "Some fields need attention.", 400, [{ field: "token", reason: "That code has expired" }]),
    );
    const { result } = await atOtpStep();
    act(() => result.current.setOtp("123456"));
    await act(async () => result.current.submitCode(submit));

    expect(result.current.step).toBe("otp");
    expect(toast.error).toHaveBeenCalledWith("That code has expired");
  });

  it("rejects a weak or mismatched password before calling the server", async () => {
    const { result } = await atPasswordStep();

    act(() => {
      result.current.setNewPassword("short");
      result.current.setConfirmPassword("short");
    });
    await act(async () => result.current.submitPassword(submit));
    expect(toast.error).toHaveBeenCalledWith("Your new password doesn't meet every requirement.");

    act(() => {
      result.current.setNewPassword(STRONG);
      result.current.setConfirmPassword("Different1!");
    });
    await act(async () => result.current.submitPassword(submit));
    expect(toast.error).toHaveBeenCalledWith("Passwords do not match");
    expect(service.resetPassword).not.toHaveBeenCalled();
  });

  it("sends the verified code with the new password, then redirects to sign in after the confirmation", async () => {
    jest.useFakeTimers();
    try {
      const { result } = await atPasswordStep();
      act(() => {
        result.current.setNewPassword(STRONG);
        result.current.setConfirmPassword(STRONG);
      });
      await act(async () => result.current.submitPassword(submit));

      expect(service.resetPassword).toHaveBeenCalledWith("ada@school.test", "123456", STRONG);
      expect(result.current.succeeded).toBe(true);
      expect(push).not.toHaveBeenCalled();

      act(() => jest.advanceTimersByTime(REDIRECT_DELAY_MS));
      expect(push).toHaveBeenCalledWith("/signin");
    } finally {
      jest.useRealTimers();
    }
  });

  it("does not redirect after the page was left", async () => {
    jest.useFakeTimers();
    try {
      const hook = await atPasswordStep();
      act(() => {
        hook.result.current.setNewPassword(STRONG);
        hook.result.current.setConfirmPassword(STRONG);
      });
      await act(async () => hook.result.current.submitPassword(submit));
      hook.unmount();

      act(() => jest.advanceTimersByTime(REDIRECT_DELAY_MS * 2));
      expect(push).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });

  it("sends the teacher back for a new code when it expires while they type", async () => {
    service.resetPassword.mockRejectedValue(
      new ApiError("VALIDATION_FAILED", "Some fields need attention.", 400, [{ field: "token", reason: "That code has expired" }]),
    );
    const { result } = await atPasswordStep();
    act(() => {
      result.current.setNewPassword(STRONG);
      result.current.setConfirmPassword(STRONG);
    });
    await act(async () => result.current.submitPassword(submit));

    expect(result.current.step).toBe("otp");
    expect(result.current.otp).toBe("");
    expect(result.current.succeeded).toBe(false);
    expect(toast.error).toHaveBeenCalledWith("That code has expired");
  });

  it("walks back one step at a time and leaves to the sign-in root from the first", async () => {
    const { result } = await atPasswordStep();

    act(() => result.current.goBack());
    expect(result.current.step).toBe("otp");
    act(() => result.current.goBack());
    expect(result.current.step).toBe("email");
    act(() => result.current.goBack());
    expect(push).toHaveBeenCalledWith("/");
  });
});
