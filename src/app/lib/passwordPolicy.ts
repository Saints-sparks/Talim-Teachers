/**
 * Password rules shown to the user. Mirrors
 * `talimBE-V2/src/modules/user/service/security-config.service.ts` →
 * `passwordPolicy` and `security.service.ts` → `validatePasswordStrength`,
 * including the exact special-character set, so a password that passes here
 * never fails on the server.
 *
 * Two layers:
 * - {@link PASSWORD_RULES} / {@link isPasswordValid}: the backend's default
 *   policy, hard-coded (set-password, forgot-password, the requirements list).
 * - {@link rulesFromPolicy} and friends: the same rules built from
 *   `GET /auth/password-policy` (Settings → Security → Change password),
 *   falling back to the hard-coded ones when the policy can't be loaded.
 */
import type { PasswordPolicy } from "@/types/inboxSettings";

export interface PasswordRule {
  id: "length" | "upper" | "lower" | "number" | "symbol";
  label: string;
  test: (password: string) => boolean;
}

/** A rule with the one-line nudge shown while it is unmet ("Include a number."). */
export interface PolicyRule extends PasswordRule {
  hint: string;
}

export const PASSWORD_MIN_LENGTH = 8;

/** The special characters the server accepts as a symbol (`validatePasswordStrength`). */
export const PASSWORD_SYMBOL_PATTERN = /[!@#$%^&*(),.?":{}|<>]/;

const SYMBOL_LABEL = 'A symbol such as ! @ # $ % ^ & * ( ) , . ? " : { } | < >';

export const PASSWORD_RULES: PasswordRule[] = [
  { id: "length", label: `At least ${PASSWORD_MIN_LENGTH} characters`, test: (p) => p.length >= PASSWORD_MIN_LENGTH },
  { id: "upper", label: "An uppercase letter", test: (p) => /[A-Z]/.test(p) },
  { id: "lower", label: "A lowercase letter", test: (p) => /[a-z]/.test(p) },
  { id: "number", label: "A number", test: (p) => /\d/.test(p) },
  { id: "symbol", label: SYMBOL_LABEL, test: (p) => PASSWORD_SYMBOL_PATTERN.test(p) },
];

/**
 * @param password - Candidate password.
 * @returns Each rule with whether the password satisfies it.
 */
export function evaluatePassword(password: string): Array<PasswordRule & { met: boolean }> {
  return PASSWORD_RULES.map((rule) => ({ ...rule, met: rule.test(password) }));
}

/**
 * @param password - Candidate password.
 * @returns True when every rule is satisfied.
 */
export function isPasswordValid(password: string): boolean {
  return PASSWORD_RULES.every((rule) => rule.test(password));
}

/**
 * The backend's default policy, used whenever `GET /auth/password-policy`
 * has not answered (it matches {@link PASSWORD_RULES}; no history is claimed).
 */
export const DEFAULT_PASSWORD_POLICY: PasswordPolicy = {
  minLength: PASSWORD_MIN_LENGTH,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSymbol: true,
  historyCount: 0,
};

/**
 * The minimum length a policy asks for, guarding against a malformed answer.
 *
 * @param policy - The server's policy; the default when missing.
 * @returns A positive whole number of characters.
 */
export function policyMinLength(policy?: PasswordPolicy | null): number {
  const value = Number(policy?.minLength);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : PASSWORD_MIN_LENGTH;
}

/**
 * The rules a policy asks for, in the order they are checked and reported.
 * A missing policy gives the hard-coded default rules.
 *
 * @param policy - The server's policy, or nothing while it loads or after it failed.
 * @returns The rules, each with its label and hint.
 */
export function rulesFromPolicy(policy?: PasswordPolicy | null): PolicyRule[] {
  const source = policy ?? DEFAULT_PASSWORD_POLICY;
  const minLength = policyMinLength(source);
  const rules: PolicyRule[] = [
    {
      id: "length",
      label: `At least ${minLength} characters`,
      hint: `Use at least ${minLength} characters.`,
      test: (p) => p.length >= minLength,
    },
  ];
  if (source.requireUppercase) rules.push({ id: "upper", label: "An uppercase letter", hint: "Include an uppercase letter.", test: (p) => /[A-Z]/.test(p) });
  if (source.requireLowercase) rules.push({ id: "lower", label: "A lowercase letter", hint: "Include a lowercase letter.", test: (p) => /[a-z]/.test(p) });
  if (source.requireNumber) rules.push({ id: "number", label: "A number", hint: "Include a number.", test: (p) => /\d/.test(p) });
  if (source.requireSymbol) {
    rules.push({ id: "symbol", label: SYMBOL_LABEL, hint: "Include a symbol such as ! @ # $ or %.", test: (p) => PASSWORD_SYMBOL_PATTERN.test(p) });
  }
  return rules;
}

/**
 * Whether a password meets a policy.
 *
 * @param password - Candidate password.
 * @param policy - The server's policy; the default rules when missing.
 * @returns True when every rule is met.
 */
export function meetsPolicy(password: string, policy?: PasswordPolicy | null): boolean {
  return rulesFromPolicy(policy).every((rule) => rule.test(password));
}

/**
 * Joins phrases the way the copy reads: "a, b and c".
 *
 * @param items - The phrases.
 * @returns The joined phrase.
 */
function joinAnd(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/**
 * The policy in one line, for the Change password row and the new-password
 * placeholder: "At least 8 characters, with upper and lower case letters, a
 * number and a symbol".
 *
 * @param policy - The server's policy; the default rules when missing.
 * @returns The summary, without a full stop.
 */
export function policySummary(policy?: PasswordPolicy | null): string {
  const rules = rulesFromPolicy(policy);
  /**
   * Whether the policy asks for a rule.
   *
   * @param id - The rule.
   * @returns True when it is required.
   */
  const has = (id: PasswordRule["id"]) => rules.some((rule) => rule.id === id);
  const parts: string[] = [];
  if (has("upper") && has("lower")) parts.push("upper and lower case letters");
  else if (has("upper")) parts.push("an uppercase letter");
  else if (has("lower")) parts.push("a lowercase letter");
  if (has("number")) parts.push("a number");
  if (has("symbol")) parts.push("a symbol");
  const base = `At least ${policyMinLength(policy)} characters`;
  return parts.length ? `${base}, with ${joinAnd(parts)}` : base;
}

/**
 * The reuse rule as a sentence, when the policy has one.
 *
 * @param policy - The server's policy.
 * @returns "You can't reuse your last 5 passwords.", or null when there is no history rule.
 */
export function historyNote(policy?: PasswordPolicy | null): string | null {
  const count = Math.floor(Number(policy?.historyCount) || 0);
  if (count <= 0) return null;
  return count === 1 ? "You can't reuse your last password." : `You can't reuse your last ${count} passwords.`;
}

/** What the change-password sheet says under the fields, and whether the new password is ready. */
export interface PasswordNote {
  text: string;
  /** True only for "Looks good." */
  ok: boolean;
}

/**
 * The one line under the change-password fields (the design's note): a
 * reassurance while the new password is empty, then the first unmet rule,
 * then a mismatch, then "Looks good.".
 *
 * @param next - The new password.
 * @param confirm - Its confirmation.
 * @param policy - The server's policy; the default rules when missing.
 * @returns The note and whether the pair is valid.
 */
export function passwordNote(next: string, confirm: string, policy?: PasswordPolicy | null): PasswordNote {
  if (!next) return { text: "You will stay signed in on this device.", ok: false };
  const unmet = rulesFromPolicy(policy).find((rule) => !rule.test(next));
  if (unmet) return { text: unmet.hint, ok: false };
  if (next !== confirm) return { text: "The two new passwords do not match yet.", ok: false };
  return { text: "Looks good.", ok: true };
}
