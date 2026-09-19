import type { ForgotPasswordStep } from "@/hooks/auth/useForgotPassword";

const STEPS: ForgotPasswordStep[] = ["email", "otp", "newPassword"];

/**
 * Three dots showing which step of the reset flow the teacher is on.
 *
 * @param props - Component props.
 * @param props.step - The current step.
 * @returns The indicator element.
 */
export function StepIndicator({ step }: { step: ForgotPasswordStep }) {
  return (
    <div className="flex justify-center" role="img" aria-label={`Step ${STEPS.indexOf(step) + 1} of ${STEPS.length}`}>
      <div className="flex space-x-2">
        {STEPS.map((key) => (
          <div key={key} className={`h-3 w-3 rounded-full ${step === key ? "bg-[#003366] dark:bg-blue-400" : "bg-gray-300 dark:bg-slate-600"}`} />
        ))}
      </div>
    </div>
  );
}
