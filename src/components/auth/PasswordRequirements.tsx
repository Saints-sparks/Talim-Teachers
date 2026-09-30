"use client";

import { Check, Circle } from "lucide-react";
import { evaluatePassword } from "@/app/lib/passwordPolicy";

/**
 * Live checklist of the password rules (the server's policy, see
 * `passwordPolicy`), in the redesign's tokens: a met rule turns green with a
 * tick. Announced politely to screen readers so each rule's change is heard
 * as the user types, and each rule says "Met" or "Not yet" to them.
 *
 * @param props - The password and an id.
 * @param props.password - The password typed so far.
 * @param props.id - The list's id, for the input's `aria-describedby`.
 * @returns The checklist.
 */
export default function PasswordRequirements({ password, id }: { password: string; id?: string }) {
  const rules = evaluatePassword(password);
  return (
    <ul id={id} aria-live="polite" aria-label="Password rules" className="mt-1 grid gap-1.5 text-[13px] sm:grid-cols-2">
      {rules.map((rule) => (
        <li key={rule.id} className={`flex items-start gap-1.5 ${rule.met ? "font-bold text-tl-success" : "text-tl-muted"}`}>
          {rule.met ? <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden /> : <Circle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />}
          <span>
            <span className="sr-only">{rule.met ? "Met: " : "Not yet: "}</span>
            {rule.label}
          </span>
        </li>
      ))}
    </ul>
  );
}
