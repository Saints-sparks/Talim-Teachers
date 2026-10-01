"use client";

import { useState, type FormEvent } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { signInDescribedBy } from "../signin-ui";
import { errorClass, inputClass, invalidInputClass, labelClass, submitButtonClass } from "./styles";

/** Props for {@link EmailStep}. */
export interface EmailStepProps {
  email: string;
  onEmailChange: (email: string) => void;
  loading: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

/**
 * Step one: ask for the account's email address and send the reset code. An
 * empty address is also shown under the field, tied to it with
 * `aria-describedby` (the flow itself says so in a toast and sends nothing).
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

  /**
   * Flags an empty address under the field, then hands the submit to the flow.
   *
   * @param event - The form submit.
   * @returns Nothing; the flow sends the code or says what is missing.
   */
  const submit = (event: FormEvent<HTMLFormElement>) => {
    setError(email.trim() ? null : "Enter your email address.");
    onSubmit(event);
  };

  return (
    <form onSubmit={submit} noValidate aria-label="Send a reset code" className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="email" className={labelClass}>
          Email address
        </Label>
        <Input
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
          aria-describedby={signInDescribedBy("email", { error: Boolean(error) })}
          className={`${inputClass} ${error ? invalidInputClass : ""}`}
          required
          aria-required
        />
        {error ? (
          <p id="email-error" className={errorClass}>
            {error}
          </p>
        ) : null}
      </div>

      <Button type="submit" disabled={loading} className={submitButtonClass}>
        {loading ? "Sending code…" : "Send code"}
      </Button>
    </form>
  );
}
