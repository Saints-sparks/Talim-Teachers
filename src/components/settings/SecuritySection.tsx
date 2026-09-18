"use client";

import React, { useState } from "react";
import { Key, LogOut } from "lucide-react";
import { useAuth } from "@/app/context/AuthContext";
import { Card, CardHeader, SectionHeader } from "./primitives";
import ChangePasswordModal from "./ChangePasswordModal";

/**
 * Password and session controls.
 *
 * Two-factor authentication used to be advertised here as "coming soon" —
 * there is no teacher-facing 2FA endpoint in the backend, so the control was
 * removed rather than left as a dead promise (see the stub policy in the
 * hardening brief). Re-add it once `POST /auth/2fa/*` exists for teachers.
 *
 * @returns The Security section element.
 */
export function SecuritySection() {
  const { logout } = useAuth();
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  return (
    <div className="space-y-6">
      <SectionHeader title="Security" desc="Manage your password and account security." />

      <Card>
        <CardHeader title="Password" />
        <div className="flex flex-col items-stretch gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-800 dark:text-slate-200">Change Password</p>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-slate-400">
              Use a strong password of at least 8 characters.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowPasswordModal(true)}
            className="flex items-center justify-center gap-1.5 rounded-lg bg-[#003366] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#002244] dark:bg-blue-600 dark:hover:bg-blue-700 sm:shrink-0"
          >
            <Key size={14} /> Change
          </button>
        </div>
      </Card>

      <Card>
        <CardHeader title="Active Session" />
        <div className="p-5">
          <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-800/50 dark:bg-emerald-900/20">
            <div className="h-2 w-2 shrink-0 rounded-full bg-emerald-500 dark:bg-emerald-400" />
            <div>
              <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">Current session active</p>
              <p className="mt-0.5 text-xs text-emerald-600 dark:text-emerald-500">
                You are currently logged in on this device.
              </p>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Account Actions" />
        <div className="p-5">
          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20 sm:w-auto"
          >
            <LogOut size={14} />
            Logout Account
          </button>
        </div>
      </Card>

      {showPasswordModal && <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />}
    </div>
  );
}

export default SecuritySection;
