/**
 * Launch hardening, integration pass: the pieces that tie the web to the
 * hardened API (new error codes and their messages, the "link Google from
 * the settings" hand-over, consent wording quoted by the Terms, the
 * security events shown to people and staff).
 */

import { describe, expect, it } from "vitest";
import { createTranslator } from "next-intl";
import en from "@/messages/en.json";
import ptBR from "@/messages/pt-BR.json";
import es from "@/messages/es.json";
import { TRANSLATED_CODES, describeApiError } from "@/lib/api-errors";
import {
  GOOGLE_LINK_MAX_AGE,
  parseGoogleLink,
  serializeGoogleLink,
} from "@/lib/auth-flow";
import { getLegalText } from "@/lib/legal-content";
import { PASSWORD_ISSUES, passwordIssues } from "@/lib/password-policy";
import { parseUrlSignInError } from "@/lib/sign-in-errors";

const LOCALES = { en, "pt-BR": ptBR, es } as const;
type Messages = typeof en;

function apiErrors(locale: keyof typeof LOCALES) {
  const t = createTranslator({
    locale,
    messages: LOCALES[locale] as Messages,
    namespace: "apiErrors",
  }) as unknown as (key: string, values?: Record<string, unknown>) => string;
  return (key: string, values?: Record<string, string | number>) =>
    t(key, values);
}

/** A syntactically valid (unsigned) JWT, as Google's ID token looks. */
const ID_TOKEN = [
  "eyJhbGciOiJSUzI1NiIsImtpZCI6IjEifQ",
  "eyJzdWIiOiIxMjM0NTY3ODkwIiwiZW1haWwiOiJhQGIuY29tIn0",
  "c2lnbmF0dXJlLXNpZ25hdHVyZS1zaWduYXR1cmU",
].join(".");
const USER_ID = "3f0c1a8e-5b1d-4c7a-9a55-1e2f3a4b5c6d";

describe("new API error codes have messages in every locale", () => {
  it.each(Object.keys(LOCALES) as (keyof typeof LOCALES)[])(
    "%s translates every TRANSLATED_CODE",
    (locale) => {
      const messages = LOCALES[locale].apiErrors as Record<string, unknown>;
      for (const code of TRANSLATED_CODES) {
        // A few codes are only ever rendered through a variant key.
        const variants = Object.keys(messages).filter(
          (key) => key === code || key.startsWith(`${code}_`),
        );
        expect(variants, `${locale}: ${code}`).not.toHaveLength(0);
      }
    },
  );

  it("explains ACCOUNT_LINK_REQUIRED with the way out", () => {
    const text = describeApiError(
      "ACCOUNT_LINK_REQUIRED",
      null,
      apiErrors("pt-BR"),
      "pt-BR",
    );
    expect(text).toContain("vincule o Google em Configurações › Segurança");
  });

  it("counts the live paid subscriptions of BILLING_HAS_PAID_SUBSCRIPTIONS", () => {
    const t = apiErrors("en");
    expect(
      describeApiError("BILLING_HAS_PAID_SUBSCRIPTIONS", { live: 3 }, t, "en"),
    ).toMatch(/^3 paid subscriptions are live/);
    expect(
      describeApiError("BILLING_HAS_PAID_SUBSCRIPTIONS", { live: 1 }, t, "en"),
    ).toMatch(/^1 paid subscription is live/);
    expect(
      describeApiError("BILLING_HAS_PAID_SUBSCRIPTIONS", {}, t, "en"),
    ).toMatch(/^Paid subscriptions are live/);
  });

  it("adds the wait to SERVICE_BUSY", () => {
    const text = describeApiError(
      "SERVICE_BUSY",
      { retry_after_seconds: 10 },
      apiErrors("en"),
      "en",
    );
    expect(text).toContain("busy");
    expect(text).toContain("10");
  });

  it("names a breached password", () => {
    expect(PASSWORD_ISSUES).toContain("breached");
    // Only the API can tell (Have I Been Pwned): never a local issue.
    expect(passwordIssues("Correct-Horse-9")).not.toContain("breached");
    const text = describeApiError(
      "WEAK_PASSWORD",
      { issues: ["breached"] },
      apiErrors("pt-BR"),
      "pt-BR",
    );
    expect(text).toContain(
      "Essa senha apareceu em vazamentos de dados; escolha outra.",
    );
  });

  it("accepts ACCOUNT_LINK_REQUIRED from a Google sign-in redirect", () => {
    expect(parseUrlSignInError("ACCOUNT_LINK_REQUIRED")).toEqual({
      code: "ACCOUNT_LINK_REQUIRED",
      meta: null,
    });
  });
});

describe("pending Google link (settings)", () => {
  it("round-trips for the account that started it", () => {
    const now = Date.UTC(2026, 8, 24, 12);
    const raw = serializeGoogleLink(USER_ID, ID_TOKEN, now);
    expect(parseGoogleLink(raw, now + 1000)).toEqual({
      userId: USER_ID,
      idToken: ID_TOKEN,
      expiresAt: now + GOOGLE_LINK_MAX_AGE * 1000,
    });
  });

  it("expires", () => {
    const now = Date.UTC(2026, 8, 24, 12);
    const raw = serializeGoogleLink(USER_ID, ID_TOKEN, now);
    expect(parseGoogleLink(raw, now + GOOGLE_LINK_MAX_AGE * 1000)).toBeNull();
  });

  it("refuses anything that isn't a JWT or is malformed", () => {
    const now = Date.now();
    expect(parseGoogleLink(undefined)).toBeNull();
    expect(parseGoogleLink("not json")).toBeNull();
    expect(
      parseGoogleLink(serializeGoogleLink(USER_ID, "abc.def", now), now),
    ).toBeNull();
    expect(
      parseGoogleLink(
        serializeGoogleLink(USER_ID, `${ID_TOKEN}"><script>`, now),
        now,
      ),
    ).toBeNull();
    expect(
      parseGoogleLink(serializeGoogleLink("", ID_TOKEN, now), now),
    ).toBeNull();
    expect(parseGoogleLink("x".repeat(9000))).toBeNull();
  });
});

describe("consent wording quoted by the Terms", () => {
  const strip = (text: string) => text.replace(/<\/?[a-z]+>/g, "");
  const quoted: Record<"en" | "es", string> = {
    en: "I have read and accept the Terms of Use and I am aware of the Privacy Policy",
    es: "He leído y acepto los Términos de Uso y conozco la Política de Privacidad",
  };

  it.each(["en", "es"] as const)(
    "%s sign-up checkbox starts with the Terms' quote",
    (locale) => {
      expect(strip(LOCALES[locale].legal.consent.terms)).toMatch(
        new RegExp(`^${quoted[locale]}`),
      );
      const terms = JSON.stringify(getLegalText("terms", locale));
      expect(terms).toContain(quoted[locale]);
    },
  );

  it.each(["en", "pt-BR", "es"] as const)(
    "%s re-acceptance checkbox doesn't claim the Privacy Policy is 'accepted'",
    (locale) => {
      const text = LOCALES[locale].terms.gate.checkbox;
      expect(text).not.toMatch(/(e a|and the|y la) (Política|Privacy)/);
    },
  );
});

describe("security events", () => {
  const NEW_ALERTS = [
    "google_linked",
    "google_unlinked",
    "password_reset_by_staff",
    "email_changed_by_staff",
    "login_locked",
    "reauth_sessions_revoked",
  ];

  it.each(Object.keys(LOCALES) as (keyof typeof LOCALES)[])(
    "%s explains the new security alerts",
    (locale) => {
      const alerts = LOCALES[locale].notifications.securityAlert as Record<
        string,
        string
      >;
      for (const event of NEW_ALERTS) expect(alerts[event]).toBeTruthy();
    },
  );

  it.each(Object.keys(LOCALES) as (keyof typeof LOCALES)[])(
    "%s labels the new audit actions",
    (locale) => {
      const actions = LOCALES[locale].staff.audit.actions as Record<
        string,
        string
      >;
      for (const action of [
        "user_login_succeeded",
        "user_identity_linked",
        "user_identity_unlinked",
        "user_recovery_codes_regenerated",
        "user_reauth_sessions_revoked",
        "billing_subscription_refunded",
      ]) {
        expect(actions[action]).toBeTruthy();
      }
    },
  );
});
