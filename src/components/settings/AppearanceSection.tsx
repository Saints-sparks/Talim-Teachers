"use client";

import React from "react";
import { Check, Monitor, Moon, Sun } from "lucide-react";
import { toast } from "@/components/CustomToast";
import { getErrorMessage } from "@/lib/apiError";
import { useTheme, type Theme } from "@/providers/theme-provider";
import { useUpdateTeacherPreferences } from "@/hooks/settings/useTeacherSettings";
import { Card, CardHeader, SectionHeader } from "./primitives";

const THEME_OPTIONS: Array<{ value: Theme; label: string; desc: string; icon: React.ElementType }> = [
  { value: "light", label: "Light", desc: "Clean white interface", icon: Sun },
  { value: "dark", label: "Dark", desc: "Easy on the eyes at night", icon: Moon },
  { value: "system", label: "System", desc: "Follows device preference", icon: Monitor },
];

/**
 * Theme choice. Applied instantly for this device and saved to the account so
 * it follows the teacher to other devices.
 *
 * @returns The Appearance section element.
 */
export function AppearanceSection() {
  const { theme, setTheme } = useTheme();
  const updatePreferences = useUpdateTeacherPreferences();

  const handleThemeChange = (value: Theme) => {
    setTheme(value);
    updatePreferences.mutate(
      { theme: value },
      { onError: (error) => toast.error(getErrorMessage(error, "We couldn't save your theme preference.")) },
    );
  };

  return (
    <div className="space-y-6">
      <SectionHeader title="Appearance" desc="Choose how Talim Teachers looks on this device." />

      <Card>
        <CardHeader title="Theme" />
        <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-3">
          {THEME_OPTIONS.map(({ value, label, desc, icon: Icon }) => {
            const selected = theme === value;
            return (
              <button
                key={value}
                type="button"
                aria-pressed={selected}
                onClick={() => handleThemeChange(value)}
                className={`flex flex-col items-center gap-3 rounded-xl border-2 p-5 transition-all ${
                  selected
                    ? "border-[#003366] bg-[#EEF3F9] dark:border-blue-500 dark:bg-slate-700"
                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50 dark:border-slate-700 dark:hover:border-slate-600 dark:hover:bg-slate-700/50"
                }`}
              >
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-full ${
                    selected
                      ? "bg-[#003366] text-white dark:bg-blue-600"
                      : "bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-slate-300"
                  }`}
                >
                  <Icon size={24} />
                </div>
                <div className="text-center">
                  <p
                    className={`text-sm font-semibold ${
                      selected ? "text-[#003366] dark:text-blue-400" : "text-gray-700 dark:text-slate-200"
                    }`}
                  >
                    {label}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-500">{desc}</p>
                </div>
                {selected && (
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#003366] dark:bg-blue-600">
                    <Check size={12} className="text-white" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </Card>

      <Card>
        <div className="px-5 py-4">
          <p className="text-xs text-gray-400 dark:text-slate-500">
            Theme preference is saved to your account and applies on every device you sign in on.
          </p>
        </div>
      </Card>
    </div>
  );
}

export default AppearanceSection;
