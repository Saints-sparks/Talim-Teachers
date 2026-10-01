"use client";

import React, { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useAuth } from "@/app/hooks/useAuth";
import {
  INVALID_CREDENTIALS_TEXT,
  classifyLoginError,
  validateSignIn,
  type LoginError,
  type SignInFieldErrors,
  type SignInValues,
} from "@/hooks/auth/signIn.logic";
import {
  SignInCheckbox,
  SignInErrorBanner,
  SignInField,
  SignInOptionsRow,
  SignInPasswordField,
  SignInPrimaryButton,
  signInLinkClass,
} from "./signin-ui";

/** The id of the banner a refused sign-in shows, which the password field names. */
const ALERT_ID = "signin-alert";

/**
 * The banner for a refused sign-in: red with the shield for another role's
 * account, amber for wrong credentials, grey for anything else.
 *
 * @param props - The failure.
 * @param props.error - Why the sign-in was refused.
 * @returns The banner.
 */
function LoginErrorAlert({ error }: { error: LoginError }) {
  if (error.kind === "access_denied") {
    return (
      <SignInErrorBanner id={ALERT_ID} tone="danger" title="Access denied" icon="shield" className="mt-6">
        {error.message}
      </SignInErrorBanner>
    );
  }
  if (error.kind === "invalid_credentials") {
    return (
      <SignInErrorBanner id={ALERT_ID} tone="warning" className="mt-6">
        {INVALID_CREDENTIALS_TEXT}
      </SignInErrorBanner>
    );
  }
  return (
    <SignInErrorBanner id={ALERT_ID} tone="neutral" className="mt-6">
      {error.message}
    </SignInErrorBanner>
  );
}

/**
 * The teachers' sign-in form in the Talim sign-in look (see
 * `components/auth/signin-ui`): email or staff number, password (with
 * show/hide), keep me signed in and "Forgot password?". Empty fields are
 * caught before anything is sent, each error is tied to its field and the
 * first one gets focus. The sign-in itself is the auth context's `login`: it
 * admits teachers and sub-admins only and routes on (set-password,
 * onboarding or the landing page); a refusal is shown as a banner above the
 * fields.
 *
 * @returns The banner (when a sign-in was refused) and the form.
 */
export function SignInForm() {
  const { login, isLoading } = useAuth();
  const [values, setValues] = useState<SignInValues>({ identifier: "", password: "", rememberMe: false });
  const [errors, setErrors] = useState<SignInFieldErrors>({});
  const [loginError, setLoginError] = useState<LoginError | null>(null);
  const identifierRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  /**
   * Stores a typed value and clears that field's error.
   *
   * @param field - The field typed in.
   * @param value - Its new value.
   * @returns Nothing; the form's state is updated.
   */
  const change = (field: "identifier" | "password", value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  /**
   * Checks the fields, then signs in; a refusal is classified for the banner.
   *
   * @param event - The form submit.
   * @returns Resolves once the attempt is over.
   */
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoginError(null);
    const found = validateSignIn(values);
    setErrors(found);
    if (found.identifier) {
      identifierRef.current?.focus();
      return;
    }
    if (found.password) {
      passwordRef.current?.focus();
      return;
    }

    try {
      await login({
        identifier: values.identifier.trim(),
        email: values.identifier.trim(),
        password: values.password,
        deviceToken: "web-token",
        platform: "web",
      });
    } catch (err) {
      setLoginError(classifyLoginError(err));
    }
  };

  const credentialsWrong = loginError?.kind === "invalid_credentials";
  const alertIds = credentialsWrong ? [ALERT_ID] : [];

  return (
    <>
      {loginError ? <LoginErrorAlert error={loginError} /> : null}

      <form onSubmit={handleSubmit} noValidate aria-label="Sign in" className="mt-8 space-y-5">
        <SignInField
          ref={identifierRef}
          id="identifier"
          name="identifier"
          label="Email or staff number"
          hint="A staff number looks like ESEC-260200001."
          error={errors.identifier}
          invalid={credentialsWrong}
          describedBy={alertIds}
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="you@school.com"
          value={values.identifier}
          onChange={(e) => change("identifier", e.target.value)}
          disabled={isLoading}
          required
          aria-required
        />

        <SignInPasswordField
          ref={passwordRef}
          id="password"
          name="password"
          label="Password"
          error={errors.password}
          invalid={credentialsWrong}
          describedBy={alertIds}
          autoComplete="current-password"
          placeholder="••••••••"
          value={values.password}
          onChange={(e) => change("password", e.target.value)}
          disabled={isLoading}
          required
          aria-required
        />

        <SignInOptionsRow>
          <SignInCheckbox
            label="Keep me signed in"
            name="rememberMe"
            checked={values.rememberMe}
            onChange={(e) => setValues((prev) => ({ ...prev, rememberMe: e.target.checked }))}
          />
          <Link href="/forgot-password" className={signInLinkClass}>
            Forgot password?
          </Link>
        </SignInOptionsRow>

        <SignInPrimaryButton loading={isLoading} loadingText="Signing in…">
          Sign in
        </SignInPrimaryButton>
      </form>
    </>
  );
}
