import {
  DEFAULT_PASSWORD_POLICY,
  PASSWORD_RULES,
  historyNote,
  isPasswordValid,
  meetsPolicy,
  passwordNote,
  policySummary,
  rulesFromPolicy,
} from "@/app/lib/passwordPolicy";
import type { PasswordPolicy } from "@/types/inboxSettings";

const FULL: PasswordPolicy = { minLength: 8, requireUppercase: true, requireLowercase: true, requireNumber: true, requireSymbol: true, historyCount: 5 };

describe("rulesFromPolicy", () => {
  it("asks only for what the policy requires, in order", () => {
    expect(rulesFromPolicy(FULL).map((rule) => rule.id)).toEqual(["length", "upper", "lower", "number", "symbol"]);
    expect(rulesFromPolicy({ ...FULL, requireUppercase: false, requireSymbol: false, minLength: 10 }).map((rule) => rule.id)).toEqual([
      "length",
      "lower",
      "number",
    ]);
  });

  it("falls back to the hard-coded rules when the policy has not loaded", () => {
    expect(rulesFromPolicy(undefined).map((rule) => rule.label)).toEqual(PASSWORD_RULES.map((rule) => rule.label));
    expect(rulesFromPolicy(null).map((rule) => rule.id)).toEqual(PASSWORD_RULES.map((rule) => rule.id));
  });

  it("uses the server's symbol set exactly", () => {
    const symbol = rulesFromPolicy(FULL).find((rule) => rule.id === "symbol")!;
    for (const ch of '!@#$%^&*(),.?":{}|<>') expect(symbol.test(`a${ch}`)).toBe(true);
    for (const ch of "-_+=~[]/\\';`") expect(symbol.test(`a${ch}`)).toBe(false);
  });

  it("agrees with the hard-coded check on the default policy", () => {
    for (const candidate of ["Sturdy#Pass2026", "short1!", "nouppercase1!", "NOLOWER1!", "NoNumber!", "NoSymbol12"]) {
      expect(meetsPolicy(candidate, DEFAULT_PASSWORD_POLICY)).toBe(isPasswordValid(candidate));
    }
  });

  it("honours a longer minimum from the server", () => {
    expect(meetsPolicy("Sturdy#1", { ...FULL, minLength: 12 })).toBe(false);
    expect(meetsPolicy("Sturdy#Pass12", { ...FULL, minLength: 12 })).toBe(true);
  });
});

describe("policySummary", () => {
  it("reads the policy in one line", () => {
    expect(policySummary(FULL)).toBe("At least 8 characters, with upper and lower case letters, a number and a symbol");
    expect(policySummary({ ...FULL, requireUppercase: false, requireSymbol: false })).toBe("At least 8 characters, with a lowercase letter and a number");
    expect(policySummary({ ...FULL, minLength: 10, requireUppercase: false, requireLowercase: false, requireNumber: false, requireSymbol: false })).toBe(
      "At least 10 characters",
    );
    expect(policySummary(undefined)).toBe("At least 8 characters, with upper and lower case letters, a number and a symbol");
  });
});

describe("historyNote", () => {
  it("mentions the reuse rule only when there is one", () => {
    expect(historyNote(FULL)).toBe("You can't reuse your last 5 passwords.");
    expect(historyNote({ ...FULL, historyCount: 1 })).toBe("You can't reuse your last password.");
    expect(historyNote({ ...FULL, historyCount: 0 })).toBeNull();
    expect(historyNote(undefined)).toBeNull();
  });
});

describe("passwordNote", () => {
  it("reassures while the new password is empty", () => {
    expect(passwordNote("", "", FULL)).toEqual({ text: "You will stay signed in on this device.", ok: false });
  });

  it("names the first unmet rule", () => {
    expect(passwordNote("abc", "", FULL).text).toBe("Use at least 8 characters.");
    expect(passwordNote("abcdefgh", "", FULL).text).toBe("Include an uppercase letter.");
    expect(passwordNote("Abcdefgh", "", FULL).text).toBe("Include a number.");
    expect(passwordNote("Abcdefg1", "", FULL).text).toBe("Include a symbol such as ! @ # $ or %.");
    expect(passwordNote("ABCDEFG1!", "", FULL).text).toBe("Include a lowercase letter.");
  });

  it("then a mismatch, then says it looks good", () => {
    expect(passwordNote("Sturdy#Pass2026", "Sturdy#Pass", FULL)).toEqual({ text: "The two new passwords do not match yet.", ok: false });
    expect(passwordNote("Sturdy#Pass2026", "Sturdy#Pass2026", FULL)).toEqual({ text: "Looks good.", ok: true });
  });

  it("uses the server's minimum", () => {
    expect(passwordNote("Sturdy#1", "Sturdy#1", { ...FULL, minLength: 12 }).text).toBe("Use at least 12 characters.");
  });
});
