"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { useForgotPassword, type ForgotPasswordStep } from "@/hooks/auth/useForgotPassword";
import { AuthCard } from "@/components/auth/AuthCard";
import { EmailStep } from "@/components/auth/forgot-password/EmailStep";
import { OtpStep } from "@/components/auth/forgot-password/OtpStep";
import { NewPasswordStep } from "@/components/auth/forgot-password/NewPasswordStep";
import { ResetSuccessModal } from "@/components/auth/forgot-password/ResetSuccessModal";
import { StepIndicator } from "@/components/auth/forgot-password/StepIndicator";
import { focusRing } from "@/components/tl/styles";

const STEP_COPY: Record<ForgotPasswordStep, { title: string; description: string; back: string }> = {
  email: {
    title: "Reset your password",
    description: "Enter the email address on your account and we will send you a 6-digit code.",
    back: "Back to sign in",
  },
  otp: {
    title: "Enter the code",
    description: "Type the 6-digit code from the email we just sent you.",
    back: "Change email",
  },
  newPassword: {
    title: "Choose a new password",
    description: "Your new password must meet every rule below.",
    back: "Back to the code",
  },
};

/**
 * Password reset for a teacher who cannot sign in, in the redesign's
 * signed-out card: email, emailed code, new password. The flow itself lives
 * in `useForgotPassword` (unchanged); each step is its own component. The
 * page is public, so every call it makes goes out without a session.
 *
 * @returns The forgot-password page element.
 */
export default function ForgotPasswordPage() {
  const flow = useForgotPassword();
  const copy = STEP_COPY[flow.step];

  return (
    <>
      <AuthCard
        before={
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={flow.goBack}
              className={`-ml-2 inline-flex min-h-[44px] items-center gap-1 rounded-xl px-2 text-sm font-bold text-tl-brand hover:bg-tl-bg ${focusRing}`}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
              {copy.back}
            </button>
            <StepIndicator step={flow.step} />
          </div>
        }
        title={copy.title}
        description={copy.description}
        footnote={
          <p>
            Remembered it?{" "}
            <Link href="/" className="font-bold text-tl-link underline-offset-2 hover:underline">
              Sign in
            </Link>
          </p>
        }
      >
        {flow.step === "email" && (
          <EmailStep email={flow.email} onEmailChange={flow.setEmail} loading={flow.loading} onSubmit={flow.submitEmail} />
        )}
        {flow.step === "otp" && (
          <OtpStep
            email={flow.email}
            otp={flow.otp}
            onOtpChange={flow.setOtp}
            loading={flow.loading}
            onSubmit={flow.submitCode}
            onResend={flow.resendCode}
          />
        )}
        {flow.step === "newPassword" && (
          <NewPasswordStep
            newPassword={flow.newPassword}
            onNewPasswordChange={flow.setNewPassword}
            confirmPassword={flow.confirmPassword}
            onConfirmPasswordChange={flow.setConfirmPassword}
            loading={flow.loading}
            onSubmit={flow.submitPassword}
          />
        )}
      </AuthCard>

      <ResetSuccessModal open={flow.succeeded} />
    </>
  );
}
