"use client";

import React, { useEffect, useId, useState, type FormEvent } from "react";
import { Sheet } from "@/components/tl/Sheet";
import { fieldControl, ghostButton, primaryButton } from "@/components/tl/styles";
import { useAuth } from "@/app/context/AuthContext";
import { historyNote, meetsPolicy, passwordNote, policySummary } from "@/app/lib/passwordPolicy";
import { ApiError, getErrorMessage } from "@/lib/apiError";
import type { PasswordPolicy } from "@/types/inboxSettings";

/**
 * Turns a failed password change into the one message to show, preferring the
 * field the server named. Keyed on `error.code`, never on message text.
 *
 * @param error - Whatever the change-password call threw.
 * @returns The message for the form.
 */
export function passwordChangeMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const fields = error.fieldErrors();
    const named = fields.currentPassword ?? fields.newPassword ?? fields.confirmPassword;
    if (named) return named;
    if (error.code === "UNAUTHENTICATED") return "That current password is not right. Please try again.";
    if (error.code === "VALIDATION_FAILED") return error.message || "Your new password doesn't meet every requirement.";
    if (error.code === "RATE_LIMITED") return "Too many attempts. Please wait a moment and try again.";
  }
  return getErrorMessage(error, "Failed to update password.");
}

/** Props for {@link ChangePasswordSheet}. */
export interface ChangePasswordSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** `GET /auth/password-policy`; the hard-coded rules apply while it is missing. */
  policy?: PasswordPolicy | null;
  /** Called after the password changed (the sessions list is stale: other devices were signed out). */
  onChanged?: () => void;
}

/**
 * One labelled password input (also the Delete account sheet's).
 *
 * @param props - The field.
 * @param props.label - The visible label.
 * @param props.value - The value.
 * @param props.onChange - Receives the new value.
 * @param props.autoComplete - `current-password` or `new-password`.
 * @param props.placeholder - Shown while empty.
 * @param props.describedBy - The id of the note under the fields.
 * @param props.disabled - True while saving.
 * @param props.error - A message about this field (a wrong password), shown under it and announced.
 * @returns The field.
 */
export function PasswordField({
  label,
  value,
  onChange,
  autoComplete,
  placeholder,
  describedBy,
  disabled,
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: "current-password" | "new-password";
  placeholder?: string;
  describedBy?: string;
  disabled: boolean;
  error?: string | null;
}) {
  const id = useId();
  const errorId = useId();
  const described = [describedBy, error ? errorId : undefined].filter(Boolean).join(" ") || undefined;
  return (
    <div className="flex flex-col gap-[7px]">
      <label htmlFor={id} className="text-xs font-extrabold uppercase tracking-[0.05em] text-tl-faint">
        {label}
      </label>
      <input
        id={id}
        type="password"
        value={value}
        autoComplete={autoComplete}
        placeholder={placeholder}
        aria-describedby={described}
        aria-invalid={error ? true : undefined}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className={`${fieldControl} min-h-[48px]`}
      />
      {error ? (
        <p id={errorId} role="alert" className="text-[13px] font-semibold text-tl-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/**
 * The design's `password` sheet: current, new and confirm, checked against
 * the backend's real policy as the teacher types. `AuthContext.changePassword`
 * adopts the rotated session, so this device stays signed in while the others
 * are signed out.
 *
 * @param props - See {@link ChangePasswordSheetProps}.
 * @param props.open - Whether the sheet is open.
 * @param props.onOpenChange - Opens or closes it.
 * @param props.policy - The password policy.
 * @param props.onChanged - Called after a successful change.
 * @returns The sheet.
 */
export function ChangePasswordSheet({ open, onOpenChange, policy, onChanged }: ChangePasswordSheetProps) {
  const { changePassword } = useAuth();
  const noteId = useId();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setCurrent("");
    setNext("");
    setConfirm("");
    setDone(false);
    setFormError(null);
  }, [open]);

  const note = passwordNote(next, confirm, policy);
  const history = historyNote(policy);
  const canSubmit = current.length > 0 && meetsPolicy(next, policy) && next === confirm && !saving;

  /**
   * Sends the change and shows the done state, or the reason it failed.
   *
   * @param event - The form submit.
   */
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    setFormError(null);
    setSaving(true);
    try {
      await changePassword(current, next, confirm);
      setDone(true);
      onChanged?.();
    } catch (error) {
      setFormError(passwordChangeMessage(error));
    } finally {
      setSaving(false);
    }
  };

  /** Closes the sheet. */
  const close = () => onOpenChange(false);
  return (
    <Sheet
      open={open}
      onOpenChange={(value) => !saving && onOpenChange(value)}
      eyebrowText="Security"
      title="Change password"
      footer={
        done ? (
          <button type="button" className={`${primaryButton} min-h-[48px] flex-1`} onClick={close}>
            Done
          </button>
        ) : (
          <>
            <button type="button" className={`${ghostButton} min-h-[48px] flex-1`} onClick={close} disabled={saving}>
              Cancel
            </button>
            <button type="submit" form="change-password-form" className={`${primaryButton} min-h-[48px] flex-1`} disabled={!canSubmit}>
              {saving ? "Updating…" : "Update password"}
            </button>
          </>
        )
      }
    >
      {done ? (
        <div>
          <div aria-hidden className="flex h-[54px] w-[54px] items-center justify-center rounded-full bg-tl-success-bg text-[26px] font-extrabold text-tl-success">
            ✓
          </div>
          <p role="status" className="mt-4 text-[19px] font-extrabold tracking-[-0.3px] text-tl-ink">
            Password updated
          </p>
          <p className="mt-1.5 text-sm leading-[1.6] text-tl-muted">Use your new password next time you sign in. Other devices have been signed out.</p>
        </div>
      ) : (
        <form id="change-password-form" onSubmit={submit} className="flex flex-col gap-[18px]" noValidate>
          <PasswordField label="Current password" value={current} onChange={setCurrent} autoComplete="current-password" disabled={saving} />
          <PasswordField
            label="New password"
            value={next}
            onChange={setNext}
            autoComplete="new-password"
            placeholder={policySummary(policy)}
            describedBy={noteId}
            disabled={saving}
          />
          <PasswordField label="Confirm new password" value={confirm} onChange={setConfirm} autoComplete="new-password" describedBy={noteId} disabled={saving} />
          <div id={noteId} className="text-[13px] leading-[1.6] text-tl-muted">
            <p aria-live="polite" className={note.ok ? "font-bold text-tl-success" : undefined}>
              {note.text}
            </p>
            {history ? <p>{history}</p> : null}
          </div>
          {formError ? (
            <p role="alert" className="text-[13px] font-semibold text-tl-danger">
              {formError}
            </p>
          ) : null}
        </form>
      )}
    </Sheet>
  );
}
