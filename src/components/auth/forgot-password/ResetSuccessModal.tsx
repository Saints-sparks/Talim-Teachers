"use client";

/**
 * The confirmation shown once the password is reset. It is only mounted while
 * visible, so nothing invisible sits over the page.
 *
 * @param props - Component props.
 * @param props.open - Whether the confirmation is showing.
 * @returns The overlay, or `null` when closed.
 */
export function ResetSuccessModal({ open }: { open: boolean }) {
  if (!open) return null;
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="reset-success-title" className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 max-w-md scale-100 rounded-2xl bg-white p-8 text-center opacity-100 transition-all duration-300">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-500/20">
          <svg className="reset-check h-12 w-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" className="reset-check-path" />
          </svg>
        </div>

        <h2 id="reset-success-title" className="mb-2 text-2xl font-bold text-gray-800">
          Password Reset Successful!
        </h2>
        <p className="mb-6 text-gray-600">Your password has been successfully updated. You will be redirected to the sign-in page.</p>

        <div className="flex justify-center space-x-1" aria-hidden>
          <div className="h-2 w-2 animate-bounce rounded-full bg-[#003366] dark:bg-blue-400" />
          <div className="h-2 w-2 animate-bounce rounded-full bg-[#003366] [animation-delay:0.1s] dark:bg-blue-400" />
          <div className="h-2 w-2 animate-bounce rounded-full bg-[#003366] [animation-delay:0.2s] dark:bg-blue-400" />
        </div>
      </div>

      <style jsx>{`
        .reset-check-path {
          stroke-dasharray: 50;
          stroke-dashoffset: 50;
          animation: reset-check-draw 0.6s ease-in-out 0.3s forwards;
        }
        .reset-check {
          animation: reset-check-pop 0.3s ease-in-out;
        }
        @keyframes reset-check-draw {
          to {
            stroke-dashoffset: 0;
          }
        }
        @keyframes reset-check-pop {
          0% {
            transform: scale(0);
          }
          50% {
            transform: scale(1.1);
          }
          100% {
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}
