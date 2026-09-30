"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "@/components/CustomToast";
import { AuthCard } from "@/components/auth/AuthCard";
import { AuthField, FormAlert, PasswordInput, describedBy } from "@/components/auth/AuthField";
import PasswordRequirements from "@/components/auth/PasswordRequirements";
import { focusRing, primaryButton, textLink } from "@/components/tl/styles";
import { useAuth } from "../hooks/useAuth";
import { getApiError } from "../lib/apiError";
import { isPasswordValid } from "../lib/passwordPolicy";
import { resolvePostLoginRoute } from "../lib/postLoginRoute";
import { SIGN_IN_ROUTE } from "@/lib/routes";
import type { User } from "../../types/auth";

type FieldErrors = Partial<Record<"currentPassword" | "newPassword" | "confirmPassword", string>>;

/**
 * First-sign-in password change, in the redesign's signed-out card. A
 * teacher whose account was created by the school has a temporary password;
 * the API refuses every other request until they choose their own, so this
 * screen is the only place they can go. The new password has to meet every
 * rule of the server's policy (listed live under the field) and match its
 * confirmation before the button is enabled; the server's field errors are
 * shown under their fields, anything else above the form.
 *
 * @returns The page, or nothing while the stored session is read (and when it sends the teacher elsewhere).
 */
export default function SetPasswordPage() {
  const router = useRouter();
  const { logout, changePassword, updateUser } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("user") ?? "null") as User | null;
      if (!stored) {
        router.replace(SIGN_IN_ROUTE);
        return;
      }
      if (!stored.mustChangePassword) {
        router.replace(resolvePostLoginRoute(stored));
        return;
      }
      setUser(stored);
    } catch {
      router.replace(SIGN_IN_ROUTE);
    }
  }, [router]);

  const confirmMismatch = confirmPassword.length > 0 && confirmPassword !== newPassword;
  const canSubmit = useMemo(
    () => currentPassword.length > 0 && isPasswordValid(newPassword) && newPassword === confirmPassword && !saving,
    [currentPassword, newPassword, confirmPassword, saving],
  );

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    setFieldErrors({});
    if (!canSubmit || !user) return;

    setSaving(true);
    try {
      // Adopts the rotated session and refreshes the user in the auth context, so the
      // rest of the app (teacher record, onboarding sync) stops treating the account as locked.
      await changePassword(currentPassword, newPassword, confirmPassword);
      updateUser({ mustChangePassword: false });
      const updated: User = { ...user, mustChangePassword: false };
      toast.success("Your password is set. Welcome to Talim!");
      router.replace(resolvePostLoginRoute(updated));
    } catch (err) {
      const info = getApiError(err, "We couldn't update your password. Please try again.");
      if (Object.keys(info.fieldErrors).length > 0) {
        setFieldErrors(info.fieldErrors as FieldErrors);
      } else {
        setFormError(info.message);
      }
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  const confirmError = fieldErrors.confirmPassword ?? (confirmMismatch ? "Passwords do not match" : null);
  const toggle = () => setShowPasswords((v) => !v);

  return (
    <AuthCard
      title="Set your password"
      description={
        <>
          {user.firstName ? `Hi ${user.firstName}, your` : "Your"} school created this account with a temporary password. Choose your own
          to continue.
        </>
      }
      footnote="You will use this password from now on. The temporary one stops working as soon as you set it."
    >
      <form className="flex flex-col gap-[18px]" onSubmit={handleSubmit} noValidate aria-label="Set your password">
        {formError ? <FormAlert tone="danger">{formError}</FormAlert> : null}

        <AuthField id="currentPassword" label="Temporary password" error={fieldErrors.currentPassword}>
          <PasswordInput
            id="currentPassword"
            name="currentPassword"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            visible={showPasswords}
            onToggleVisible={toggle}
            toggleLabels={["Show passwords", "Hide passwords"]}
            invalid={Boolean(fieldErrors.currentPassword)}
            aria-describedby={describedBy("currentPassword", { error: Boolean(fieldErrors.currentPassword) })}
            disabled={saving}
            required
            aria-required
          />
        </AuthField>

        <AuthField
          id="newPassword"
          label="New password"
          error={fieldErrors.newPassword}
          after={<PasswordRequirements password={newPassword} id="newPassword-rules" />}
        >
          <PasswordInput
            id="newPassword"
            name="newPassword"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            visible={showPasswords}
            onToggleVisible={toggle}
            hideToggle
            invalid={Boolean(fieldErrors.newPassword)}
            aria-describedby={describedBy("newPassword", { error: Boolean(fieldErrors.newPassword), extra: ["newPassword-rules"] })}
            disabled={saving}
            required
            aria-required
          />
        </AuthField>

        <AuthField id="confirmPassword" label="Confirm new password" error={confirmError}>
          <PasswordInput
            id="confirmPassword"
            name="confirmPassword"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            visible={showPasswords}
            onToggleVisible={toggle}
            hideToggle
            invalid={Boolean(confirmError)}
            aria-describedby={describedBy("confirmPassword", { error: Boolean(confirmError) })}
            disabled={saving}
            required
            aria-required
          />
        </AuthField>

        <button type="submit" disabled={!canSubmit} className={`${primaryButton} w-full min-h-[50px] text-[15px]`}>
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Saving…
            </>
          ) : (
            "Set password and continue"
          )}
        </button>
      </form>

      <div className="mt-4 flex flex-col items-center gap-1">
        <Link href="/forgot-password" className={textLink}>
          Use the code from your email instead
        </Link>
        <button
          type="button"
          onClick={logout}
          className={`inline-flex min-h-[44px] items-center rounded-md px-2 text-sm font-bold text-tl-muted hover:text-tl-ink hover:underline ${focusRing}`}
        >
          Sign out
        </button>
      </div>
    </AuthCard>
  );
}
