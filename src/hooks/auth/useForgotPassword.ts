"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/CustomToast";
import { authService } from "@/app/services/auth.service";
import { isPasswordValid } from "@/app/lib/passwordPolicy";
import { logger } from "@/lib/logger";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { describeResetFailure, type ResetStage } from "./passwordResetErrors";

/** The three screens of the reset flow, in order. */
export type ForgotPasswordStep = "email" | "otp" | "newPassword";

/** How long the success message stays up before the teacher is sent to sign in. */
export const REDIRECT_DELAY_MS = 3500;

/**
 * State and actions for the forgot-password flow.
 *
 * The three calls are the real reset flow and all go out without a session
 * (`skipAuth` in `authService`): request a 6-digit code by email, check that
 * code with the server before asking for a new password, then set the password.
 * A wrong code is caught at the second step, not after the teacher has typed
 * a new password, and a code that expires while they type sends them back.
 *
 * @returns The current step and field values, the busy and success flags, the
 * field setters, and `submitEmail`, `resendCode`, `submitCode`, `submitPassword`
 * and `goBack`.
 */
export function useForgotPassword() {
  const router = useRouter();
  const [step, setStep] = useState<ForgotPasswordStep>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [succeeded, setSucceeded] = useState(false);

  // The success overlay blocks the page; keep it from scrolling behind it.
  useBodyScrollLock(succeeded);

  // Send the teacher on to sign in once they have read the confirmation.
  useEffect(() => {
    if (!succeeded) return;
    const timer = setTimeout(() => router.push("/signin"), REDIRECT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [succeeded, router]);

  /**
   * Shows a failed call's message, keyed on its error code.
   *
   * @param err - What the call threw.
   * @param stage - Which call it was.
   * @returns Whether the emailed code can no longer be used.
   */
  const fail = useCallback((err: unknown, stage: ResetStage): boolean => {
    logger.error("auth", `Password reset ${stage} failed`, err);
    const failure = describeResetFailure(err, stage);
    toast.error(failure.message);
    return failure.restartCode;
  }, []);

  const requestCode = useCallback(async () => {
    if (!email.trim()) {
      toast.error("Please enter your email address");
      return;
    }
    setLoading(true);
    try {
      await authService.forgotPassword(email);
      toast.success("If that email is registered, a 6-digit code is on its way.");
      setOtp("");
      setStep("otp");
    } catch (err) {
      fail(err, "request");
    } finally {
      setLoading(false);
    }
  }, [email, fail]);

  const submitEmail = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      void requestCode();
    },
    [requestCode],
  );

  const submitCode = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!/^\d{6}$/.test(otp)) {
        toast.error("Enter the 6-digit code from your email");
        return;
      }
      setLoading(true);
      try {
        await authService.verifyResetCode(email, otp);
        setStep("newPassword");
      } catch (err) {
        fail(err, "verify");
      } finally {
        setLoading(false);
      }
    },
    [email, fail, otp],
  );

  const submitPassword = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!isPasswordValid(newPassword)) {
        toast.error("Your new password doesn't meet every requirement.");
        return;
      }
      if (newPassword !== confirmPassword) {
        toast.error("Passwords do not match");
        return;
      }
      setLoading(true);
      try {
        await authService.resetPassword(email, otp, newPassword);
        setSucceeded(true);
      } catch (err) {
        if (fail(err, "reset")) {
          // The code expired or was used up while the teacher was typing.
          setStep("otp");
          setOtp("");
        }
      } finally {
        setLoading(false);
      }
    },
    [confirmPassword, email, fail, newPassword, otp],
  );

  const goBack = useCallback(() => {
    if (step === "email") router.push("/");
    else if (step === "otp") setStep("email");
    else setStep("otp");
  }, [router, step]);

  return {
    step,
    email,
    setEmail,
    otp,
    setOtp,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    loading,
    succeeded,
    submitEmail,
    resendCode: requestCode,
    submitCode,
    submitPassword,
    goBack,
  };
}
