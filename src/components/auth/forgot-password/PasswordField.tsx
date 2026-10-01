"use client";

import { useState, type ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signInDescribedBy } from "../signin-ui";
import { errorClass, inputClass, invalidInputClass, labelClass } from "./styles";

/** Props for {@link PasswordField}. */
export interface PasswordFieldProps {
  id: string;
  label: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  /** What is wrong with the value, shown under the field. */
  error?: string | null;
  /** Ids of content that describes the field (a rules list). */
  describedByIds?: string[];
  /** Rendered under the input, e.g. the password checklist. */
  children?: ReactNode;
}

/**
 * A labelled new-password input with its own show / hide toggle (a 44px
 * button that never submits) and an error tied to it with `aria-describedby`.
 *
 * @param props - See {@link PasswordFieldProps}.
 * @param props.id - The input's id, tied to the label.
 * @param props.label - The visible label.
 * @param props.placeholder - Placeholder text.
 * @param props.value - The current value.
 * @param props.onChange - Called with the new value.
 * @param props.error - The error, when there is one.
 * @param props.describedByIds - Other describing ids.
 * @param props.children - Content shown under the input.
 * @returns The field element.
 */
export function PasswordField({ id, label, placeholder, value, onChange, error, describedByIds = [], children }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const toggleLabel = visible ? "Hide password" : "Show password";
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className={labelClass}>
        {label}
      </Label>
      <div className="relative">
        <Input
          id={id}
          name={id}
          type={visible ? "text" : "password"}
          autoComplete="new-password"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={signInDescribedBy(id, { error: Boolean(error), extra: describedByIds })}
          className={`${inputClass} pr-12 ${error ? invalidInputClass : ""}`}
          required
          aria-required
        />
        <button
          type="button"
          onClick={() => setVisible((shown) => !shown)}
          aria-label={toggleLabel}
          aria-controls={id}
          title={toggleLabel}
          className="absolute right-0.5 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200"
        >
          {visible ? <EyeOff className="h-5 w-5" aria-hidden /> : <Eye className="h-5 w-5" aria-hidden />}
        </button>
      </div>
      {error ? (
        <p id={`${id}-error`} className={errorClass}>
          {error}
        </p>
      ) : null}
      {children}
    </div>
  );
}
