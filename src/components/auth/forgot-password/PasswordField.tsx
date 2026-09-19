"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { inputClass, labelClass } from "./styles";

/** Props for {@link PasswordField}. */
export interface PasswordFieldProps {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  /** Rendered under the input, e.g. the password checklist. */
  children?: React.ReactNode;
}

/**
 * A labelled password input with its own show / hide toggle.
 *
 * @param props - See {@link PasswordFieldProps}.
 * @param props.id - The input's id, tied to the label.
 * @param props.label - The visible label.
 * @param props.placeholder - Placeholder text.
 * @param props.value - The current value.
 * @param props.onChange - Called with the new value.
 * @param props.children - Content shown under the input.
 * @returns The field element.
 */
export function PasswordField({ id, label, placeholder, value, onChange, children }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className={labelClass}>
        {label}
      </Label>
      <div className="relative">
        <Input
          id={id}
          type={visible ? "text" : "password"}
          autoComplete="new-password"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${inputClass} pr-12`}
          required
        />
        <button
          type="button"
          onClick={() => setVisible((shown) => !shown)}
          aria-label={visible ? "Hide password" : "Show password"}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
        >
          {visible ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
      </div>
      {children}
    </div>
  );
}
