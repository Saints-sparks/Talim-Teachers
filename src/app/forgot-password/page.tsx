"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useForgotPassword, type ForgotPasswordStep } from "@/hooks/auth/useForgotPassword";
import { EmailStep } from "@/components/auth/forgot-password/EmailStep";
import { OtpStep } from "@/components/auth/forgot-password/OtpStep";
import { NewPasswordStep } from "@/components/auth/forgot-password/NewPasswordStep";
import { ResetSuccessModal } from "@/components/auth/forgot-password/ResetSuccessModal";
import { StepIndicator } from "@/components/auth/forgot-password/StepIndicator";

const STEP_COPY: Record<ForgotPasswordStep, { title: string; description: string }> = {
  email: {
    title: "Forgot Password?",
    description: "Enter your email address and we'll send you an OTP to reset your password.",
  },
  otp: {
    title: "Verify OTP",
    description: "Enter the 6-digit verification code sent to your email.",
  },
  newPassword: {
    title: "Set New Password",
    description: "Create a new password for your account.",
  },
};

/**
 * Password reset for a teacher who cannot sign in: email, emailed code, new
 * password. The flow itself lives in `useForgotPassword`; each step is its own
 * component. The page is public, so every call it makes goes out without a session.
 *
 * @returns The forgot-password page element.
 */
export default function ForgotPasswordPage() {
  const flow = useForgotPassword();
  const copy = STEP_COPY[flow.step];

  return (
    <div className="flex min-h-screen w-full flex-col lg:flex-row">
      <div className="relative flex flex-1 flex-col items-center justify-center px-4 py-12 sm:px-6 lg:px-8 lg:py-24">
        <div className="lg:absolute lg:top-16">
          <Image src="/icons/login/tree.svg" alt="Tree Logo" width={64} height={64} className="h-[80px] w-[76.32px]" priority />
        </div>

        <div className="w-full max-w-[400px] space-y-8">
          <div className="flex items-center">
            <button
              type="button"
              onClick={flow.goBack}
              className="flex items-center text-[#003366] transition-colors duration-200 hover:text-[#002B5B]"
            >
              <ArrowLeft className="mr-2 h-5 w-5" />
              <span className="text-sm">Back</span>
            </button>
          </div>

          <div className="space-y-4 text-center font-manrope">
            <h1 className="text-3xl font-medium text-[#030E18]">{copy.title}</h1>
            <p className="text-lg font-normal text-[#444444]">{copy.description}</p>
          </div>

          <StepIndicator step={flow.step} />

          <div className="pt-6 font-manrope">
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
          </div>

          <div className="text-center">
            <span className="text-sm text-gray-600">Remember your password? </span>
            <Link href="/" className="text-sm font-medium text-[#003366] hover:underline">
              Sign In
            </Link>
          </div>
        </div>
      </div>

      <div className="relative hidden flex-1 lg:block">
        <Image
          src="/icons/login/school-illustration.svg"
          alt="High school illustration"
          fill
          className="lg:h-[500px] lg:w-[700px]"
          priority
        />
      </div>

      <ResetSuccessModal open={flow.succeeded} />
    </div>
  );
}
