import type { ForgotPasswordStep } from "@/hooks/auth/useForgotPassword";

const STEPS: ForgotPasswordStep[] = ["email", "otp", "newPassword"];

/**
 * Three dots showing which step of the reset flow the teacher is on, the
 * current one in navy. Screen readers hear "Step 2 of 3" instead of the dots.
 *
 * @param props - Component props.
 * @param props.step - The current step.
 * @returns The indicator element.
 */
export function StepIndicator({ step }: { step: ForgotPasswordStep }) {
  const index = STEPS.indexOf(step);
  return (
    <div className="flex justify-center">
      <span className="sr-only">
        Step {index + 1} of {STEPS.length}
      </span>
      <div className="flex space-x-2" aria-hidden>
        {STEPS.map((key) => (
          <div key={key} className={`h-3 w-3 rounded-full ${step === key ? "bg-[#003366] dark:bg-blue-400" : "bg-gray-300 dark:bg-slate-600"}`} />
        ))}
      </div>
    </div>
  );
}
