import { describe, expect, it } from "vitest";
import {
  REFERRAL_COOKIE,
  formatCountdown,
  googleTwoFactorMaxAge,
  parseGoogleTwoFactor,
  serializeGoogleTwoFactor,
  isCompleteRecoveryCode,
  normalizeReferralCode,
  parseGoogleIntent,
  parseGoogleSignup,
  readReferralCookie,
  referralCookieString,
  sanitizeOtp,
  sanitizeRecoveryCode,
} from "@/lib/auth-flow";
import {
  attemptsLeftOf,
  encodeSignInError,
  parseSignInError,
  twoFactorChallengeOf,
  waitSecondsOf,
} from "@/lib/sign-in-errors";
import { isAcceptableAvatarUrl, normalizeInstruments } from "@/lib/profile";

const LOCALES = ["en", "pt-BR", "es"] as const;

describe("sign-in errors", () => {
  it("round-trips a structured error", () => {
    const raw = encodeSignInError("ACCOUNT_LOCKED", {
      until: "2026-09-23T10:00:00",
    });
    expect(parseSignInError(raw)).toEqual({
      code: "ACCOUNT_LOCKED",
      meta: { until: "2026-09-23T10:00:00" },
    });
  });

  it("falls back to invalid credentials for unknown input", () => {
    expect(parseSignInError("CredentialsSignin").code).toBe(
      "INVALID_CREDENTIALS",
    );
    expect(parseSignInError(null).code).toBe("INVALID_CREDENTIALS");
    expect(parseSignInError('{"code":"NOPE"}').code).toBe(
      "INVALID_CREDENTIALS",
    );
  });

  it("extracts a two-factor challenge", () => {
    const error = parseSignInError(
      encodeSignInError("TWO_FACTOR_REQUIRED", {
        challenge_token: "abc",
        challenge_expires_at: "2026-09-23T10:05:00",
      }),
    );
    expect(twoFactorChallengeOf(error)).toEqual({
      token: "abc",
      expiresAt: "2026-09-23T10:05:00",
    });
    expect(
      twoFactorChallengeOf({ code: "TWO_FACTOR_REQUIRED", meta: {} }),
    ).toBeNull();
    expect(
      twoFactorChallengeOf({ code: "INVALID_CREDENTIALS", meta: null }),
    ).toBeNull();
  });

  it("computes the wait from retry_after_seconds or until", () => {
    expect(waitSecondsOf({ retry_after_seconds: 42.2 })).toBe(43);
    const now = Date.UTC(2026, 8, 23, 10, 0, 0);
    expect(waitSecondsOf({ until: "2026-09-23T10:15:00" }, now)).toBe(900);
    expect(waitSecondsOf({ until: "2026-09-23T09:00:00" }, now)).toBeNull();
    expect(waitSecondsOf(null)).toBeNull();
  });

  it("reads attempts_left", () => {
    expect(attemptsLeftOf({ attempts_left: 3 })).toBe(3);
    expect(attemptsLeftOf({ attempts_left: 0 })).toBe(0);
    expect(attemptsLeftOf({ attempts_left: "3" })).toBeNull();
  });
});

describe("referral codes", () => {
  it("normalizes codes", () => {
    expect(normalizeReferralCode(" k7m2qx9tpa ")).toBe("K7M2QX9TPA");
    expect(normalizeReferralCode("ab<script>")).toBe("ABSCRIPT");
    expect(normalizeReferralCode("   ")).toBeNull();
    expect(normalizeReferralCode(null)).toBeNull();
    expect(normalizeReferralCode("x".repeat(50))).toHaveLength(32);
  });

  it("writes and reads the cookie", () => {
    const cookie = referralCookieString("K7M2QX9TPA", true);
    expect(cookie).toContain(`${REFERRAL_COOKIE}=K7M2QX9TPA`);
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).toContain("Secure");
    expect(referralCookieString("A", false)).not.toContain("Secure");
    expect(readReferralCookie(`foo=1; ${REFERRAL_COOKIE}=abc123; bar=2`)).toBe(
      "ABC123",
    );
    expect(readReferralCookie("foo=1")).toBeNull();
  });
});

describe("Google intent", () => {
  it("parses a valid intent", () => {
    const intent = parseGoogleIntent(
      JSON.stringify({
        mode: "signin",
        locale: "pt-BR",
        referralCode: "abc",
        acceptTerms: true,
        marketingOptIn: false,
        callbackPath: "/pt-BR/dashboard/songs",
      }),
      LOCALES,
      "en",
    );
    expect(intent).toEqual({
      mode: "signin",
      locale: "pt-BR",
      referralCode: "ABC",
      acceptTerms: true,
      marketingOptIn: false,
      callbackPath: "/pt-BR/dashboard/songs",
    });
  });

  it("rejects unsafe values", () => {
    const intent = parseGoogleIntent(
      JSON.stringify({
        mode: "evil",
        locale: "xx",
        acceptTerms: "true",
        callbackPath: "//evil.example",
      }),
      LOCALES,
      "en",
    );
    expect(intent?.mode).toBe("signin");
    expect(intent?.locale).toBe("en");
    expect(intent?.acceptTerms).toBe(false);
    expect(intent?.callbackPath).toBeNull();
    expect(parseGoogleIntent("not json", LOCALES, "en")).toBeNull();
    expect(parseGoogleIntent(undefined, LOCALES, "en")).toBeNull();
  });

  it("drops an intent callback with control characters", () => {
    const intent = parseGoogleIntent(
      JSON.stringify({ callbackPath: "/%09/example.com" }),
      LOCALES,
      "en",
    );
    expect(intent?.callbackPath).toBeNull();
  });

  it("round-trips the two-factor challenge cookie", () => {
    const now = Date.parse("2026-01-01T00:00:00Z");
    const raw = serializeGoogleTwoFactor({
      token: "tok",
      expiresAt: "2026-01-01T00:05:00Z",
      callbackPath: "/pt-BR/dashboard",
    });
    expect(parseGoogleTwoFactor(raw, now)).toEqual({
      token: "tok",
      expiresAt: "2026-01-01T00:05:00Z",
      callbackPath: "/pt-BR/dashboard",
    });
    expect(googleTwoFactorMaxAge("2026-01-01T00:05:00Z", now)).toBe(300);
    expect(googleTwoFactorMaxAge("2026-01-02T00:00:00Z", now)).toBe(600);
    expect(googleTwoFactorMaxAge(null, now)).toBe(600);
  });

  it("rejects expired or malformed challenge cookies", () => {
    const now = Date.parse("2026-01-01T00:10:00Z");
    expect(
      parseGoogleTwoFactor(
        '{"challenge":"tok","expires":"2026-01-01T00:05:00Z"}',
        now,
      ),
    ).toBeNull();
    expect(parseGoogleTwoFactor('{"challenge":""}', now)).toBeNull();
    expect(
      parseGoogleTwoFactor(JSON.stringify({ challenge: "x".repeat(129) }), now),
    ).toBeNull();
    expect(parseGoogleTwoFactor("{", now)).toBeNull();
    expect(
      parseGoogleTwoFactor('{"challenge":"t","callbackPath":"//evil"}', now)
        ?.callbackPath,
    ).toBeNull();
  });

  it("parses the signup info", () => {
    expect(parseGoogleSignup('{"email":" a@b.c ","name":null}')).toEqual({
      email: "a@b.c",
      name: null,
    });
    expect(parseGoogleSignup("{")).toBeNull();
  });
});

describe("one-time codes", () => {
  it("keeps digits only", () => {
    expect(sanitizeOtp("12 34-56")).toBe("123456");
    expect(sanitizeOtp("1234567")).toBe("123456");
    expect(sanitizeOtp("abc")).toBe("");
  });

  it("formats recovery codes", () => {
    expect(sanitizeRecoveryCode("abcd efgh")).toBe("ABCD-EFGH");
    expect(sanitizeRecoveryCode("ABCD-EFGH-IJ")).toBe("ABCD-EFGH");
    expect(sanitizeRecoveryCode("ab")).toBe("AB");
    expect(isCompleteRecoveryCode("ABCD-EFGH")).toBe(true);
    expect(isCompleteRecoveryCode("ABCD-EFG")).toBe(false);
  });

  it("formats countdowns", () => {
    expect(formatCountdown(60)).toBe("1:00");
    expect(formatCountdown(9)).toBe("0:09");
    expect(formatCountdown(-3)).toBe("0:00");
  });
});

describe("profile rules", () => {
  it("normalizes instruments", () => {
    expect(
      normalizeInstruments([" Violão ", "violão", "", "Voz  principal"]),
    ).toEqual(["Violão", "Voz principal"]);
  });

  it("checks avatar URLs like the API", () => {
    expect(isAcceptableAvatarUrl("https://example.com/a.png")).toBe(true);
    expect(isAcceptableAvatarUrl("http://example.com/a.png")).toBe(false);
    expect(isAcceptableAvatarUrl("https://user:pw@example.com/a.png")).toBe(
      false,
    );
    expect(isAcceptableAvatarUrl("https://127.0.0.1/a.png")).toBe(false);
    expect(isAcceptableAvatarUrl("https://[::1]/a.png")).toBe(false);
    expect(isAcceptableAvatarUrl("https://localhost/a.png")).toBe(false);
    expect(isAcceptableAvatarUrl("https://printer.local/a.png")).toBe(false);
    expect(isAcceptableAvatarUrl("https://example.com/a.SVG")).toBe(false);
    expect(
      isAcceptableAvatarUrl(`https://example.com/${"a".repeat(500)}`),
    ).toBe(false);
  });
});
