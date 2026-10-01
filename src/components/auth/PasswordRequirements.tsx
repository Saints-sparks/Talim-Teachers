"use client";

import { Check, Circle } from "lucide-react";
import { evaluatePassword } from "@/app/lib/passwordPolicy";

/**
 * Live checklist of the password rules (the server's default policy, see
 * `passwordPolicy`): small grey items, a met rule turns green with a tick.
 * Announced politely to screen readers so each rule's change is heard as the
 * user types, and each rule says "Met" or "Not yet" to them.
 *
 * @param props - The password and an id.
 * @param props.password - The password typed so far.
 * @param props.id - The list's id, for the input's `aria-describedby`.
 * @returns The checklist.
 */
export default function PasswordRequirements({ password, id }: { password: string; id?: string }) {
  const rules = evaluatePassword(password);
  return (
    <ul id={id} aria-live="polite" aria-label="Password rules" className="mt-2 grid gap-1.5 text-xs sm:grid-cols-2">
      {rules.map((rule) => (
        <li key={rule.id} className={`flex items-center gap-1.5 ${rule.met ? "text-emerald-700 dark:text-emerald-400" : "text-gray-500 dark:text-slate-400"}`}>
          {rule.met ? <Check className="h-3.5 w-3.5 shrink-0" aria-hidden /> : <Circle className="h-3.5 w-3.5 shrink-0" aria-hidden />}
          <span>
            <span className="sr-only">{rule.met ? "Met: " : "Not yet: "}</span>
            {rule.label}
          </span>
        </li>
      ))}
    </ul>
  );
}
