"use client";

import type { FormEvent } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { inputClass, labelClass, submitButtonClass } from "./styles";

/** Props for {@link OtpStep}. */
export interface OtpStepProps {
  email: string;
  otp: string;
  onOtpChange: (otp: string) => void;
  loading: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onResend: () => void;
}

/**
 * Step two: enter the 6-digit code from the email. The code is checked with
 * the server before the teacher is asked for a new password.
 *
 * @param props - See {@link OtpStepProps}.
 * @param props.email - Where the code was sent, shown under the field.
 * @param props.otp - The digits typed so far.
 * @param props.onOtpChange - Called with digits only, at most six.
 * @param props.loading - True while the code is being checked.
 * @param props.onSubmit - Checks the code.
 * @param props.onResend - Requests a new code.
 * @returns The form element.
 */
export function OtpStep({ email, otp, onOtpChange, loading, onSubmit, onResend }: OtpStepProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="otp" className={labelClass}>
          Enter OTP
        </Label>
        <Input
          id="otp"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="Enter 6-digit OTP"
          value={otp}
          onChange={(e) => onOtpChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
          className={`${inputClass} text-center text-2xl tracking-widest`}
          maxLength={6}
          required
        />
        <p className="text-center text-sm text-gray-600">We&apos;ve sent a 6-digit verification code to {email}</p>
      </div>

      <Button type="submit" disabled={loading} className={submitButtonClass}>
        {loading ? "Checking code..." : "Continue"}
      </Button>

      <div className="text-center">
        <button
          type="button"
          onClick={onResend}
          disabled={loading}
          className="text-sm text-[#003366] hover:underline disabled:opacity-50"
        >
          Resend OTP
        </button>
      </div>
    </form>
  );
}
