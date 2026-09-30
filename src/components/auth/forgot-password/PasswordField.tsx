"use client";

import { useState, type ReactNode } from "react";
import { AuthField, PasswordInput, describedBy } from "../AuthField";

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
 * A labelled new-password input with its own show / hide toggle and an
 * error tied to it.
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
  return (
    <AuthField id={id} label={label} error={error} after={children}>
      <PasswordInput
        id={id}
        name={id}
        autoComplete="new-password"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        visible={visible}
        onToggleVisible={() => setVisible((shown) => !shown)}
        invalid={Boolean(error)}
        aria-describedby={describedBy(id, { error: Boolean(error), extra: describedByIds })}
        required
        aria-required
      />
    </AuthField>
  );
}
