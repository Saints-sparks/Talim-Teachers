"use client";

import React, { useEffect, useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "@/components/CustomToast";
import PasswordRequirements from "@/components/auth/PasswordRequirements";
import { authService } from "@/app/services/auth.service";
import { isPasswordValid } from "@/app/lib/passwordPolicy";
import { ApiError, getErrorMessage } from "@/lib/apiError";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";

/**
 * Turns a failed password change into the one message to show, preferring the
 * field the server named. Keyed on `error.code`, never on message text.
 *
 * @param error - Whatever the change-password call threw.
 * @returns The message for the form.
 */
function passwordChangeMessage(error: unknown): string {
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

/** Props for {@link ChangePasswordModal}. */
export interface ChangePasswordModalProps {
  /** Closes the modal. */
  onClose: () => void;
}

/**
 * Replaces the signed-in teacher's password. The server rotates the session
 * and `authService` adopts the new token, so no other request 401s afterwards.
 *
 * @param props - See {@link ChangePasswordModalProps}.
 * @param props.onClose - Closes the modal.
 * @returns The modal element.
 */
export function ChangePasswordModal({ onClose }: ChangePasswordModalProps) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useBodyScrollLock(true);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);
    if (next !== confirm) {
      setFormError("New passwords do not match.");
      return;
    }
    if (!isPasswordValid(next)) {
      setFormError("Your new password doesn't meet every requirement below.");
      return;
    }

    setSaving(true);
    try {
      await authService.changePassword(current, next, confirm);
      toast.success("Password updated. Other devices have been signed out.");
      onClose();
    } catch (error) {
      setFormError(passwordChangeMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const fields = [
    { label: "Current Password", value: current, set: setCurrent, show: showCurrent, toggle: () => setShowCurrent((v) => !v), autoComplete: "current-password" },
    { label: "New Password", value: next, set: setNext, show: showNext, toggle: () => setShowNext((v) => !v), autoComplete: "new-password" },
    { label: "Confirm New Password", value: confirm, set: setConfirm, show: showNext, toggle: () => setShowNext((v) => !v), autoComplete: "new-password" },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Change password"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
    >
      <div className="mx-4 max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-slate-800">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5 dark:border-slate-700">
          <h3 className="font-bold text-gray-900 dark:text-slate-100">Change Password</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300"
          >
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          {fields.map(({ label, value, set, show, toggle, autoComplete }) => (
            <div key={label}>
              <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-slate-300">{label}</label>
              <div className="relative">
                <input
                  type={show ? "text" : "password"}
                  value={value}
                  autoComplete={autoComplete}
                  onChange={(event) => set(event.target.value)}
                  required
                  aria-label={label}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#003366] dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={toggle}
                  aria-label={show ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500"
                >
                  {show ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
          ))}
          <PasswordRequirements password={next} />
          {formError && (
            <p role="alert" className="text-xs text-red-600 dark:text-red-400">
              {formError}
            </p>
          )}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-200 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#003366] py-2 text-sm font-semibold text-white transition-colors hover:bg-[#002244] disabled:opacity-60 dark:bg-blue-600 dark:hover:bg-blue-700"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {saving ? "Updating…" : "Update Password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ChangePasswordModal;
