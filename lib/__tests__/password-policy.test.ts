import { describe, expect, it } from "vitest";
import {
  generateStrongPassword,
  isPasswordCompliant,
  passwordIssues,
  passwordRuleStates,
  passwordStrength,
} from "@/lib/password-policy";

describe("passwordIssues", () => {
  it("accepts a password that meets every rule", () => {
    expect(passwordIssues("Str0ng!Passw0rd")).toEqual([]);
  });

  it("reports every broken rule in the API's order", () => {
    expect(passwordIssues("abc")).toEqual([
      "too_short",
      "missing_uppercase",
      "missing_digit",
      "missing_symbol",
    ]);
  });

  it("counts characters, not UTF-16 units", () => {
    // Accented letters count as one character each, like the API's
    // `chars().count()`.
    expect(passwordIssues("Aa1!ção")).toContain("too_short");
    expect(passwordIssues("Aa1!çãoé")).not.toContain("too_short");
  });

  it("rejects passwords containing the username, case-insensitively", () => {
    expect(passwordIssues("MyAlice!2026", "alice")).toContain(
      "contains_username",
    );
    expect(passwordIssues("MyAlice!2026", "al")).not.toContain(
      "contains_username",
    );
  });

  it("rejects well-known passwords even when they meet the character rules", () => {
    expect(passwordIssues("Password123!")).toContain("too_common");
    expect(isPasswordCompliant("Senha@123")).toBe(false);
  });
});

describe("passwordRuleStates / passwordStrength", () => {
  it("tracks each checklist rule", () => {
    expect(passwordRuleStates("abcdefgh")).toEqual({
      length: true,
      lowercase: true,
      uppercase: false,
      digit: false,
      symbol: false,
    });
  });

  it("scores longer compliant passwords higher", () => {
    expect(passwordStrength("")).toBe(0);
    expect(passwordStrength("Str0ng!P")).toBe(3);
    expect(passwordStrength("Str0ng!Passw0rd-long")).toBe(4);
    expect(passwordStrength("Password123!")).toBe(1);
  });
});

describe("generateStrongPassword", () => {
  it("always produces a compliant password of the requested length", () => {
    for (let i = 0; i < 200; i++) {
      const password = generateStrongPassword(16);
      expect(password).toHaveLength(16);
      expect(isPasswordCompliant(password)).toBe(true);
    }
  });

  it("never goes below the minimum length", () => {
    expect(generateStrongPassword(2).length).toBeGreaterThanOrEqual(8);
  });
});
