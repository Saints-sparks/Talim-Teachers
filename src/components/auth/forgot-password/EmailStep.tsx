"use client";

import { useState, type FormEvent } from "react";
import { primaryButton } from "@/components/tl/styles";
import { AuthField, authInputClass, describedBy } from "../AuthField";

/** Props for {@link EmailStep}. */
export interface EmailStepProps {
  email: string;
  onEmailChange: (email: string) => void;
  loading: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

/**
 * Step one: ask for the account's email address and send the reset code. An
 * empty address is also shown under the field (the flow itself says so in a
 * toast and sends nothing).
 *
 * @param props - See {@link EmailStepProps}.
 * @param props.email - The address typed so far.
 * @param props.onEmailChange - Called as the teacher types.
 * @param props.loading - True while the code is being sent.
 * @param props.onSubmit - Sends the code.
 * @returns The form element.
 */
export function EmailStep({ email, onEmailChange, loading, onSubmit }: EmailStepProps) {
  const [error, setError] = useState<string | null>(null);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    setError(email.trim() ? null : "Enter your email address.");
    onSubmit(event);
  };

  return (
    <form onSubmit={submit} noValidate aria-label="Send a reset code" className="flex flex-col gap-[18px]">
      <AuthField id="email" label="Email address" error={error}>
        <input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="you@school.com"
          value={email}
          onChange={(e) => {
            onEmailChange(e.target.value);
            if (error) setError(null);
          }}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={describedBy("email", { error: Boolean(error) })}
          className={authInputClass(Boolean(error))}
          required
          aria-required
        />
      </AuthField>

      <button type="submit" disabled={loading} className={`${primaryButton} w-full min-h-[50px] text-[15px]`}>
        {loading ? "Sending code…" : "Send code"}
      </button>
    </form>
  );
}
