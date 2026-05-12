"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  BookOpenText,
  CheckCircle2,
  Circle,
  LayoutDashboard,
  Loader2,
  Lock,
  MessageSquare,
  Upload,
  Users,
} from "lucide-react";
import {
  TEACHER_ONBOARDING_STEPS,
  TeacherOnboardingStepId,
  useTeacherOnboarding,
} from "@/app/context/OnboardingContext";
import { useOnboardingSync } from "@/app/hooks/useOnboardingSync";

const STEP_ICONS: Record<TeacherOnboardingStepId, React.ReactNode> = {
  "teacher-profile": <Users className="h-5 w-5" />,
  "upload-resource": <Upload className="h-5 w-5" />,
  "mark-attendance": <CheckCircle2 className="h-5 w-5" />,
  "view-notifications": <Bell className="h-5 w-5" />,
  "create-curriculum": <BookOpenText className="h-5 w-5" />,
  "create-group-chat": <MessageSquare className="h-5 w-5" />,
};

export default function TeacherOnboardingSetup() {
  const router = useRouter();
  const {
    isHydrated,
    phase1Completed,
    isStepComplete,
    isStepLocked,
    progressPercent,
    completedCount,
    totalCount,
    isFullyComplete,
  } = useTeacherOnboarding();
  const { syncProgress } = useOnboardingSync();
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (isHydrated && !phase1Completed) {
      router.replace("/onboarding");
    }
  }, [isHydrated, phase1Completed, router]);

  useEffect(() => {
    if (!isHydrated || !phase1Completed) return;
    setSyncing(true);
    syncProgress().finally(() => setSyncing(false));
  }, [isHydrated, phase1Completed]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isHydrated || !phase1Completed) {
    return (
      <div className="min-h-screen bg-[#F8F8F8] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#003366]" />
      </div>
    );
  }

  const phase2Steps = TEACHER_ONBOARDING_STEPS.filter((s) => s.phase === 2);

  return (
    <div className="min-h-screen bg-[#F8F8F8]">
      <header className="sticky top-0 z-10 border-b border-[#F0F0F0] bg-white px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#003366]">
              Teacher Setup
            </p>
            <h1 className="text-xl font-bold text-[#030E18]">
              Complete your onboarding
            </h1>
          </div>
          <button
            onClick={() => router.push("/dashboard")}
            className="inline-flex items-center gap-2 rounded-lg border border-[#F0F0F0] bg-white px-3 py-2 text-sm font-semibold text-[#030E18] hover:bg-[#F7F7F7]"
          >
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </button>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 p-6 lg:grid-cols-[280px_1fr]">
        <aside className="rounded-2xl border border-[#F0F0F0] bg-white p-4 h-fit">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-[#030E18]">
              {completedCount} / {totalCount}
            </p>
            <p className="text-sm font-bold text-[#003366]">{progressPercent}%</p>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#F0F0F0]">
            <div
              className="h-full rounded-full bg-[#003366] transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="mt-5 space-y-2">
            {phase2Steps.map((step) => {
              const complete = isStepComplete(step.id);
              const locked = isStepLocked(step.id);
              return (
                <button
                  key={step.id}
                  disabled={locked}
                  onClick={() => router.push(step.href)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm ${
                    complete
                      ? "bg-green-50 text-green-700"
                      : locked
                      ? "text-[#A0A0A0]"
                      : "text-[#4B5563] hover:bg-[#F8F8F8]"
                  }`}
                >
                  {complete ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : locked ? (
                    <Lock className="h-4 w-4" />
                  ) : (
                    <Circle className="h-4 w-4" />
                  )}
                  <span>{step.label}</span>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="space-y-4">
          {isFullyComplete && (
            <div className="rounded-2xl border border-green-100 bg-green-50 p-5">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-600" />
                <div>
                  <h2 className="text-sm font-semibold text-[#030E18]">
                    All required setup steps are complete
                  </h2>
                  <p className="mt-1 text-sm text-[#6F6F6F]">
                    You can continue using the dashboard. This checklist will
                    stay available until you dismiss it there.
                  </p>
                </div>
              </div>
            </div>
          )}

          {syncing && (
            <div className="flex items-center gap-2 text-sm text-[#6F6F6F]">
              <Loader2 className="h-4 w-4 animate-spin" />
              Checking your setup progress...
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            {phase2Steps.map((step) => {
              const complete = isStepComplete(step.id);
              const locked = isStepLocked(step.id);
              return (
                <article
                  key={step.id}
                  className="rounded-2xl border border-[#F0F0F0] bg-white p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex gap-3">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                          complete
                            ? "bg-green-50 text-green-600"
                            : "bg-[#EAF2FB] text-[#003366]"
                        }`}
                      >
                        {STEP_ICONS[step.id]}
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-[#030E18]">
                          {step.label}
                        </h3>
                        <p className="mt-1 text-sm text-[#6F6F6F]">
                          {step.description}
                        </p>
                      </div>
                    </div>
                    {complete && <CheckCircle2 className="h-5 w-5 text-green-600" />}
                  </div>

                  <button
                    disabled={locked || complete}
                    onClick={() => router.push(step.href)}
                    className={`mt-5 rounded-lg px-4 py-2 text-sm font-semibold ${
                      complete
                        ? "bg-green-50 text-green-700"
                        : locked
                        ? "bg-[#F0F0F0] text-[#A0A0A0]"
                        : "bg-[#003366] text-white hover:bg-[#002244]"
                    }`}
                  >
                    {complete ? "Completed" : "Open"}
                  </button>
                </article>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
