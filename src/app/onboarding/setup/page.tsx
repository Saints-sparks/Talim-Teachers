"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TEACHER_ONBOARDING_STEPS, useTeacherOnboarding } from "@/app/context/OnboardingContext";
import { useOnboardingSync } from "@/app/hooks/useOnboardingSync";
import { OnboardingFrame } from "@/components/onboarding/OnboardingFrame";
import { card, cardTitle, pill, pillTone, primaryButton, rowButton } from "@/components/tl/styles";

/**
 * `/onboarding/setup`, the second step of first-run setup, in the redesign
 * and in the shape of Today's "Finish setting up" card: how many steps are
 * done, the same navy progress bar, then each step with what it is and
 * Start (which opens where it is done), Done, or Locked while a step it
 * depends on is open. What the teacher has already done is checked with the
 * server when the page opens (`useOnboardingSync`); the steps and their
 * storage are the onboarding context's, unchanged. A teacher who has not
 * confirmed their profile is sent back to it.
 *
 * @returns The page.
 */
export default function TeacherOnboardingSetup() {
  const router = useRouter();
  const { isHydrated, phase1Completed, isStepComplete, isStepLocked, progressPercent, completedCount, totalCount, isFullyComplete } =
    useTeacherOnboarding();
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
      <OnboardingFrame stepText="Step 2 of 2" title="Finish setting up" description="Loading your checklist…">
        <div className="h-[420px] animate-pulse rounded-[22px] bg-tl-line/70" role="status" aria-label="Loading your checklist" />
      </OnboardingFrame>
    );
  }

  const pct = Math.max(0, Math.min(100, Math.round(progressPercent)));

  return (
    <OnboardingFrame
      stepText="Step 2 of 2"
      title="Finish setting up"
      description={`${completedCount} of ${totalCount} done. Each step takes a minute or two, and each one opens where you do it.`}
      showToday
      aside={<div className="text-[32px] font-extrabold tracking-[-0.5px] text-tl-brand">{pct}%</div>}
    >
      {isFullyComplete ? (
        <section className="flex flex-wrap items-center gap-3.5 rounded-[18px] bg-tl-success-bg px-[18px] py-3.5 text-tl-ink" aria-labelledby="setup-done-title">
          <div className="min-w-[220px] flex-1">
            <h2 id="setup-done-title" className="text-[15px] font-extrabold text-tl-success">
              You&apos;re all set
            </h2>
            <p className="mt-0.5 text-sm text-tl-body">Every step is done. Today is where your day starts from now on.</p>
          </div>
          <Link href="/dashboard" className={primaryButton}>
            Go to Today
          </Link>
        </section>
      ) : null}

      <section className={card} aria-labelledby="setup-steps-title">
        <div className="flex items-baseline justify-between gap-2.5">
          <h2 id="setup-steps-title" className={cardTitle}>
            Your first steps
          </h2>
          {syncing ? (
            <p role="status" className="text-[13px] font-bold text-tl-faint">
              Checking what you have already done…
            </p>
          ) : null}
        </div>
        <div
          role="progressbar"
          aria-label="Setup progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          className="mt-3.5 h-2 overflow-hidden rounded bg-tl-line-soft"
        >
          <div className="h-full rounded bg-tl-brand-fill transition-[width]" style={{ width: `${pct}%` }} />
        </div>

        <ul className="mt-3" aria-label="Setup steps">
          {TEACHER_ONBOARDING_STEPS.map((step) => {
            const complete = isStepComplete(step.id);
            const locked = !complete && isStepLocked(step.id);
            return (
              <li key={step.id} className="flex flex-wrap items-center gap-3.5 border-t border-tl-line-soft py-3.5 first:border-t-0">
                <span
                  aria-hidden
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-extrabold ${
                    complete ? "bg-tl-success-bg text-tl-success" : "border border-tl-control text-tl-brand"
                  }`}
                >
                  {complete ? "✓" : "○"}
                </span>
                <div className="min-w-[200px] flex-1">
                  <h3 className="text-[15px] font-bold text-tl-ink">
                    {step.label}
                    {complete ? <span className="sr-only"> (done)</span> : null}
                  </h3>
                  <p className="mt-[3px] text-[13px] leading-normal text-tl-muted">{step.description}</p>
                </div>
                {complete ? (
                  <span className={`${pill} ${pillTone.success}`}>Done</span>
                ) : locked ? (
                  <span className={`${pill} ${pillTone.muted}`} title="Finish the step before it first">
                    Locked
                  </span>
                ) : (
                  <Link href={step.href} className={rowButton} aria-label={`Start: ${step.label}`}>
                    Start
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </OnboardingFrame>
  );
}
