import { describe, expect, it } from "vitest";
import {
  buildInternalHeaders,
  clientIpTrustFromEnv,
  normalizeIp,
  resolveClientIp,
  type ClientIpTrust,
} from "@/lib/server/client-ip";

const headers = (record: Record<string, string>) => ({
  get: (name: string) => record[name.toLowerCase()] ?? null,
});

const selfHosted: ClientIpTrust = {
  vercel: false,
  trustedProxyHops: 1,
  trustXRealIp: false,
};

describe("normalizeIp", () => {
  it("accepts IPv4/IPv6 with ports and brackets", () => {
    expect(normalizeIp(" 203.0.113.7:51234 ")).toBe("203.0.113.7");
    expect(normalizeIp("[2001:db8::1]:443")).toBe("2001:db8::1");
    expect(normalizeIp('"198.51.100.2"')).toBe("198.51.100.2");
  });

  it("rejects anything that is not an address", () => {
    expect(normalizeIp("unknown")).toBeNull();
    expect(normalizeIp("999.1.1.1")).toBeNull();
    expect(normalizeIp("1.2.3.4\r\nX-Evil: 1")).toBeNull();
    expect(normalizeIp("")).toBeNull();
  });
});

describe("clientIpTrustFromEnv", () => {
  it("defaults to no trusted proxy hop and no x-real-ip", () => {
    expect(clientIpTrustFromEnv({})).toEqual({
      ...selfHosted,
      trustedProxyHops: 0,
    });
  });

  it("reads VERCEL, TRUSTED_PROXY_HOPS and TRUST_X_REAL_IP", () => {
    expect(
      clientIpTrustFromEnv({
        VERCEL: "1",
        TRUSTED_PROXY_HOPS: "2",
        TRUST_X_REAL_IP: "TRUE",
      }),
    ).toEqual({ vercel: true, trustedProxyHops: 2, trustXRealIp: true });
    expect(
      clientIpTrustFromEnv({ TRUSTED_PROXY_HOPS: "0" }).trustedProxyHops,
    ).toBe(0);
    expect(
      clientIpTrustFromEnv({ TRUSTED_PROXY_HOPS: "abc" }).trustedProxyHops,
    ).toBe(0);
    expect(
      clientIpTrustFromEnv({ TRUSTED_PROXY_HOPS: "-3" }).trustedProxyHops,
    ).toBe(0);
  });
});

describe("resolveClientIp", () => {
  it("ignores a spoofed leftmost X-Forwarded-For hop", () => {
    const h = headers({ "x-forwarded-for": "1.1.1.1, 203.0.113.7" });
    expect(resolveClientIp(h, selfHosted)).toBe("203.0.113.7");
  });

  it("counts hops from the right", () => {
    const h = headers({
      "x-forwarded-for": "6.6.6.6, 203.0.113.7, 10.0.0.2",
    });
    expect(resolveClientIp(h, { ...selfHosted, trustedProxyHops: 2 })).toBe(
      "203.0.113.7",
    );
  });

  it("sends nothing when there are fewer hops than trusted proxies", () => {
    const h = headers({ "x-forwarded-for": "203.0.113.7" });
    expect(
      resolveClientIp(h, { ...selfHosted, trustedProxyHops: 2 }),
    ).toBeNull();
  });

  it("sends nothing when the trusted hop is not an IP", () => {
    const h = headers({ "x-forwarded-for": "1.1.1.1, garbage" });
    expect(resolveClientIp(h, selfHosted)).toBeNull();
  });

  it("does not trust x-real-ip outside Vercel unless configured", () => {
    const h = headers({ "x-real-ip": "6.6.6.6" });
    expect(resolveClientIp(h, selfHosted)).toBeNull();
    expect(resolveClientIp(h, { ...selfHosted, trustXRealIp: true })).toBe(
      "6.6.6.6",
    );
  });

  it("uses no forwarding header when hops are 0", () => {
    const h = headers({ "x-forwarded-for": "203.0.113.7" });
    expect(
      resolveClientIp(h, { ...selfHosted, trustedProxyHops: 0 }),
    ).toBeNull();
  });

  it("trusts the Vercel headers only on Vercel", () => {
    const vercel = { ...selfHosted, vercel: true };
    expect(
      resolveClientIp(
        headers({
          "x-vercel-forwarded-for": "203.0.113.7",
          "x-forwarded-for": "6.6.6.6, 203.0.113.9",
        }),
        vercel,
      ),
    ).toBe("203.0.113.7");
    expect(
      resolveClientIp(headers({ "x-real-ip": "203.0.113.8" }), vercel),
    ).toBe("203.0.113.8");
    expect(
      resolveClientIp(
        headers({ "x-vercel-forwarded-for": "6.6.6.6" }),
        selfHosted,
      ),
    ).toBeNull();
  });
});

describe("buildInternalHeaders", () => {
  it("omits everything without a secret and the IP when unknown", () => {
    expect(buildInternalHeaders(undefined, "1.2.3.4")).toEqual({});
    expect(buildInternalHeaders("s", null)).toEqual({
      "X-Setlyst-Internal": "s",
    });
  });
});
