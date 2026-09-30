import type { ForgotPasswordStep } from "@/hooks/auth/useForgotPassword";

const STEPS: ForgotPasswordStep[] = ["email", "otp", "newPassword"];

/**
 * "Step 2 of 3" over three short bars, the done and current ones in navy.
 *
 * @param props - Component props.
 * @param props.step - The current step.
 * @returns The indicator element.
 */
export function StepIndicator({ step }: { step: ForgotPasswordStep }) {
  const index = STEPS.indexOf(step);
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-extrabold uppercase tracking-[0.07em] text-tl-faint">
        Step {index + 1} of {STEPS.length}
      </span>
      <span className="flex gap-1.5" aria-hidden>
        {STEPS.map((key, i) => (
          <span key={key} className={`h-1.5 w-6 rounded-full ${i <= index ? "bg-tl-brand-fill" : "bg-tl-line"}`} />
        ))}
      </span>
    </div>
  );
}
