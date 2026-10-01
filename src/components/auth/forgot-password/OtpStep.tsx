"use client";

import { useState, type FormEvent } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { signInDescribedBy } from "../signin-ui";
import { errorClass, hintClass, inputClass, invalidInputClass, labelClass, submitButtonClass } from "./styles";

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
 * kept, at most six; a short code is also explained under the field, and the
 * line saying where the code went describes the field too.
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

  /**
   * Flags a code that isn't six digits under the field, then hands the submit to the flow.
   *
   * @param event - The form submit.
   * @returns Nothing; the flow checks the code or says what is missing.
   */
  const submit = (event: FormEvent<HTMLFormElement>) => {
    setError(/^\d{6}$/.test(otp) ? null : "Enter the 6-digit code from your email.");
    onSubmit(event);
  };

  return (
    <form onSubmit={submit} noValidate aria-label="Check the code" className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="otp" className={labelClass}>
          6-digit code
        </Label>
        <Input
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
          aria-describedby={signInDescribedBy("otp", { hint: true, error: Boolean(error) })}
          className={`${inputClass} text-center text-2xl tracking-widest ${error ? invalidInputClass : ""}`}
          required
          aria-required
        />
        {error ? (
          <p id="otp-error" className={`text-center ${errorClass}`}>
            {error}
          </p>
        ) : null}
        <p id="otp-hint" className={hintClass}>
          We sent it to {email}. Check your spam folder if it has not arrived.
        </p>
      </div>

      <Button type="submit" disabled={loading} className={submitButtonClass}>
        {loading ? "Checking code…" : "Continue"}
      </Button>

      <div className="flex justify-center">
        <button
          type="button"
          onClick={onResend}
          disabled={loading}
          className="-my-3 inline-flex min-h-[44px] items-center px-2 text-sm text-[#003366] hover:underline disabled:opacity-50"
        >
          Send a new code
        </button>
      </div>
    </form>
  );
}
