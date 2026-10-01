"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import PasswordRequirements from "@/components/auth/PasswordRequirements";
import { isPasswordValid } from "@/app/lib/passwordPolicy";
import { PasswordField } from "./PasswordField";
import { submitButtonClass } from "./styles";

/** Props for {@link NewPasswordStep}. */
export interface NewPasswordStepProps {
  newPassword: string;
  onNewPasswordChange: (value: string) => void;
  confirmPassword: string;
  onConfirmPasswordChange: (value: string) => void;
  loading: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

/**
 * Step three: choose a new password. The checklist mirrors the server's
 * password policy, so a password that passes here is accepted there. A
 * confirmation that differs is flagged as it is typed; a password that misses
 * a rule is flagged under the field when the form is sent (the flow also
 * says so in a toast and sends nothing).
 *
 * @param props - See {@link NewPasswordStepProps}.
 * @param props.newPassword - The new password typed so far.
 * @param props.onNewPasswordChange - Called as the teacher types.
 * @param props.confirmPassword - The confirmation typed so far.
 * @param props.onConfirmPasswordChange - Called as the teacher types.
 * @param props.loading - True while the password is being set.
 * @param props.onSubmit - Sets the password.
 * @returns The form element.
 */
export function NewPasswordStep({
  newPassword,
  onNewPasswordChange,
  confirmPassword,
  onConfirmPasswordChange,
  loading,
  onSubmit,
}: NewPasswordStepProps) {
  const [weak, setWeak] = useState(false);
  const mismatch = confirmPassword.length > 0 && confirmPassword !== newPassword;

  /**
   * Flags a password that misses a rule under the field, then hands the submit to the flow.
   *
   * @param event - The form submit.
   * @returns Nothing; the flow sets the password or says what is missing.
   */
  const submit = (event: FormEvent<HTMLFormElement>) => {
    setWeak(!isPasswordValid(newPassword));
    onSubmit(event);
  };

  return (
    <form onSubmit={submit} noValidate aria-label="Choose a new password" className="space-y-6">
      <PasswordField
        id="newPassword"
        label="New password"
        value={newPassword}
        onChange={(value) => {
          onNewPasswordChange(value);
          if (weak && isPasswordValid(value)) setWeak(false);
        }}
        error={weak ? "Your new password doesn't meet every rule yet." : null}
        describedByIds={["newPassword-rules"]}
      >
        <PasswordRequirements password={newPassword} id="newPassword-rules" />
      </PasswordField>

      <PasswordField
        id="confirmPassword"
        label="Confirm new password"
        value={confirmPassword}
        onChange={onConfirmPasswordChange}
        error={mismatch ? "Passwords do not match" : null}
      />

      <Button type="submit" disabled={loading} className={submitButtonClass}>
        {loading ? "Resetting password…" : "Reset password"}
      </Button>
    </form>
  );
}
