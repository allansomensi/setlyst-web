import { describe, expect, it } from "vitest";
import {
  FALLBACK_CSP_SOURCES,
  buildCsp,
  cspEnvironment,
  generateNonce,
} from "@/lib/csp";

const prod = { isDev: false, isProductionDeployment: true, isPlainHttp: false };

function directive(csp: string, name: string): string[] | undefined {
  const part = csp
    .split("; ")
    .find((d) => d === name || d.startsWith(`${name} `));
  return part?.split(" ").slice(1);
}

describe("CSP", () => {
  it("uses the nonce with strict-dynamic and no unsafe-inline scripts", () => {
    const nonce = generateNonce();
    const csp = buildCsp(prod, nonce);
    const scripts = directive(csp, "script-src")!;
    expect(scripts).toContain(`'nonce-${nonce}'`);
    expect(scripts).toContain("'strict-dynamic'");
    expect(scripts).not.toContain("'unsafe-inline'");
    expect(scripts).not.toContain("'unsafe-eval'");
    expect(csp).toContain("upgrade-insecure-requests");
    expect(directive(csp, "frame-ancestors")).toEqual(["'none'"]);
    expect(directive(csp, "object-src")).toEqual(["'none'"]);
  });

  it("falls back to same-origin script files only", () => {
    const scripts = directive(buildCsp(prod), "script-src")!;
    expect(scripts).toContain("'self'");
    expect(scripts.some((s) => s.startsWith("'nonce-"))).toBe(false);
    expect(scripts).not.toContain("'unsafe-inline'");
  });

  it("only lets the browser connect to this origin (and analytics)", () => {
    expect(directive(buildCsp(prod), "connect-src")).toEqual([
      "'self'",
      "https://va.vercel-scripts.com",
    ]);
  });

  it("relaxes for development and preview deployments", () => {
    const dev = buildCsp(
      { isDev: true, isProductionDeployment: false },
      "n0nce0123456789abcdef==",
    );
    expect(directive(dev, "script-src")).toContain("'unsafe-eval'");
    expect(directive(dev, "script-src")).toContain("https://vercel.live");
    expect(dev).not.toContain("upgrade-insecure-requests");
    expect(
      cspEnvironment({ NODE_ENV: "production", VERCEL_ENV: "production" }),
    ).toEqual(prod);
  });

  it("generates distinct base64 nonces and refuses malformed ones", () => {
    const a = generateNonce();
    expect(a).toMatch(/^[A-Za-z0-9+/]{22}==$/);
    expect(generateNonce()).not.toBe(a);
    expect(() => buildCsp(prod, "abc'; script-src *")).toThrow();
  });

  it("covers the middleware-skipped paths with the fallback", () => {
    expect(FALLBACK_CSP_SOURCES).toContain("/api/:path*");
    expect(FALLBACK_CSP_SOURCES).toContain("/_next/:path*");
  });
});

describe("upgrade-insecure-requests", () => {
  it("is emitted in production over https", () => {
    const csp = buildCsp({ isDev: false, isProductionDeployment: true });
    expect(csp).toContain("upgrade-insecure-requests");
  });

  it("is left out when the app is served over plain http", () => {
    const csp = buildCsp({
      isDev: false,
      isProductionDeployment: false,
      isPlainHttp: true,
    });
    expect(csp).not.toContain("upgrade-insecure-requests");
  });
});
