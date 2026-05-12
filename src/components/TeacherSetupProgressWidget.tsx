"use client";

import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  Circle,
  Sparkles,
  X,
} from "lucide-react";
import {
  TEACHER_ONBOARDING_STEPS,
  useTeacherOnboarding,
} from "@/app/context/OnboardingContext";

export default function TeacherSetupProgressWidget() {
  const router = useRouter();
  const {
    phase1Completed,
    setupDismissed,
    dismissSetup,
    isFullyComplete,
    isStepComplete,
    completedCount,
    totalCount,
    progressPercent,
  } = useTeacherOnboarding();

  if (isFullyComplete && setupDismissed) return null;

  if (!phase1Completed) {
    return (
      <div className="rounded-xl bg-[#003366] p-4 text-white border border-[#002244]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold">Complete your teacher setup</p>
            <p className="text-xs text-white/70 mt-1">
              Confirm your profile details before continuing into Talim.
            </p>
          </div>
          <button
            onClick={() => router.push("/onboarding")}
            className="shrink-0 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-[#003366]"
          >
            Start
          </button>
        </div>
      </div>
    );
  }

  if (isFullyComplete) {
    return (
      <div className="rounded-xl border border-green-100 bg-green-50 p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-gray-900">
                Teacher setup complete
              </p>
              <p className="text-xs text-gray-500 mt-1">
                You have completed the required onboarding tasks.
              </p>
            </div>
          </div>
          <button
            onClick={dismissSetup}
            className="rounded-md p-1 text-gray-400 hover:bg-white hover:text-gray-600"
            aria-label="Dismiss setup"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  const phase2Steps = TEACHER_ONBOARDING_STEPS.filter((s) => s.phase === 2);
  const nextSteps = phase2Steps.filter((s) => !isStepComplete(s.id)).slice(0, 3);

  return (
    <div className="rounded-xl border border-[#F0F0F0] bg-white p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex gap-3">
          <div className="h-9 w-9 rounded-lg bg-[#EAF2FB] text-[#003366] flex items-center justify-center">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#030E18]">
              Teacher setup checklist
            </p>
            <p className="text-xs text-[#6F6F6F] mt-1">
              {completedCount} of {totalCount} steps complete
            </p>
          </div>
        </div>
        <span className="text-sm font-bold text-[#003366]">
          {progressPercent}%
        </span>
      </div>

      <div className="mt-4 h-2 rounded-full bg-[#F0F0F0] overflow-hidden">
        <div
          className="h-full rounded-full bg-[#003366] transition-all"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="mt-4 space-y-2">
        {nextSteps.map((step) => (
          <div key={step.id} className="flex items-center gap-2 text-sm">
            <Circle className="h-4 w-4 text-[#A0A0A0]" />
            <span className="text-[#4B5563]">{step.label}</span>
          </div>
        ))}
      </div>

      <button
        onClick={() => router.push("/onboarding/setup")}
        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#003366] px-4 py-2 text-sm font-semibold text-white hover:bg-[#002244]"
      >
        Continue setup <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}
