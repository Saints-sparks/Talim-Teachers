"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthCard } from "@/components/auth/AuthCard";
import { SignInForm } from "@/components/auth/SignInForm";
import { useAuth } from "./hooks/useAuth";
import { resolveSignedInRoute } from "./lib/landing";

/**
 * Sends a teacher who is already signed in on to where they work, instead
 * of showing the sign-in form: once the stored session has been restored,
 * `resolveSignedInRoute` picks set-password, onboarding or their "First
 * screen after sign-in". Checked once per visit, so a sign-in through the
 * form is routed by `login` alone.
 *
 * @returns True while the session is restoring or the redirect is under way.
 */
function useSignedInRedirect(): boolean {
  const { user, isAuthenticated, isRestoringSession } = useAuth();
  const router = useRouter();
  const checked = useRef(false);
  const mounted = useRef(true);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (isRestoringSession || checked.current) return;
    checked.current = true;
    if (!isAuthenticated || !user) return;
    setRedirecting(true);
    void resolveSignedInRoute(user).then((route) => {
      if (mounted.current) router.replace(route);
    });
  }, [isRestoringSession, isAuthenticated, user, router]);

  return isRestoringSession || redirecting;
}

/**
 * `/`, the one sign-in page (`SIGN_IN_ROUTE`), in the redesign's signed-out
 * card. Signing in, the role check, the temporary-password redirect and the
 * onboarding redirect all happen in the auth context's `login`; a visitor who
 * is already signed in is sent on by {@link useSignedInRedirect} and sees a
 * short status line instead of the form meanwhile.
 *
 * @returns The page.
 */
export default function LoginPage() {
  const redirecting = useSignedInRedirect();
  return (
    <AuthCard
      title="Welcome back"
      description="Sign in to the teacher portal with your school email or staff number."
      footnote={
        <>
          <p>Teachers see only the classes and subjects the school has assigned to them.</p>
          <p className="mt-2">
            Need help signing in?{" "}
            <a href="mailto:support@mytalim.com" className="font-bold text-tl-link underline-offset-2 hover:underline">
              support@mytalim.com
            </a>
          </p>
        </>
      }
    >
      {redirecting ? (
        <p role="status" aria-live="polite" aria-label="Signing in" className="text-sm text-tl-muted">
          Opening your portal…
        </p>
      ) : (
        <SignInForm />
      )}
    </AuthCard>
  );
}
