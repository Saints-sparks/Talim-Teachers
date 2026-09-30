"use client";

import React, { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/app/hooks/useAuth";
import { primaryButton, textLink, focusRing } from "@/components/tl/styles";
import {
  INVALID_CREDENTIALS_TEXT,
  classifyLoginError,
  validateSignIn,
  type LoginError,
  type SignInFieldErrors,
  type SignInValues,
} from "@/hooks/auth/signIn.logic";
import { AuthField, FormAlert, PasswordInput, authInputClass, describedBy } from "./AuthField";

/** The id of the banner a refused sign-in shows, which the password field names. */
const ALERT_ID = "signin-alert";

/**
 * The banner for a refused sign-in.
 *
 * @param props - The failure.
 * @param props.error - Why the sign-in was refused.
 * @returns The banner.
 */
function LoginErrorAlert({ error }: { error: LoginError }) {
  if (error.kind === "access_denied") {
    return (
      <FormAlert id={ALERT_ID} tone="danger" title="Access denied" shield>
        {error.message}
      </FormAlert>
    );
  }
  if (error.kind === "invalid_credentials") {
    return (
      <FormAlert id={ALERT_ID} tone="warning">
        {INVALID_CREDENTIALS_TEXT}
      </FormAlert>
    );
  }
  return (
    <FormAlert id={ALERT_ID} tone="neutral">
      {error.message}
    </FormAlert>
  );
}

/**
 * The sign-in form: email or staff number, password (with show/hide), keep
 * me signed in and "Forgot password?". Empty fields are caught before
 * anything is sent, each error is tied to its field and the first one gets
 * focus. The sign-in itself is the auth context's `login`, unchanged: it
 * admits teachers and sub-admins only and routes on (set-password,
 * onboarding or Today); a refusal is shown as a banner above the fields.
 *
 * @returns The form.
 */
export function SignInForm() {
  const { login, isLoading } = useAuth();
  const [values, setValues] = useState<SignInValues>({ identifier: "", password: "", rememberMe: false });
  const [errors, setErrors] = useState<SignInFieldErrors>({});
  const [loginError, setLoginError] = useState<LoginError | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const identifierRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const change = (field: "identifier" | "password", value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

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

  return (
    <form onSubmit={handleSubmit} noValidate aria-label="Sign in" className="flex flex-col gap-[18px]">
      {loginError ? <LoginErrorAlert error={loginError} /> : null}

      <AuthField id="identifier" label="Email or staff number" hint="A staff number looks like ESEC-260200001." error={errors.identifier}>
        <input
          ref={identifierRef}
          id="identifier"
          name="identifier"
          type="text"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="you@school.com"
          value={values.identifier}
          onChange={(e) => change("identifier", e.target.value)}
          disabled={isLoading}
          required
          aria-required
          aria-invalid={Boolean(errors.identifier) || credentialsWrong || undefined}
          aria-describedby={describedBy("identifier", { hint: true, error: Boolean(errors.identifier), extra: credentialsWrong ? [ALERT_ID] : [] })}
          className={authInputClass(Boolean(errors.identifier))}
        />
      </AuthField>

      <AuthField id="password" label="Password" error={errors.password}>
        <PasswordInput
          ref={passwordRef}
          id="password"
          name="password"
          autoComplete="current-password"
          value={values.password}
          onChange={(e) => change("password", e.target.value)}
          visible={showPassword}
          onToggleVisible={() => setShowPassword((v) => !v)}
          invalid={Boolean(errors.password) || credentialsWrong}
          disabled={isLoading}
          required
          aria-required
          aria-describedby={describedBy("password", { error: Boolean(errors.password), extra: credentialsWrong ? [ALERT_ID] : [] })}
        />
      </AuthField>

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <label className="flex min-h-[44px] cursor-pointer select-none items-center gap-2.5 text-sm font-semibold text-tl-body">
          <input
            type="checkbox"
            name="rememberMe"
            checked={values.rememberMe}
            onChange={(e) => setValues((prev) => ({ ...prev, rememberMe: e.target.checked }))}
            className={`h-5 w-5 shrink-0 cursor-pointer rounded accent-tl-brand-fill ${focusRing}`}
          />
          Keep me signed in
        </label>
        <Link href="/forgot-password" className={textLink}>
          Forgot password?
        </Link>
      </div>

      <button type="submit" disabled={isLoading} className={`${primaryButton} w-full min-h-[50px] text-[15px]`}>
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Signing in…
          </>
        ) : (
          "Sign in"
        )}
      </button>
    </form>
  );
}
