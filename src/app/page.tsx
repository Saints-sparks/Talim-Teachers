"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import ModernLoader from "@/components/ModernLoader";
import { SignInForm } from "@/components/auth/SignInForm";
import { SignInFooter, SignInHeading, SignInLogoHeader, SignInShell } from "@/components/auth/signin-ui";
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
 * `/`, the one sign-in page (`SIGN_IN_ROUTE`), in the Talim sign-in look:
 * the form column with the tree logo and the "Teachers" pill, and the navy
 * panel with the illustration. Signing in, the role check, the
 * temporary-password redirect and the onboarding redirect all happen in the
 * auth context's `login`, while the "Talim" loader covers the page. A visitor
 * who is already signed in is sent on by {@link useSignedInRedirect} and sees
 * only the loader meanwhile.
 *
 * @returns The page.
 */
export default function LoginPage() {
  const { isLoading } = useAuth();
  const redirecting = useSignedInRedirect();

  if (redirecting) return <ModernLoader visible />;

  return (
    <>
      <ModernLoader visible={isLoading} />
      <SignInShell
        illustration={<Image src="/icons/login/school-illustration.svg" alt="" fill priority className="object-contain" />}
        panelTitle="Talim Teacher Portal"
        panelText="Manage your classes, students, attendance, and curriculum — all in one place."
      >
        <SignInLogoHeader
          appName="Teachers"
          logo={<Image src="/icons/login/tree.svg" alt="" width={40} height={40} className="h-10 w-10" priority />}
        />
        <SignInHeading title="Welcome back" subtitle="Sign in to the teacher portal with your school email or staff number." />
        <SignInForm />
        <SignInFooter supportEmail="support@mytalim.com" />
      </SignInShell>
    </>
  );
}
