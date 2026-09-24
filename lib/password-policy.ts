/**
 * The platform password policy, mirrored from the API
 * (`setlyst-api/src/validations/password.rs`) so forms can show a live
 * checklist before anything is submitted. The API remains the authority —
 * it re-checks every rule and answers `WEAK_PASSWORD` with the same issue
 * codes used here.
 */

export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 128;

export const PASSWORD_ISSUES = [
  "too_short",
  "too_long",
  "missing_lowercase",
  "missing_uppercase",
  "missing_digit",
  "missing_symbol",
  "contains_username",
  "too_common",
  /**
   * Found in a public breach corpus (the API checks Have I Been Pwned by
   * k-anonymity). Only the API can tell: never produced by
   * `passwordIssues`.
   */
  "breached",
] as const;

export type PasswordIssue = (typeof PASSWORD_ISSUES)[number];

/** The rules shown as a checklist, in display order. */
export const PASSWORD_RULES = [
  "length",
  "lowercase",
  "uppercase",
  "digit",
  "symbol",
] as const;

export type PasswordRule = (typeof PASSWORD_RULES)[number];

const COMMON_PASSWORDS = new Set([
  "password",
  "password1",
  "password1!",
  "password123",
  "password123!",
  "passw0rd",
  "passw0rd!",
  "p@ssw0rd",
  "p@ssword1",
  "p@ssw0rd1",
  "p@ssw0rd123",
  "qwerty123",
  "qwerty123!",
  "qwerty@123",
  "abc12345",
  "abc123456",
  "abcd1234",
  "abc@1234",
  "12345678",
  "123456789",
  "1234567890",
  "11111111",
  "iloveyou",
  "iloveyou1",
  "welcome1",
  "welcome1!",
  "welcome123",
  "welcome@123",
  "admin123",
  "admin@123",
  "admin123!",
  "letmein1",
  "letmein1!",
  "changeme",
  "changeme1",
  "changeme1!",
  "senha123",
  "senha@123",
  "senha123!",
  "mudar123",
  "mudar@123",
  "setlyst123",
  "setlyst@123",
  "setlyst123!",
  "football1",
  "baseball1",
  "sunshine1",
  "princess1",
  "dragon123",
  "monkey123",
  "master123",
  "summer2024!",
  "summer2025!",
  "summer2026!",
  "winter2025!",
  "winter2026!",
  "brasil123",
  "brasil@123",
]);

const LOWER = /\p{Ll}/u;
const UPPER = /\p{Lu}/u;
const DIGIT = /\p{N}/u;
const SYMBOL = /[^\p{L}\p{N}\s]/u;

/** Length in characters (code points), matching the API's `chars().count()`. */
function charLength(value: string): number {
  return Array.from(value).length;
}

/** Every rule `password` breaks, in the API's order. Empty = compliant. */
export function passwordIssues(
  password: string,
  username?: string | null,
): PasswordIssue[] {
  const issues: PasswordIssue[] = [];
  const length = charLength(password);

  if (length < MIN_PASSWORD_LENGTH) issues.push("too_short");
  if (length > MAX_PASSWORD_LENGTH) issues.push("too_long");
  if (!LOWER.test(password)) issues.push("missing_lowercase");
  if (!UPPER.test(password)) issues.push("missing_uppercase");
  if (!DIGIT.test(password)) issues.push("missing_digit");
  if (!SYMBOL.test(password)) issues.push("missing_symbol");

  const name = username?.trim();
  if (
    name &&
    charLength(name) >= 3 &&
    password.toLowerCase().includes(name.toLowerCase())
  ) {
    issues.push("contains_username");
  }

  if (COMMON_PASSWORDS.has(password.toLowerCase())) issues.push("too_common");

  return issues;
}

export function isPasswordCompliant(
  password: string,
  username?: string | null,
): boolean {
  return passwordIssues(password, username).length === 0;
}

/** Checklist state for each displayed rule. */
export function passwordRuleStates(
  password: string,
): Record<PasswordRule, boolean> {
  const issues = new Set(passwordIssues(password));
  return {
    length: !issues.has("too_short") && !issues.has("too_long"),
    lowercase: !issues.has("missing_lowercase"),
    uppercase: !issues.has("missing_uppercase"),
    digit: !issues.has("missing_digit"),
    symbol: !issues.has("missing_symbol"),
  };
}

/**
 * A 0–4 strength score for the meter. Compliance is binary (see
 * `passwordIssues`); this only rewards going beyond the minimum.
 */
export function passwordStrength(password: string): 0 | 1 | 2 | 3 | 4 {
  if (!password) return 0;
  const issues = passwordIssues(password);
  if (issues.includes("too_common")) return 1;
  if (issues.length > 0) {
    const met = Object.values(passwordRuleStates(password)).filter(Boolean);
    return met.length >= 4 ? 2 : 1;
  }
  return charLength(password) >= 14 ? 4 : 3;
}

export function isPasswordIssue(value: unknown): value is PasswordIssue {
  return (
    typeof value === "string" &&
    (PASSWORD_ISSUES as readonly string[]).includes(value)
  );
}

const GENERATOR_SETS = {
  lower: "abcdefghijkmnopqrstuvwxyz",
  upper: "ABCDEFGHJKLMNPQRSTUVWXYZ",
  digit: "23456789",
  symbol: "!@#$%&*-_+=?",
} as const;

/**
 * A random password that always satisfies the policy — used by staff to
 * issue temporary passwords. Ambiguous characters (0/O, 1/l/I) are left
 * out, since a temporary password is often read out loud or copied by
 * hand.
 */
export function generateStrongPassword(length = 16): string {
  const size = Math.max(MIN_PASSWORD_LENGTH, Math.min(64, length));
  const all = Object.values(GENERATOR_SETS).join("");
  const random = (max: number) => {
    const buffer = new Uint32Array(1);
    globalThis.crypto.getRandomValues(buffer);
    return buffer[0] % max;
  };
  const pickFrom = (set: string) => set[random(set.length)];

  const chars = Object.values(GENERATOR_SETS).map(pickFrom);
  while (chars.length < size) chars.push(pickFrom(all));

  // Fisher–Yates, so the guaranteed classes don't sit at the start.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = random(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}
