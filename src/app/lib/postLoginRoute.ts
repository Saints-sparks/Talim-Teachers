import { TEACHER_ONBOARDING_STEPS } from "../context/OnboardingContext";

/** The minimum user shape needed to decide where a signed-in teacher goes next. */
export interface PostLoginUser {
  userId?: string;
  _id?: string;
  id?: string;
  mustChangePassword?: boolean;
}

/**
 * Where a teacher lands after signing in (or after setting their password):
 * the set-password screen while a temporary password is in use, otherwise
 * onboarding until its required steps are done, then the dashboard.
 *
 * @param user - The introspected user.
 * @returns An app path.
 */
export function resolvePostLoginRoute(user: PostLoginUser): string {
  if (user.mustChangePassword) return "/set-password";
  try {
    const key = `teacher_onboarding_${user.userId || user._id || user.id}`;
    const state = JSON.parse(localStorage.getItem(key) ?? "null");
    if (!state?.phase1Completed) return "/onboarding";
    const completed: string[] = state.completedSteps ?? [];
    const requiredDone = TEACHER_ONBOARDING_STEPS.filter((step) => step.required).every((step) => completed.includes(step.id));
    return requiredDone ? "/dashboard" : "/onboarding/setup";
  } catch {
    return "/onboarding";
  }
}
