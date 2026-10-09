"use client";

import React, { useEffect, useId, useState, type FormEvent } from "react";
import { ConfirmSheet } from "@/components/tl/ConfirmSheet";
import { dangerGhostButton, fieldControl, fieldLabel, textLink } from "@/components/tl/styles";
import { DELETE_ACCOUNT_INFO_URL } from "@/lib/routes";
import { useRequestAccountDeletion } from "@/hooks/settings/useAccount";
import { DELETION_REASON_MAX, deletionErrorMessage } from "@/hooks/settings/settings.logic";
import { PasswordField } from "./ChangePasswordSheet";
import { SettingsGroup } from "./SettingsRows";

/** What deleting does, in the danger zone and in the sheet. */
const DELETION_SUMMARY =
  "Your account will be deleted in 30 days, and signing in before then cancels it. After that your name, email, phone number and photo are erased. Your school keeps grades, attendance and payments, with your details removed.";

/** Props for {@link DeleteAccountSheet}. */
export interface DeleteAccountSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * The Delete account confirmation: the password, an optional reason and an
 * "I understand" box. Delete stays disabled until the box is ticked and a
 * password is typed. A wrong password shows on the field; every other
 * refusal (`ADMIN_ACCOUNT`, `LAST_SCHOOL_ADMIN`, `DELETION_SCHEDULED`, a
 * network failure) shows in a banner above it. On success
 * `useRequestAccountDeletion` signs out and lands on sign-in with the date.
 * The sheet (Radix) supplies the labelled heading, focus trap and Escape.
 *
 * @param props - See {@link DeleteAccountSheetProps}.
 * @param props.open - Whether the sheet is open.
 * @param props.onOpenChange - Opens or closes it.
 * @returns The sheet.
 */
export function DeleteAccountSheet({ open, onOpenChange }: DeleteAccountSheetProps) {
  const request = useRequestAccountDeletion();
  const formId = useId();
  const reasonId = useId();
  const [password, setPassword] = useState("");
  const [reason, setReason] = useState("");
  const [understood, setUnderstood] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [bannerError, setBannerError] = useState<string | null>(null);
  const { reset } = request;

  useEffect(() => {
    if (!open) return;
    setPassword("");
    setReason("");
    setUnderstood(false);
    setFieldError(null);
    setBannerError(null);
    reset();
  }, [open, reset]);

  const busy = request.isPending;
  const ready = understood && password.length > 0 && !busy;

  /** Sends the request, or shows why it was refused. */
  const submit = () => {
    if (!ready) return;
    setFieldError(null);
    setBannerError(null);
    const trimmed = reason.trim();
    request.mutate(
      { password, ...(trimmed ? { reason: trimmed } : {}) },
      {
        onError: (error) => {
          const { field, banner } = deletionErrorMessage(error);
          setFieldError(field);
          setBannerError(banner);
        },
      },
    );
  };

  /**
   * Enter in the password field submits once the sheet is complete.
   *
   * @param event - The form submit.
   */
  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    submit();
  };

  return (
    <ConfirmSheet
      open={open}
      onCancel={() => onOpenChange(false)}
      onConfirm={submit}
      eyebrowText="Danger zone"
      title="Delete your account?"
      body={`You'll be signed out on every device now. ${DELETION_SUMMARY}`}
      confirmLabel="Delete account"
      busyLabel="Deleting…"
      busy={busy}
      confirmDisabled={!ready}
      danger
    >
      <form id={formId} onSubmit={onSubmit} className="flex flex-col gap-[18px]" noValidate>
        {bannerError ? (
          <p role="alert" className="rounded-2xl border border-tl-danger/30 bg-tl-danger-bg p-3.5 text-[13px] font-semibold leading-[1.6] text-tl-danger">
            {bannerError}
          </p>
        ) : null}
        <PasswordField
          label="Password"
          value={password}
          onChange={(value) => {
            setPassword(value);
            setFieldError(null);
          }}
          autoComplete="current-password"
          disabled={busy}
          error={fieldError}
        />
        <div className="flex flex-col gap-[7px]">
          <label htmlFor={reasonId} className={fieldLabel}>
            Why are you leaving? (optional)
          </label>
          <textarea
            id={reasonId}
            value={reason}
            maxLength={DELETION_REASON_MAX}
            disabled={busy}
            onChange={(event) => setReason(event.target.value)}
            className={`${fieldControl} min-h-[88px] resize-y py-3 text-sm leading-[1.6]`}
          />
        </div>
        <label className="flex min-h-[44px] cursor-pointer items-start gap-3 text-sm leading-[1.6] text-tl-body">
          <input
            type="checkbox"
            checked={understood}
            disabled={busy}
            onChange={(event) => setUnderstood(event.target.checked)}
            className="mt-[3px] h-5 w-5 shrink-0 accent-tl-danger"
          />
          <span>I understand my account will be deleted in 30 days unless I sign in before then.</span>
        </label>
        {/* Enter in a field submits through this hidden button; the visible one is in the footer. */}
        <button type="submit" hidden aria-hidden tabIndex={-1} />
      </form>
    </ConfirmSheet>
  );
}

/**
 * Settings → Security → Danger zone: what deleting the account does, a link
 * to the full explanation on www.mytalim.com, and "Delete account", which
 * opens {@link DeleteAccountSheet}.
 *
 * @returns The group.
 */
export function DeleteAccountSection() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <SettingsGroup heading="Danger zone">
        <div className="flex flex-col gap-3 py-[15px]">
          <div>
            <p className="text-[15px] font-bold text-tl-ink">Delete account</p>
            <p className="mt-[3px] text-[13px] leading-[1.6] text-tl-muted">{DELETION_SUMMARY}</p>
          </div>
          <a href={DELETE_ACCOUNT_INFO_URL} target="_blank" rel="noopener noreferrer" className={`${textLink} self-start whitespace-normal`}>
            What happens when you delete your account
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
          <button type="button" className={`${dangerGhostButton} self-start`} onClick={() => setOpen(true)}>
            Delete account
          </button>
        </div>
      </SettingsGroup>
      <DeleteAccountSheet open={open} onOpenChange={setOpen} />
    </>
  );
}
