"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, KeyRound, Loader2, AlertCircle } from "lucide-react";
import { toast } from "@/components/CustomToast";
import PasswordRequirements from "@/components/auth/PasswordRequirements";
import { useAuth } from "../hooks/useAuth";
import { authService } from "../services/auth.service";
import { getApiError } from "../lib/apiError";
import { isPasswordValid } from "../lib/passwordPolicy";
import { resolvePostLoginRoute } from "../lib/postLoginRoute";
import type { User } from "../../types/auth";

type FieldErrors = Partial<Record<"currentPassword" | "newPassword" | "confirmPassword", string>>;

/**
 * First-sign-in password change. A teacher whose account was created by the
 * school has a temporary password; the API refuses every other request until
 * they choose their own, so this screen is the only place they can go.
 */
export default function SetPasswordPage() {
  const router = useRouter();
  const { logout } = useAuth();
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
        router.replace("/signin");
        return;
      }
      if (!stored.mustChangePassword) {
        router.replace(resolvePostLoginRoute(stored));
        return;
      }
      setUser(stored);
    } catch {
      router.replace("/signin");
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
      await authService.changePassword(currentPassword, newPassword, confirmPassword);
      const updated: User = { ...user, mustChangePassword: false };
      localStorage.setItem("user", JSON.stringify(updated));
      window.dispatchEvent(new Event("user-updated"));
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

  const inputClass = (hasError: boolean) =>
    `w-full h-11 px-3 pr-10 rounded-lg border text-sm text-gray-900 placeholder-gray-400 bg-[#F9FAFB] focus:outline-none focus:ring-2 focus:ring-[#003366]/30 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500 ${
      hasError ? "border-red-400 focus:border-red-500 dark:border-red-500" : "border-[#E5E7EB] focus:border-[#003366] dark:border-slate-600"
    }`;

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12 dark:bg-slate-950">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-100 dark:bg-slate-900 dark:ring-slate-800">
        <div className="mb-6 flex items-center gap-3">
          <Image src="/icons/login/tree.svg" alt="Talim" width={36} height={36} className="h-9 w-9" priority />
          <span className="text-lg font-bold text-[#030E18] dark:text-slate-100">Talim</span>
          <span className="rounded-full bg-[#EAF2FB] px-2.5 py-0.5 text-xs font-semibold text-[#003366] dark:bg-blue-900/40 dark:text-blue-200">
            Teachers
          </span>
        </div>

        <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-[#EAF2FB] dark:bg-blue-900/40">
          <KeyRound className="h-5 w-5 text-[#003366] dark:text-blue-200" aria-hidden />
        </div>
        <h1 className="text-2xl font-bold text-[#030E18] dark:text-slate-100">Set your password</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-slate-400">
          {user.firstName ? `Hi ${user.firstName}, your` : "Your"} school created this account with a temporary password.
          Choose your own to continue.
        </p>

        {formError && (
          <div role="alert" className="mt-5 flex items-start gap-2 rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {formError}
          </div>
        )}

        <form className="mt-6 space-y-5" onSubmit={handleSubmit} noValidate>
          <div>
            <label htmlFor="currentPassword" className="mb-1.5 block text-sm font-medium text-[#030E18] dark:text-slate-200">
              Temporary password
            </label>
            <div className="relative">
              <input
                id="currentPassword"
                type={showPasswords ? "text" : "password"}
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                aria-invalid={Boolean(fieldErrors.currentPassword)}
                aria-describedby={fieldErrors.currentPassword ? "currentPassword-error" : undefined}
                className={inputClass(Boolean(fieldErrors.currentPassword))}
                disabled={saving}
                required
              />
              <button
                type="button"
                onClick={() => setShowPasswords((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300"
                aria-label={showPasswords ? "Hide passwords" : "Show passwords"}
              >
                {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {fieldErrors.currentPassword && (
              <p id="currentPassword-error" className="mt-1 text-xs text-red-600 dark:text-red-400">
                {fieldErrors.currentPassword}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="newPassword" className="mb-1.5 block text-sm font-medium text-[#030E18] dark:text-slate-200">
              New password
            </label>
            <input
              id="newPassword"
              type={showPasswords ? "text" : "password"}
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              aria-invalid={Boolean(fieldErrors.newPassword)}
              aria-describedby="newPassword-rules"
              className={inputClass(Boolean(fieldErrors.newPassword))}
              disabled={saving}
              required
            />
            <PasswordRequirements password={newPassword} id="newPassword-rules" />
            {fieldErrors.newPassword && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.newPassword}</p>}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="mb-1.5 block text-sm font-medium text-[#030E18] dark:text-slate-200">
              Confirm new password
            </label>
            <input
              id="confirmPassword"
              type={showPasswords ? "text" : "password"}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              aria-invalid={confirmMismatch || Boolean(fieldErrors.confirmPassword)}
              className={inputClass(confirmMismatch || Boolean(fieldErrors.confirmPassword))}
              disabled={saving}
              required
            />
            {(confirmMismatch || fieldErrors.confirmPassword) && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.confirmPassword ?? "Passwords do not match"}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={!canSubmit}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#003366] text-sm font-semibold text-white transition-colors hover:bg-[#002244] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-700"
          >
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

        <div className="mt-6 flex flex-col items-center gap-2 text-sm">
          <Link href="/forgot-password" className="text-[#003366] hover:underline dark:text-blue-300">
            Use the code from your email instead
          </Link>
          <button type="button" onClick={logout} className="text-gray-500 hover:underline dark:text-slate-400">
            Sign out
          </button>
        </div>
      </div>
    </main>
  );
}
