"use client";

import type { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import PasswordRequirements from "@/components/auth/PasswordRequirements";
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
 * password policy, so a password that passes here is accepted there.
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
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <PasswordField
        id="newPassword"
        label="New Password"
        placeholder="Enter new password"
        value={newPassword}
        onChange={onNewPasswordChange}
      >
        <PasswordRequirements password={newPassword} />
      </PasswordField>

      <PasswordField
        id="confirmPassword"
        label="Confirm New Password"
        placeholder="Confirm new password"
        value={confirmPassword}
        onChange={onConfirmPasswordChange}
      />

      <Button type="submit" disabled={loading} className={submitButtonClass}>
        {loading ? "Resetting Password..." : "Reset Password"}
      </Button>
    </form>
  );
}
