"use client";

import React from "react";
import Link from "next/link";
import { CheckCircle2, ChevronRight, Circle, Play, RefreshCw } from "lucide-react";
import { toast } from "@/components/CustomToast";
import { useAuth } from "@/app/context/AuthContext";
import { TEACHER_ONBOARDING_STEPS, useTeacherOnboarding } from "@/app/context/OnboardingContext";
import { logger } from "@/lib/logger";
import { usePreferenceEditor } from "./PreferenceSections";
import { Card, CardHeader, SectionHeader, ToggleRow } from "./primitives";

/**
 * Setup progress, the checklist behind it, and the in-app guide switch.
 *
 * @returns The Onboarding & Guides section element.
 */
export function OnboardingSection() {
  const { user } = useAuth();
  const { preferences, save, isSaving } = usePreferenceEditor();
  const { progressPercent, completedCount, totalCount, completedSteps } = useTeacherOnboarding();

  const resetGuide = () => {
    if (!user?.userId) return;
    try {
      localStorage.removeItem(`teacher_onboarding_${user.userId}`);
      toast.success("Guide prompts reset. Refresh to see changes.");
    } catch (error) {
      logger.warn("settings", "could not reset the guide prompts", error);
      toast.error("We couldn't reset the guide prompts on this device.");
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeader title="Onboarding & Guides" desc="Setup progress, completed steps and help guides." />

      <Card>
        <CardHeader title="Setup Progress" />
        <div className="p-5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 dark:text-slate-300">
              {completedCount} of {totalCount} steps completed
            </span>
            <span className="text-sm font-bold text-[#003366] dark:text-blue-400">{progressPercent}%</span>
          </div>
          <div
            role="progressbar"
            aria-valuenow={progressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Setup progress"
            className="h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-slate-700"
          >
            <div
              className="h-full rounded-full bg-[#003366] transition-all duration-500 dark:bg-blue-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Setup Steps" />
        <div className="divide-y divide-gray-50 dark:divide-slate-700">
          {TEACHER_ONBOARDING_STEPS.map((step) => {
            const done = completedSteps.includes(step.id);
            return (
              <div key={step.id} className="flex items-start gap-3 px-5 py-3.5">
                {done ? (
                  <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-500 dark:text-emerald-400" />
                ) : (
                  <Circle size={18} className="mt-0.5 shrink-0 text-gray-300 dark:text-slate-600" />
                )}
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-sm font-medium ${
                      done ? "text-gray-500 line-through dark:text-slate-500" : "text-gray-800 dark:text-slate-200"
                    }`}
                  >
                    {step.label}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-500">{step.description}</p>
                </div>
                {!done && (
                  <Link
                    href={step.href}
                    className="shrink-0 text-xs font-semibold text-[#003366] hover:underline dark:text-blue-400"
                  >
                    Go <ChevronRight size={12} className="inline" />
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      <Card>
        <CardHeader title="Guide Settings" />
        <div className="px-5">
          <ToggleRow
            label="Show app guide tips"
            desc="In-app tooltips and walkthrough prompts"
            checked={preferences.guides.showAppTips}
            disabled={isSaving}
            onChange={(value) => save({ guides: { showAppTips: value } })}
          />
        </div>
      </Card>

      <Card>
        <div className="flex flex-wrap gap-3 p-5">
          <Link
            href="/onboarding/setup"
            className="flex items-center gap-2 rounded-lg bg-[#003366] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#002244] dark:bg-blue-600 dark:hover:bg-blue-700"
          >
            <Play size={14} />
            Open Setup Checklist
          </Link>
          <button
            type="button"
            onClick={resetGuide}
            className="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <RefreshCw size={14} />
            Reset Guide Prompts
          </button>
        </div>
      </Card>
    </div>
  );
}

export default OnboardingSection;
