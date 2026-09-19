"use client";

import type { FormEvent } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { inputClass, labelClass, submitButtonClass } from "./styles";

/** Props for {@link EmailStep}. */
export interface EmailStepProps {
  email: string;
  onEmailChange: (email: string) => void;
  loading: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

/**
 * Step one: ask for the account's email address and send the reset code.
 *
 * @param props - See {@link EmailStepProps}.
 * @param props.email - The address typed so far.
 * @param props.onEmailChange - Called as the teacher types.
 * @param props.loading - True while the code is being sent.
 * @param props.onSubmit - Sends the code.
 * @returns The form element.
 */
export function EmailStep({ email, onEmailChange, loading, onSubmit }: EmailStepProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="email" className={labelClass}>
          Email Address
        </Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="Enter your email address"
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          className={inputClass}
          required
        />
      </div>

      <Button type="submit" disabled={loading} className={submitButtonClass}>
        {loading ? "Sending OTP..." : "Send OTP"}
      </Button>
    </form>
  );
}
