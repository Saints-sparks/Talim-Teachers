"use client";

import React from "react";
import { AuthCard } from "@/components/auth/AuthCard";
import { SignInForm } from "@/components/auth/SignInForm";

/**
 * `/`, the one sign-in page (`SIGN_IN_ROUTE`), in the redesign's signed-out
 * card. Signing in, the role check, the temporary-password redirect and the
 * onboarding redirect all happen in the auth context's `login`.
 *
 * @returns The page.
 */
export default function LoginPage() {
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
      <SignInForm />
    </AuthCard>
  );
}
