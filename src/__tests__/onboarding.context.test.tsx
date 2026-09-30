/**
 * @jest-environment jsdom
 */
import React, { useEffect } from "react";
import { act, render, screen } from "@testing-library/react";
import { TEACHER_ONBOARDING_STEPS, TeacherOnboardingProvider, useTeacherOnboarding } from "@/app/context/OnboardingContext";

const KEY = "teacher_onboarding_u1";
const ALL = TEACHER_ONBOARDING_STEPS.map((step) => step.id);

/**
 * Ticks the profile step as soon as there is a user, as the onboarding sync
 * does on sign-in: from an effect of a child, which runs before the
 * provider's own effect (the one that loads the saved progress).
 *
 * @param props - The signed-in user's id.
 * @param props.userId - Null while signed out.
 * @returns Nothing.
 */
function TickOnSignIn({ userId }: { userId: string | null }) {
  const { markStepComplete } = useTeacherOnboarding();
  useEffect(() => {
    if (userId) markStepComplete("teacher-profile");
  }, [userId, markStepComplete]);
  return null;
}

/**
 * Shows the progress the provider holds.
 *
 * @returns "complete", or the completed steps.
 */
function Progress() {
  const { completedSteps, isFullyComplete } = useTeacherOnboarding();
  return <p data-testid="progress">{isFullyComplete ? "complete" : completedSteps.join(",")}</p>;
}

/**
 * The provider as the app mounts it, for one user.
 *
 * @param props - The signed-in user's id.
 * @param props.userId - Null while signed out.
 * @returns The tree.
 */
function Shell({ userId }: { userId: string | null }) {
  return (
    <TeacherOnboardingProvider userId={userId}>
      <TickOnSignIn userId={userId} />
      <Progress />
    </TeacherOnboardingProvider>
  );
}

beforeEach(() => localStorage.clear());

describe("TeacherOnboardingProvider on sign-in", () => {
  it("keeps the progress saved on this device when a step is ticked before it has loaded", () => {
    localStorage.setItem(KEY, JSON.stringify({ completedSteps: ALL, phase1Completed: true, setupDismissed: true }));
    const { rerender } = render(<Shell userId={null} />);
    act(() => rerender(<Shell userId="u1" />));

    const saved = JSON.parse(localStorage.getItem(KEY)!);
    expect([...saved.completedSteps].sort()).toEqual([...ALL].sort());
    expect(saved.phase1Completed).toBe(true);
    expect(saved.setupDismissed).toBe(true);
    expect(screen.getByTestId("progress")).toHaveTextContent("complete");
  });

  it("adds the ticked step to what was saved", () => {
    localStorage.setItem(KEY, JSON.stringify({ completedSteps: ["view-notifications"], phase1Completed: false, setupDismissed: false }));
    const { rerender } = render(<Shell userId={null} />);
    act(() => rerender(<Shell userId="u1" />));

    const saved = JSON.parse(localStorage.getItem(KEY)!);
    expect([...saved.completedSteps].sort()).toEqual(["teacher-profile", "view-notifications"]);
    expect(saved.phase1Completed).toBe(true);
    expect(screen.getByTestId("progress")).toHaveTextContent(/teacher-profile/);
    expect(screen.getByTestId("progress")).toHaveTextContent(/view-notifications/);
  });

  it("starts a first sign-in on this device from nothing", () => {
    const { rerender } = render(<Shell userId={null} />);
    act(() => rerender(<Shell userId="u1" />));
    expect(JSON.parse(localStorage.getItem(KEY)!)).toEqual({ completedSteps: ["teacher-profile"], phase1Completed: true, setupDismissed: false });
  });

  it("never carries one teacher's progress over to the next one to sign in", () => {
    localStorage.setItem(KEY, JSON.stringify({ completedSteps: ALL, phase1Completed: true, setupDismissed: true }));
    const { rerender } = render(<Shell userId={null} />);
    act(() => rerender(<Shell userId="u1" />));
    act(() => rerender(<Shell userId={null} />));
    act(() => rerender(<Shell userId="u2" />));
    expect(JSON.parse(localStorage.getItem("teacher_onboarding_u2")!)).toEqual({ completedSteps: ["teacher-profile"], phase1Completed: true, setupDismissed: false });
    expect(screen.getByTestId("progress")).toHaveTextContent(/^teacher-profile$/);
  });
});
