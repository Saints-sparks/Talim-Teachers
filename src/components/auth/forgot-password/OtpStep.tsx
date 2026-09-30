"use client";

import { useState, type FormEvent } from "react";
import { focusRing, primaryButton } from "@/components/tl/styles";
import { AuthField, authInputClass, describedBy } from "../AuthField";

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
 * the server before the teacher is asked for a new password. Only digits are
 * kept, at most six; a short code is also explained under the field.
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
  const [error, setError] = useState<string | null>(null);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    setError(/^\d{6}$/.test(otp) ? null : "Enter the 6-digit code from your email.");
    onSubmit(event);
  };

  return (
    <form onSubmit={submit} noValidate aria-label="Check the code" className="flex flex-col gap-[18px]">
      <AuthField id="otp" label="6-digit code" error={error} hint={`We sent it to ${email}. Check your spam folder if it has not arrived.`}>
        <input
          id="otp"
          name="otp"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="000000"
          value={otp}
          onChange={(e) => {
            onOtpChange(e.target.value.replace(/\D/g, "").slice(0, 6));
            if (error) setError(null);
          }}
          maxLength={6}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={describedBy("otp", { hint: true, error: Boolean(error) })}
          className={`${authInputClass(Boolean(error))} text-center text-2xl tracking-[0.4em]`}
          required
          aria-required
        />
      </AuthField>

      <button type="submit" disabled={loading} className={`${primaryButton} w-full min-h-[50px] text-[15px]`}>
        {loading ? "Checking code…" : "Continue"}
      </button>

      <button
        type="button"
        onClick={onResend}
        disabled={loading}
        className={`mx-auto inline-flex min-h-[44px] items-center rounded-md px-2 text-sm font-bold text-tl-link hover:underline disabled:opacity-50 ${focusRing}`}
      >
        Send a new code
      </button>
    </form>
  );
}
