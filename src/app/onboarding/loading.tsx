import { OnboardingFrame } from "@/components/onboarding/OnboardingFrame";

/**
 * The first-run pages while their route loads: the onboarding frame with a
 * grey block where the page will be (there is no shell before onboarding).
 *
 * @returns The loading state.
 */
export default function Loading() {
  return (
    <OnboardingFrame stepText="Getting started" title="Setting up your account" description="Loading…">
      <div className="h-[420px] animate-pulse rounded-[22px] bg-tl-line/70" role="status" aria-label="Loading" />
    </OnboardingFrame>
  );
}
