"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { KeyRound } from "lucide-react";
import { toast } from "@/components/CustomToast";
import PasswordRequirements from "@/components/auth/PasswordRequirements";
import {
  SignInErrorBanner,
  SignInLogoHeader,
  SignInPasswordField,
  SignInPrimaryButton,
  signInLinkClass,
} from "@/components/auth/signin-ui";
import { useAuth } from "../hooks/useAuth";
import { getApiError } from "../lib/apiError";
import { isPasswordValid } from "../lib/passwordPolicy";
import { resolveSignedInRoute } from "../lib/landing";
import { SIGN_IN_ROUTE } from "@/lib/routes";
import type { User } from "../../types/auth";

type FieldErrors = Partial<Record<"currentPassword" | "newPassword" | "confirmPassword", string>>;

/**
 * First-sign-in password change, in a white card on the grey page with the
 * Talim logo and "Teachers" pill, built from the sign-in look's parts. A
 * teacher whose account was created by the school has a temporary password;
 * the API refuses every other request until they choose their own, so this
 * screen is the only place they can go. The new password has to meet every
 * rule of the server's policy (listed live under the field) and match its
 * confirmation before the button is enabled; the server's field errors are
 * shown under their fields, anything else above the form. Once it is set (or
 * when the visitor doesn't need it) they go on through `resolveSignedInRoute`:
 * onboarding, else their landing page.
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
        void resolveSignedInRoute(stored).then((route) => router.replace(route));
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

  /**
   * Replaces the temporary password, then routes on through `resolveSignedInRoute`.
   *
   * @param e - The form submit.
   * @returns Resolves when the change (and the redirect) is done; failures are shown on the form.
   */
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
      router.replace(await resolveSignedInRoute(updated));
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
  /**
   * Shows or hides the three passwords together (one toggle, on the first field).
   *
   * @returns Nothing; the shared visibility flips.
   */
  const toggle = () => setShowPasswords((v) => !v);

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 dark:bg-slate-950">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-100 dark:bg-slate-900 dark:ring-slate-800">
        <SignInLogoHeader
          appName="Teachers"
          className="mb-6"
          logo={<Image src="/icons/login/tree.svg" alt="" width={36} height={36} className="h-9 w-9" priority />}
        />

        <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-[#EAF2FB] dark:bg-blue-900/40">
          <KeyRound className="h-5 w-5 text-[#003366] dark:text-blue-200" aria-hidden />
        </div>
        <h1 className="text-2xl font-bold text-[#030E18] dark:text-slate-100">Set your password</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-slate-400">
          {user.firstName ? `Hi ${user.firstName}, your` : "Your"} school created this account with a temporary password. Choose your own
          to continue.
        </p>

        {formError ? (
          <SignInErrorBanner tone="danger" className="mt-5">
            {formError}
          </SignInErrorBanner>
        ) : null}

        <form className="mt-6 space-y-5" onSubmit={handleSubmit} noValidate aria-label="Set your password">
          <SignInPasswordField
            id="currentPassword"
            name="currentPassword"
            label="Temporary password"
            error={fieldErrors.currentPassword}
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            visible={showPasswords}
            onToggleVisible={toggle}
            toggleLabels={["Show passwords", "Hide passwords"]}
            disabled={saving}
            required
            aria-required
          />

          <SignInPasswordField
            id="newPassword"
            name="newPassword"
            label="New password"
            error={fieldErrors.newPassword}
            describedBy={["newPassword-rules"]}
            after={<PasswordRequirements password={newPassword} id="newPassword-rules" />}
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            visible={showPasswords}
            hideToggle
            disabled={saving}
            required
            aria-required
          />

          <SignInPasswordField
            id="confirmPassword"
            name="confirmPassword"
            label="Confirm new password"
            error={confirmError}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            visible={showPasswords}
            hideToggle
            disabled={saving}
            required
            aria-required
          />

          <SignInPrimaryButton disabled={!canSubmit} loading={saving} loadingText="Saving…">
            Set password and continue
          </SignInPrimaryButton>
        </form>

        <div className="-mb-3 mt-3 flex flex-col items-center text-sm">
          <Link href="/forgot-password" className={signInLinkClass}>
            Use the code from your email instead
          </Link>
          <button
            type="button"
            onClick={logout}
            className="inline-flex min-h-[44px] items-center text-gray-500 hover:underline dark:text-slate-400"
          >
            Sign out
          </button>
        </div>
      </div>
    </main>
  );
}
