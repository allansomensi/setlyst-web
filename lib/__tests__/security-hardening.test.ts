import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/i18n/routing", () => ({
  routing: { locales: ["en", "pt-BR", "es"], defaultLocale: "en" },
}));

import { redactAnalyticsUrl, REDACTED } from "@/lib/analytics";
import {
  apiPath,
  assertSafeEndpoint,
  redactEndpointForLog,
} from "@/lib/api-endpoint";
import {
  parseGoogleIntent,
  parseGoogleSignInError,
  reauthBody,
  reauthMethodOf,
  serializeGoogleSignInError,
} from "@/lib/auth-flow";
import { validTimeZone } from "@/lib/dates";
import { safeAuthRedirect, safeCallbackPath } from "@/lib/links";
import { localizeHref } from "@/lib/offline/navigation";
import {
  isStaffTwoFactorExempt,
  loginCallbackOf,
  signedInRedirectPath,
} from "@/lib/route-access";
import {
  clientApiEndpoint,
  isAllowedClientApiRoute,
} from "@/lib/server/client-api-routes";
import { clientIpTrustWarning } from "@/lib/server/client-ip";
import { isSameOriginRequest } from "@/lib/server/request-guards";
import { TokenBucketLimiter } from "@/lib/server/token-bucket";
import {
  parseSignInError,
  parseUrlSignInError,
  sanitizeSignInMeta,
} from "@/lib/sign-in-errors";

const LOCALES = ["en", "pt-BR", "es"] as const;
const UUID = "3f2a1b4c-5d6e-4f70-8a9b-0c1d2e3f4a5b";

describe("assertSafeEndpoint", () => {
  const safe = (endpoint: string) => () => assertSafeEndpoint(endpoint);

  it("accepts ordinary root-relative endpoints", () => {
    expect(safe("/users/me")).not.toThrow();
    expect(safe(`/setlists/${UUID}/songs?page=2`)).not.toThrow();
    expect(safe("/songs/tags/rock%20n%20roll")).not.toThrow();
  });

  it("refuses anything that could leave the API or re-target it", () => {
    for (const endpoint of [
      "users/me",
      "https://evil.example/x",
      "//evil.example/x",
      "/public/setlists/../../users/me",
      "/public/setlists/%2e%2e/users/me",
      "/public/setlists/%2E%2E",
      "/a/./b",
      "/a/%2e/b",
      "/a\\b",
      "/a/%2fb",
      "/a/%5cb",
      "/a/%zz",
      "/a\u0000b",
      "/a\nb",
      "/a\u007fb",
    ]) {
      expect(safe(endpoint), endpoint).toThrow();
    }
  });
});

describe("apiPath", () => {
  it("keeps every interpolated value a single segment", () => {
    expect(apiPath`/songs/${"a/b"}`).toBe("/songs/a%2Fb");
    expect(apiPath`/songs/${"x?admin=1"}`).toBe("/songs/x%3Fadmin%3D1");
    expect(apiPath`/songs/${"#frag"}`).toBe("/songs/%23frag");
    expect(apiPath`/songs/${".."}/lyrics`).toBe("/songs/../lyrics");
    expect(() => assertSafeEndpoint(apiPath`/songs/${".."}/lyrics`)).toThrow();
    expect(() => assertSafeEndpoint(apiPath`/songs/${"a/b"}`)).toThrow();
    expect(apiPath`/bands/${UUID}/members/${7}`).toBe(
      `/bands/${UUID}/members/7`,
    );
  });
});

describe("redactEndpointForLog", () => {
  it("hides share tokens, invite codes and query strings", () => {
    expect(redactEndpointForLog("/public/setlists/abc123?x=1")).toBe(
      "/public/setlists/[redacted]",
    );
    expect(redactEndpointForLog("/public/gigs/tok/export/pdf")).toBe(
      "/public/gigs/[redacted]/export/pdf",
    );
    expect(redactEndpointForLog("/invites/CODE/accept")).toBe(
      "/invites/[redacted]/accept",
    );
    expect(redactEndpointForLog("/s/tok")).toBe("/s/[redacted]");
    expect(redactEndpointForLog("/songs?search=foo")).toBe("/songs");
    expect(
      redactEndpointForLog("/users/me/username-availability?username=x"),
    ).toBe("/users/me/username-availability");
  });

  it("leaves ordinary ids alone", () => {
    expect(redactEndpointForLog(`/setlists/${UUID}/share`)).toBe(
      `/setlists/${UUID}/share`,
    );
    expect(redactEndpointForLog(`/gigs/${UUID}`)).toBe(`/gigs/${UUID}`);
  });
});

describe("safeCallbackPath", () => {
  it("refuses an empty segment anywhere in the path", () => {
    expect(safeCallbackPath("/en//evil.example")).toBeNull();
    expect(safeCallbackPath("/pt-BR//evil.example/x")).toBeNull();
    expect(safeCallbackPath("/dashboard//songs")).toBeNull();
    expect(safeCallbackPath("/en/%2F/evil.example")).toBeNull();
    expect(safeCallbackPath("/en/%252F%252Fevil.example")).toBeNull();
  });

  it("keeps `//` inside the query (not part of the path)", () => {
    expect(safeCallbackPath("/en/dashboard?next=a//b")).toBe(
      "/en/dashboard?next=a//b",
    );
  });

  it("keeps real destinations", () => {
    expect(
      safeCallbackPath(`/en/dashboard/setlists/${UUID}/live?songId=x`),
    ).toBe(`/en/dashboard/setlists/${UUID}/live?songId=x`);
    expect(safeCallbackPath("/dashboard/invite/ABCD1234")).toBe(
      "/dashboard/invite/ABCD1234",
    );
  });
});

describe("safeAuthRedirect", () => {
  const base = "https://app.example";

  it("allows relative and same-origin destinations", () => {
    expect(safeAuthRedirect("/pt-BR/dashboard", base)).toBe(
      "https://app.example/pt-BR/dashboard",
    );
    expect(
      safeAuthRedirect("https://app.example/en/login?reason=expired", base),
    ).toBe("https://app.example/en/login?reason=expired");
  });

  it("sends everything else to the site root", () => {
    expect(safeAuthRedirect("//evil.example", base)).toBe(base);
    expect(safeAuthRedirect("/\\evil.example", base)).toBe(base);
    expect(safeAuthRedirect("/en//evil.example", base)).toBe(base);
    expect(safeAuthRedirect("https://evil.example/en", base)).toBe(base);
    expect(safeAuthRedirect("https://app.example.evil/en", base)).toBe(base);
    expect(safeAuthRedirect("javascript:alert(1)", base)).toBe(base);
    expect(safeAuthRedirect("https://app.example//evil.example", base)).toBe(
      base,
    );
  });
});

describe("localizeHref", () => {
  it("never hands a protocol-relative URL to the browser", () => {
    expect(localizeHref("//evil.example", "en")).toBe("/");
    expect(localizeHref("/\\evil.example", "en")).toBe("/");
    expect(localizeHref("\\\\evil.example", "en")).toBe("/");
  });

  it("adds the locale to in-app paths only", () => {
    expect(localizeHref("/dashboard", "pt-BR")).toBe("/pt-BR/dashboard");
    expect(localizeHref("/es/dashboard", "pt-BR")).toBe("/es/dashboard");
    expect(localizeHref("https://example.com", "en")).toBe(
      "https://example.com",
    );
  });
});

describe("proxy callback helpers", () => {
  it("keeps the query string of the page being protected", () => {
    expect(
      loginCallbackOf(`/en/dashboard/setlists/${UUID}/live`, "?songId=1"),
    ).toBe(`/en/dashboard/setlists/${UUID}/live?songId=1`);
    expect(loginCallbackOf("/en/dashboard", `?q=${"x".repeat(3000)}`)).toBe(
      "/en/dashboard",
    );
  });

  it("sends a signed-in visitor to a safe callback, never back to sign-in", () => {
    expect(
      signedInRedirectPath("/en/dashboard/invite/CODE", "en", LOCALES),
    ).toBe("/en/dashboard/invite/CODE");
    expect(signedInRedirectPath("/dashboard/settings?x=1", "es", LOCALES)).toBe(
      "/es/dashboard/settings?x=1",
    );
    expect(
      signedInRedirectPath("/en/login?callbackUrl=/x", "en", LOCALES),
    ).toBe("/en/dashboard");
    expect(signedInRedirectPath("/register", "pt-BR", LOCALES)).toBe(
      "/pt-BR/dashboard",
    );
    expect(signedInRedirectPath("//evil.example", "en", LOCALES)).toBe(
      "/en/dashboard",
    );
    expect(signedInRedirectPath("/en//evil.example", "en", LOCALES)).toBe(
      "/en/dashboard",
    );
    expect(signedInRedirectPath(null, "en", LOCALES)).toBe("/en/dashboard");
  });

  it("lets a staff account without 2FA reach the settings only", () => {
    expect(isStaffTwoFactorExempt("/dashboard/settings")).toBe(true);
    expect(isStaffTwoFactorExempt("/dashboard/settings/x")).toBe(true);
    expect(isStaffTwoFactorExempt("/dashboard/settingsx")).toBe(false);
    expect(isStaffTwoFactorExempt("/dashboard/admin")).toBe(false);
  });
});

describe("sign-in errors from a URL", () => {
  it("accepts a bare known code only, never meta", () => {
    expect(parseUrlSignInError("ACCOUNT_BANNED")).toEqual({
      code: "ACCOUNT_BANNED",
      meta: null,
    });
    expect(
      parseUrlSignInError(
        JSON.stringify({
          code: "ACCOUNT_BANNED",
          meta: { reason: "Verify your card at https://evil.example" },
        }),
      ),
    ).toBeNull();
    expect(parseUrlSignInError("SOMETHING_ELSE")).toBeNull();
    expect(parseUrlSignInError("TWO_FACTOR_REQUIRED")).toBeNull();
    expect(parseUrlSignInError(null)).toBeNull();
  });

  it("knows the Google outcomes as codes of their own", () => {
    expect(parseSignInError(JSON.stringify({ code: "EMAIL_TAKEN" })).code).toBe(
      "EMAIL_TAKEN",
    );
  });

  it("keeps only typed, bounded meta fields", () => {
    expect(
      sanitizeSignInMeta({
        until: "2026-10-01T12:00:00",
        reason: "x".repeat(900),
        retry_after_seconds: 30,
        attempts_left: 2,
        html: "<b>",
      }),
    ).toEqual({
      until: "2026-10-01T12:00:00",
      reason: "x".repeat(500),
      retry_after_seconds: 30,
      attempts_left: 2,
    });
    expect(sanitizeSignInMeta({ until: "tomorrow, go to evil.example" })).toBe(
      null,
    );
    expect(sanitizeSignInMeta("nope")).toBeNull();
  });

  it("round-trips the Google error cookie", () => {
    const raw = serializeGoogleSignInError("ACCOUNT_BANNED", {
      until: "2026-10-01T12:00:00",
      reason: "spam",
    });
    expect(parseGoogleSignInError(raw)).toEqual({
      code: "ACCOUNT_BANNED",
      meta: { until: "2026-10-01T12:00:00", reason: "spam" },
    });
    expect(parseGoogleSignInError('{"code":"NOPE"}')).toBeNull();
    expect(parseGoogleSignInError("{")).toBeNull();
  });
});

describe("Google intent", () => {
  it("confirms age only together with the terms", () => {
    const parse = (value: object) =>
      parseGoogleIntent(JSON.stringify(value), LOCALES, "en");
    expect(parse({ acceptTerms: true, ageConfirmed: true })?.ageConfirmed).toBe(
      true,
    );
    expect(
      parse({ acceptTerms: false, ageConfirmed: true })?.ageConfirmed,
    ).toBe(false);
    expect(parse({ acceptTerms: true })?.ageConfirmed).toBe(false);
  });
});

describe("re-authentication proof", () => {
  it("sends the password or a 6-digit code, never both", () => {
    expect(reauthBody({ password: "secret" })).toEqual({ password: "secret" });
    expect(reauthBody({ reauthCode: "123 456" })).toEqual({
      reauth_code: "123456",
    });
    expect(reauthBody({ password: "p", reauthCode: "123456" })).toEqual({
      password: "p",
    });
    expect(reauthBody({})).toEqual({});
    expect(reauthBody(null)).toEqual({});
  });

  it("refuses malformed proofs", () => {
    expect(reauthBody({ reauthCode: "12345" })).toBeNull();
    expect(reauthBody({ reauthCode: "12a456" })).toBeNull();
    expect(reauthBody({ password: "x".repeat(257) })).toBeNull();
  });

  it("reads the method the API asks for", () => {
    expect(reauthMethodOf({ method: "email_code" })).toBe("email_code");
    expect(reauthMethodOf({ method: "password" })).toBe("password");
    expect(reauthMethodOf({ method: "sms" })).toBeNull();
    expect(reauthMethodOf(null)).toBeNull();
  });
});

describe("isSameOriginRequest", () => {
  const request = (headers: Record<string, string>) =>
    new Request("https://app.example/api/import/backup", {
      method: "POST",
      headers,
    });

  it("trusts Sec-Fetch-Site when present", () => {
    expect(
      isSameOriginRequest(request({ "sec-fetch-site": "same-origin" })),
    ).toBe(true);
    expect(isSameOriginRequest(request({ "sec-fetch-site": "none" }))).toBe(
      true,
    );
    expect(
      isSameOriginRequest(request({ "sec-fetch-site": "same-site" })),
    ).toBe(false);
    expect(
      isSameOriginRequest(request({ "sec-fetch-site": "cross-site" })),
    ).toBe(false);
    // A matching Origin doesn't override a cross-site fetch metadata.
    expect(
      isSameOriginRequest(
        request({
          "sec-fetch-site": "cross-site",
          origin: "https://app.example",
          host: "app.example",
        }),
      ),
    ).toBe(false);
  });

  it("falls back to Origin against the host", () => {
    expect(
      isSameOriginRequest(
        request({ origin: "https://app.example", host: "app.example" }),
      ),
    ).toBe(true);
    expect(
      isSameOriginRequest(
        request({
          origin: "https://app.example",
          host: "internal:3000",
          "x-forwarded-host": "app.example",
        }),
      ),
    ).toBe(true);
    expect(
      isSameOriginRequest(
        request({ origin: "https://evil.example", host: "app.example" }),
      ),
    ).toBe(false);
    expect(isSameOriginRequest(request({ origin: "null", host: "null" }))).toBe(
      false,
    );
    expect(isSameOriginRequest(request({ host: "app.example" }))).toBe(false);
    expect(isSameOriginRequest(request({}))).toBe(false);
  });
});

describe("/api/client allowlist", () => {
  const allowed = (method: string, segments: string[]) =>
    isAllowedClientApiRoute(method, clientApiEndpoint(segments));

  it("forwards only the listed method + path shapes", () => {
    expect(allowed("GET", ["notifications"])).toBe(true);
    expect(allowed("GET", ["notifications", "unread-count"])).toBe(true);
    expect(allowed("PATCH", ["notifications", UUID, "read"])).toBe(true);
    expect(allowed("PATCH", ["notifications", "read-all"])).toBe(true);
    expect(allowed("GET", ["users", "me", "preferences"])).toBe(true);
    expect(allowed("get", ["songs"])).toBe(true);
    expect(allowed("GET", ["songs", UUID])).toBe(true);
    expect(allowed("GET", ["setlists", UUID, "items"])).toBe(true);
    expect(allowed("GET", ["bands", UUID, "gigs"])).toBe(true);
  });

  it("refuses other methods on allowed paths", () => {
    expect(allowed("DELETE", ["songs", UUID])).toBe(false);
    expect(allowed("PATCH", ["songs", UUID])).toBe(false);
    expect(allowed("POST", ["notifications"])).toBe(false);
    expect(allowed("GET", ["notifications", UUID, "read"])).toBe(false);
    expect(allowed("PUT", ["users", "me", "preferences"])).toBe(false);
  });

  it("refuses unlisted paths and smuggled segments", () => {
    expect(allowed("GET", ["users", "me"])).toBe(false);
    expect(allowed("GET", ["users", "me", "data-export"])).toBe(false);
    expect(allowed("GET", ["backup", "export"])).toBe(false);
    expect(allowed("GET", ["songs", "not-a-uuid"])).toBe(false);
    expect(allowed("GET", ["songs", `${UUID}/lyrics`])).toBe(false);
    expect(allowed("GET", ["songs", `${UUID}?x=1`])).toBe(false);
    expect(allowed("GET", ["songs", ".."])).toBe(false);
    expect(allowed("GET", ["setlists", UUID, "items", "extra"])).toBe(false);
    expect(allowed("PATCH", ["notifications", "../users/me", "read"])).toBe(
      false,
    );
    expect(clientApiEndpoint(["songs", "a/b"])).toBe("/songs/a%2Fb");
  });
});

describe("TokenBucketLimiter", () => {
  it("allows a burst, then refills over time", () => {
    const limiter = new TokenBucketLimiter(3, 60_000);
    expect(limiter.take("u", 0)).toBe(0);
    expect(limiter.take("u", 0)).toBe(0);
    expect(limiter.take("u", 0)).toBe(0);
    expect(limiter.take("u", 0)).toBe(20);
    expect(limiter.take("other", 0)).toBe(0);
    expect(limiter.take("u", 20_000)).toBe(0);
    expect(limiter.take("u", 20_000)).toBeGreaterThan(0);
  });

  it("caps the number of tracked keys", () => {
    const limiter = new TokenBucketLimiter(1, 60_000, 2);
    expect(limiter.take("a", 0)).toBe(0);
    expect(limiter.take("b", 0)).toBe(0);
    expect(limiter.take("c", 0)).toBe(0);
    // "a" was evicted and starts full again.
    expect(limiter.take("a", 0)).toBe(0);
    expect(limiter.take("c", 0)).toBeGreaterThan(0);
  });
});

describe("clientIpTrustWarning", () => {
  it("warns only for a self-hosted setup with no trust settings", () => {
    expect(clientIpTrustWarning({ INTERNAL_API_SECRET: "s" })).toMatch(
      /TRUSTED_PROXY_HOPS/,
    );
    expect(clientIpTrustWarning({})).toBeNull();
    expect(
      clientIpTrustWarning({ INTERNAL_API_SECRET: "s", VERCEL: "1" }),
    ).toBeNull();
    expect(
      clientIpTrustWarning({
        INTERNAL_API_SECRET: "s",
        TRUSTED_PROXY_HOPS: "1",
      }),
    ).toBeNull();
    expect(
      clientIpTrustWarning({
        INTERNAL_API_SECRET: "s",
        TRUST_X_REAL_IP: "true",
      }),
    ).toBeNull();
  });
});

describe("redactAnalyticsUrl", () => {
  it("removes share tokens, invite codes and callback URLs", () => {
    expect(redactAnalyticsUrl("https://app.example/s/abc123")).toBe(
      `https://app.example/s/${REDACTED}`,
    );
    expect(redactAnalyticsUrl("/g/tok_en?lang=pt-BR")).toBe(
      `/g/${REDACTED}?lang=pt-BR`,
    );
    expect(redactAnalyticsUrl("/pt-BR/dashboard/invite/CODE")).toBe(
      `/pt-BR/dashboard/invite/${REDACTED}`,
    );
    expect(
      redactAnalyticsUrl(
        "https://app.example/en/login?callbackUrl=%2Fen%2Fdashboard%2Finvite%2FX&reason=expired",
      ),
    ).toBe("https://app.example/en/login?reason=expired");
    expect(redactAnalyticsUrl("/en/dashboard/songs")).toBe(
      "/en/dashboard/songs",
    );
  });
});

describe("validTimeZone", () => {
  it("accepts IANA zones and refuses anything else", () => {
    expect(validTimeZone("America/Sao_Paulo")).toBe("America/Sao_Paulo");
    expect(validTimeZone("UTC")).toBe("UTC");
    expect(validTimeZone("Mars/Olympus")).toBeNull();
    expect(validTimeZone("America/Sao_Paulo; path=/")).toBeNull();
    expect(validTimeZone("")).toBeNull();
    expect(validTimeZone(undefined)).toBeNull();
  });
});

// ---------------------------------------------------------------------
// public/sw.js (a classic script: loaded into a sandbox with stubs)
// ---------------------------------------------------------------------

interface ServiceWorkerScope {
  isPrivatePath(pathname: string): boolean;
  isFreshPage(response: Response | undefined, now?: number): boolean;
  isLoginRedirect(response: Response): boolean;
  isUsableForCache(response: Response): Promise<boolean>;
}

function loadServiceWorker(): ServiceWorkerScope {
  const source = readFileSync(
    path.resolve(__dirname, "../../public/sw.js"),
    "utf8",
  );
  const context: Record<string, unknown> = {
    self: {
      addEventListener: () => {},
      location: { origin: "https://app.example" },
    },
    URL,
    Response,
    Headers,
    Date,
    Number,
  };
  vm.createContext(context);
  vm.runInContext(source, context);
  return context as unknown as ServiceWorkerScope;
}

function redirectedResponse(url: string, init: ResponseInit = {}): Response {
  const response = new Response("<html></html>", {
    status: 200,
    headers: { "content-type": "text/html" },
    ...init,
  });
  Object.defineProperty(response, "redirected", { value: true });
  Object.defineProperty(response, "url", { value: url });
  return response;
}

describe("service worker filters", () => {
  const sw = loadServiceWorker();

  it("never stores private pages, with or without a locale", () => {
    for (const pathname of [
      "/dashboard/settings",
      "/pt-BR/dashboard/settings",
      "/en/dashboard/admin/users",
      "/es/dashboard/profile/x",
      "/dashboard/users/1",
      "/en/dashboard/invite/CODE",
    ]) {
      expect(sw.isPrivatePath(pathname), pathname).toBe(true);
    }
    for (const pathname of [
      "/en/dashboard",
      "/pt-BR/dashboard/setlists/1/live",
      "/dashboard/settingsx",
      "/en/dashboard/songs",
    ]) {
      expect(sw.isPrivatePath(pathname), pathname).toBe(false);
    }
  });

  it("expires stored pages after a week, and old untimestamped ones", () => {
    const now = Date.UTC(2026, 8, 24);
    const stored = (at: number | null) =>
      new Response("x", {
        headers: at === null ? {} : { "x-setlyst-cached-at": String(at) },
      });
    expect(sw.isFreshPage(stored(now - 60_000), now)).toBe(true);
    expect(sw.isFreshPage(stored(now - 6 * 86_400_000), now)).toBe(true);
    expect(sw.isFreshPage(stored(now - 8 * 86_400_000), now)).toBe(false);
    expect(sw.isFreshPage(stored(null), now)).toBe(false);
    expect(sw.isFreshPage(stored(now + 86_400_000), now)).toBe(false);
    expect(sw.isFreshPage(undefined, now)).toBe(false);
  });

  it("refuses a page redirected to the login page", async () => {
    const toLogin = redirectedResponse(
      "https://app.example/en/login?callbackUrl=%2Fen%2Fdashboard",
    );
    expect(sw.isLoginRedirect(toLogin)).toBe(true);
    expect(await sw.isUsableForCache(toLogin)).toBe(false);
    expect(
      sw.isLoginRedirect(redirectedResponse("https://app.example/login")),
    ).toBe(true);
    expect(
      sw.isLoginRedirect(
        redirectedResponse("https://app.example/pt-BR/dashboard/setlists"),
      ),
    ).toBe(false);
  });

  it("refuses a page rendered while impersonating", async () => {
    const response = new Response("<html></html>", {
      headers: {
        "content-type": "text/html",
        "x-setlyst-impersonating": "1",
      },
    });
    expect(await sw.isUsableForCache(response)).toBe(false);
    expect(
      await sw.isUsableForCache(
        new Response("<html></html>", {
          headers: { "content-type": "text/html" },
        }),
      ),
    ).toBe(true);
  });
});
