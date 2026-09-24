import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { MIDDLEWARE_MATCHER } from "@/lib/csp";
import {
  classifyPath,
  getLocaleSegment,
  isPublicPath,
  stripLocale,
} from "@/lib/route-access";
import {
  applyDiscount,
  isBillingEnforced,
  isPromotionActive,
  isUnlimited,
  maxYearlySavings,
  planPrice,
  yearlySavingsPercent,
} from "@/lib/pricing";
import { pickLocalized } from "@/lib/localized";
import { formatMoney } from "@/lib/money";
import {
  LEGAL_HREFS,
  LEGAL_VERSION,
  controllerIdentity,
  formatTaxId,
  legalHref,
  resolveController,
} from "@/lib/legal";
import { getLegalText } from "@/lib/legal-content";
import { LEGAL_DOCUMENTS } from "@/lib/links";
import type { PublicPlan } from "@/types/public";

const LOCALES = ["en", "pt-BR", "es"] as const;

describe("route access", () => {
  it("strips and reads the locale segment", () => {
    expect(getLocaleSegment("/pt-BR/pricing", LOCALES)).toBe("pt-BR");
    expect(getLocaleSegment("/pricing", LOCALES)).toBeNull();
    expect(stripLocale("/pt-BR", LOCALES)).toBe("/");
    expect(stripLocale("/es/legal/terms", LOCALES)).toBe("/legal/terms");
    expect(stripLocale("/dashboard", LOCALES)).toBe("/dashboard");
  });

  it("classifies the public site as public", () => {
    for (const path of [
      "/",
      "/pricing",
      "/pricing/",
      "/changelog",
      "/legal/terms",
      "/legal/guidelines",
      "/community-guidelines",
      "/unsubscribe",
    ]) {
      expect(classifyPath(path), path).toBe("public");
      expect(isPublicPath(path)).toBe(true);
    }
  });

  it("keeps the gated areas gated", () => {
    expect(classifyPath("/dashboard")).toBe("protected");
    expect(classifyPath("/dashboard/songs/1")).toBe("protected");
    expect(classifyPath("/change-password")).toBe("changePassword");
    expect(classifyPath("/login")).toBe("auth");
    expect(classifyPath("/login/google-consent")).toBe("auth");
    expect(classifyPath("/register")).toBe("auth");
    expect(classifyPath("/forgot-password")).toBe("other");
  });

  it("keeps proxy.ts's matcher in sync with lib/csp.ts", () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, "../../proxy.ts"),
      "utf8",
    );
    const literal = source.match(/matcher: \[\s*("(?:[^"\\]|\\.)*")/)?.[1];
    expect(literal).toBeDefined();
    expect(JSON.parse(literal!)).toBe(MIDDLEWARE_MATCHER);
  });

  it("runs the middleware on pages, even with a dot in the URL", () => {
    const matcher = new RegExp(`^${MIDDLEWARE_MATCHER}$`);
    for (const page of [
      "/",
      "/pt-BR",
      "/pt-BR/dashboard",
      "/pt-BR/dashboard/tours/abc.def",
      "/dashboard/songs/v1.2",
      "/en/login",
      "/s/abc123",
      "/g/abc123",
      "/status",
      "/apiary",
      "/pt-BR/dashboard/songs/x.js",
    ]) {
      expect(matcher.test(page), page).toBe(true);
    }
  });

  it("skips API routes, Next.js assets and root static files", () => {
    const matcher = new RegExp(`^${MIDDLEWARE_MATCHER}$`);
    for (const asset of [
      "/api",
      "/api/auth/session",
      "/_next/static/chunks/main.js",
      "/_next/image",
      "/sw.js",
      "/manifest.json",
      "/offline.html",
      "/offline.js",
      "/favicon.ico",
      "/icon0.svg",
      "/apple-icon.png",
      "/web-app-manifest-192x192.png",
      "/robots.txt",
      "/sitemap.xml",
    ]) {
      expect(matcher.test(asset), asset).toBe(false);
    }
  });

  it("does not treat look-alike paths as public", () => {
    expect(classifyPath("/pricing-old")).toBe("other");
    expect(classifyPath("/legalese")).toBe("other");
    expect(classifyPath("/dashboardx")).toBe("other");
  });
});

const plan = (overrides: Partial<PublicPlan> = {}): PublicPlan => ({
  code: "pro",
  name: { en: "Pro" },
  description: { en: "" },
  price_monthly_cents: 3990,
  price_yearly_cents: 39900,
  currency: "BRL",
  limits: {},
  features: {},
  highlighted: false,
  sort_order: 30,
  promotion: null,
  ...overrides,
});

describe("pricing", () => {
  it("formats BRL for each locale", () => {
    expect(formatMoney(3990, "BRL", "pt-BR").replace(/\s/g, " ")).toBe(
      "R$ 39,90",
    );
    expect(formatMoney(3990, "BRL", "en")).toBe("R$39.90");
    expect(formatMoney(4000, "BRL", "pt-BR", { compact: true })).toMatch(
      /R\$\s40$/,
    );
    expect(formatMoney(1490, "USD", "en")).toBe("$14.90");
    expect(formatMoney(1490, "XX", "en")).toBe("XX 14.90");
  });

  it("computes the yearly savings", () => {
    expect(yearlySavingsPercent(3990, 39900)).toBe(17);
    expect(yearlySavingsPercent(1000, 12000)).toBe(0);
    expect(yearlySavingsPercent(0, 0)).toBe(0);
    expect(
      maxYearlySavings([plan(), plan({ price_yearly_cents: 30000 })]),
    ).toBe(37);
  });

  it("applies promotions", () => {
    expect(applyDiscount(3990, 20)).toBe(3192);
    expect(applyDiscount(3990, 150)).toBe(0);
    const promo = planPrice(
      plan({
        promotion: {
          id: "x",
          headline: {},
          discount_percent: 50,
          ends_at: "2099-01-01T00:00:00",
        },
      }),
      "yearly",
    );
    expect(promo).toEqual({
      cents: 19950,
      originalCents: 39900,
      perMonthCents: 1663,
      isFree: false,
    });
    expect(planPrice(plan(), "monthly").originalCents).toBeNull();
  });

  it("reads the enforcement flag and promotion windows", () => {
    expect(isBillingEnforced(undefined)).toBe(false);
    expect(isBillingEnforced("false")).toBe(false);
    expect(isBillingEnforced("true")).toBe(true);
    const now = new Date("2026-09-23T12:00:00Z");
    expect(isPromotionActive("2026-09-23T13:00:00", now)).toBe(true);
    expect(isPromotionActive("2026-09-23T11:00:00", now)).toBe(false);
    expect(isPromotionActive(null, now)).toBe(false);
    expect(isUnlimited(1_000_000)).toBe(true);
    expect(isUnlimited(5000)).toBe(false);
  });
});

describe("localized text", () => {
  it("falls back to English, then any value", () => {
    expect(pickLocalized({ en: "Hi", "pt-BR": "Oi" }, "pt-BR")).toBe("Oi");
    expect(pickLocalized({ en: "Hi", "pt-BR": "Oi" }, "es")).toBe("Hi");
    expect(pickLocalized({ es: "Hola" }, "en")).toBe("Hola");
    expect(pickLocalized({ en: "  ", "pt-BR": "Oi" }, "en")).toBe("Oi");
    expect(pickLocalized(null, "en")).toBe("");
  });
});

describe("legal documents", () => {
  it("shares the API terms version", () => {
    expect(LEGAL_VERSION).toBe("2026-09-24");
    expect(LEGAL_HREFS.guidelines).toBe("/legal/guidelines");
    expect(legalHref("privacy", "rights")).toBe("/legal/privacy#rights");
  });

  it("identifies an individual by CPF and a company by CNPJ", () => {
    const person = resolveController({
      name: "Ana Souza",
      taxId: "12345678909",
      address: "Caixa Postal 1, Caxias do Sul/RS",
    });
    expect(person.kind).toBe("individual");
    expect(person.taxIdLabel).toBe("CPF");
    expect(person.taxId).toBe("123.456.789-09");
    expect(controllerIdentity("pt-BR", person)).toBe(
      "Ana Souza, pessoa física inscrita no CPF sob o nº 123.456.789-09, com endereço em Caixa Postal 1, Caxias do Sul/RS",
    );
    expect(controllerIdentity("en", person)).toContain("an individual");

    const company = resolveController({ taxId: "11.222.333/0001-81" });
    expect(company.kind).toBe("company");
    expect(company.taxId).toBe("11.222.333/0001-81");
    expect(company.name).toBe("[RAZÃO SOCIAL]");
    expect(controllerIdentity("es", company)).toContain("CNPJ");

    // Nothing configured: placeholders, worded as an individual.
    const empty = resolveController({});
    expect(empty.taxId).toBe("[CPF]");
    expect(empty.name).toBe("[NOME COMPLETO]");
    expect(formatTaxId("abc")).toBe("abc");
  });

  it("has every document in every language, with unique anchors", () => {
    for (const doc of LEGAL_DOCUMENTS) {
      for (const locale of LOCALES) {
        const text = getLegalText(doc, locale);
        expect(text.title, `${doc}/${locale}`).toBeTruthy();
        expect(text.sections.length).toBeGreaterThan(2);
        const ids = text.sections.map((s) => s.id);
        expect(new Set(ids).size).toBe(ids.length);
      }
      // Anchors are shared across languages so links survive a switch.
      const ptIds = getLegalText(doc, "pt-BR").sections.map((s) => s.id);
      expect(getLegalText(doc, "en").sections.map((s) => s.id)).toEqual(ptIds);
      expect(getLegalText(doc, "es").sections.map((s) => s.id)).toEqual(ptIds);
    }
  });

  it("never uses em dashes in the texts", () => {
    for (const doc of LEGAL_DOCUMENTS) {
      for (const locale of LOCALES) {
        expect(JSON.stringify(getLegalText(doc, locale))).not.toContain("—");
      }
    }
  });
});
