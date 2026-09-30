"use client";

import React, { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { AlertCircle, Eye, EyeOff, ShieldAlert } from "lucide-react";
import { focusRing } from "@/components/tl/styles";

/**
 * The class string of a text input on the signed-out screens: 48px tall, the
 * control border, red once the field is invalid.
 *
 * @param invalid - Whether the field has an error.
 * @returns The class string.
 */
export function authInputClass(invalid = false): string {
  return `min-h-[48px] w-full rounded-[13px] border bg-tl-surface px-3.5 text-[15px] font-semibold text-tl-ink placeholder:font-medium placeholder:text-tl-faint disabled:cursor-not-allowed disabled:opacity-60 ${focusRing} ${
    invalid ? "border-tl-danger" : "border-tl-control"
  }`;
}

/**
 * The `aria-describedby` of a field: its hint and its error, whichever it has.
 *
 * @param id - The input's id.
 * @param parts - Which descriptions are on screen.
 * @param parts.hint - A hint is shown (`${id}-hint`).
 * @param parts.error - An error is shown (`${id}-error`).
 * @param parts.extra - Other ids to add (a rules list).
 * @returns The ids, space separated, or undefined when there are none.
 */
export function describedBy(id: string, { hint = false, error = false, extra = [] }: { hint?: boolean; error?: boolean; extra?: string[] }): string | undefined {
  const ids = [error ? `${id}-error` : null, hint ? `${id}-hint` : null, ...extra].filter(Boolean);
  return ids.length ? ids.join(" ") : undefined;
}

/** Props for {@link AuthField}. */
export interface AuthFieldProps {
  /** The input's id; the label, hint and error are tied to it. */
  id: string;
  label: ReactNode;
  /** A line under the input that stays (a format example). */
  hint?: ReactNode;
  /** What is wrong with the value; shown in red and read with the field. */
  error?: string | null;
  /** The input itself, with `aria-describedby={describedBy(id, …)}`. */
  children: ReactNode;
  /** Extra content under the error (a rules checklist). */
  after?: ReactNode;
}

/**
 * A labelled field of a signed-out form: the label, the input, a hint and an
 * error whose ids the input names in `aria-describedby` (see {@link describedBy}).
 *
 * @param props - See {@link AuthFieldProps}.
 * @param props.id - The input's id.
 * @param props.label - The visible label.
 * @param props.hint - A lasting hint.
 * @param props.error - The error, when there is one.
 * @param props.children - The input.
 * @param props.after - Content under the error.
 * @returns The field.
 */
export function AuthField({ id, label, hint, error, children, after }: AuthFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-bold text-tl-ink">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="flex items-start gap-1.5 text-[13px] font-semibold text-tl-danger">
          <AlertCircle className="mt-px h-4 w-4 shrink-0" aria-hidden />
          <span>{error}</span>
        </p>
      ) : null}
      {hint ? (
        <p id={`${id}-hint`} className="text-[13px] leading-normal text-tl-muted">
          {hint}
        </p>
      ) : null}
      {after}
    </div>
  );
}

/** Props for {@link PasswordInput}. */
export interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  id: string;
  /** The password is shown as text. */
  visible: boolean;
  /** Flips {@link PasswordInputProps.visible}. */
  onToggleVisible: () => void;
  /** Red border and `aria-invalid`. */
  invalid?: boolean;
  /** The toggle's accessible names while hidden and while shown. */
  toggleLabels?: readonly [show: string, hide: string];
  /** Leave the toggle out (a second field that follows the first one's toggle). */
  hideToggle?: boolean;
}

/**
 * A password input with a 44px show/hide button inside its right edge. The
 * button is a plain `type="button"`, so it never submits the form.
 *
 * @param props - See {@link PasswordInputProps}; the rest go to the input.
 * @param ref - Forwarded to the input, for focusing it on an error.
 * @returns The input and its toggle.
 */
export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(function PasswordInput(
  { id, visible, onToggleVisible, invalid = false, toggleLabels = ["Show password", "Hide password"], hideToggle = false, className, ...input },
  ref,
) {
  return (
    <div className="relative">
      <input
        ref={ref}
        id={id}
        type={visible ? "text" : "password"}
        aria-invalid={invalid || undefined}
        className={`${authInputClass(invalid)} ${hideToggle ? "" : "pr-14"} ${className ?? ""}`}
        {...input}
      />
      {hideToggle ? null : (
        <button
          type="button"
          onClick={onToggleVisible}
          aria-label={visible ? toggleLabels[1] : toggleLabels[0]}
          aria-controls={id}
          title={visible ? toggleLabels[1] : toggleLabels[0]}
          className={`absolute right-0.5 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-[11px] text-tl-muted hover:bg-tl-bg hover:text-tl-ink ${focusRing}`}
        >
          {visible ? <EyeOff className="h-[18px] w-[18px]" aria-hidden /> : <Eye className="h-[18px] w-[18px]" aria-hidden />}
        </button>
      )}
    </div>
  );
});

/** How a {@link FormAlert} is coloured. */
export type FormAlertTone = "danger" | "warning" | "neutral";

const ALERT_TONE: Record<FormAlertTone, string> = {
  danger: "bg-tl-danger-bg",
  warning: "bg-tl-warning-bg",
  neutral: "border border-tl-line bg-tl-subtle",
};

const ALERT_ICON: Record<FormAlertTone, string> = {
  danger: "text-tl-danger",
  warning: "text-tl-warning",
  neutral: "text-tl-muted",
};

/** Props for {@link FormAlert}. */
export interface FormAlertProps {
  tone: FormAlertTone;
  /** A bold first line. */
  title?: ReactNode;
  children: ReactNode;
  /** The id a field can name in `aria-describedby`. */
  id?: string;
  /** Draw the shield (access refused) instead of the circle. */
  shield?: boolean;
}

/**
 * A banner above a form for a failure that is not one field's (wrong
 * password, refused account, server trouble). `role="alert"`, so it is read
 * out as soon as it appears.
 *
 * @param props - See {@link FormAlertProps}.
 * @param props.tone - The colour.
 * @param props.title - The bold first line.
 * @param props.children - The explanation.
 * @param props.id - An id for `aria-describedby`.
 * @param props.shield - Draw the shield icon.
 * @returns The banner.
 */
export function FormAlert({ tone, title, children, id, shield = false }: FormAlertProps) {
  const Icon = shield ? ShieldAlert : AlertCircle;
  return (
    <div id={id} role="alert" className={`flex items-start gap-3 rounded-2xl px-4 py-3.5 text-tl-ink ${ALERT_TONE[tone]}`}>
      <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${ALERT_ICON[tone]}`} aria-hidden />
      <div className="min-w-0 text-sm leading-[1.55]">
        {title ? <p className={`font-extrabold ${ALERT_ICON[tone] === "text-tl-muted" ? "text-tl-ink" : ALERT_ICON[tone]}`}>{title}</p> : null}
        <div className={title ? "mt-0.5 text-tl-body" : "text-tl-ink"}>{children}</div>
      </div>
    </div>
  );
}
