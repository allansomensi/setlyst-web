import { describe, expect, it } from "vitest";
import {
  classifyPath,
  getLocaleSegment,
  isPublicPath,
  stripLocale,
} from "@/lib/route-access";
import { apiTokenOf, isSessionExpired } from "@/lib/session-api-token";

const LOCALES = ["en", "pt-BR", "es"] as const;

describe("route access", () => {
  it("reads and strips the locale segment", () => {
    expect(getLocaleSegment("/pt-BR/dashboard", LOCALES)).toBe("pt-BR");
    expect(getLocaleSegment("/dashboard", LOCALES)).toBeNull();
    expect(stripLocale("/pt-BR/pricing", LOCALES)).toBe("/pricing");
    expect(stripLocale("/pt-BR", LOCALES)).toBe("/");
    expect(stripLocale("/fr/pricing", LOCALES)).toBe("/fr/pricing");
  });

  it("classifies the app areas", () => {
    expect(classifyPath("/dashboard")).toBe("protected");
    expect(classifyPath("/dashboard/settings/")).toBe("protected");
    expect(classifyPath("/dashboardx")).not.toBe("protected");
    expect(classifyPath("/change-password")).toBe("changePassword");
    expect(classifyPath("/login")).toBe("auth");
    expect(classifyPath("/register")).toBe("auth");
    expect(classifyPath("/")).toBe("public");
    expect(classifyPath("/legal/privacy")).toBe("public");
    expect(isPublicPath("/pricing")).toBe(true);
    expect(isPublicPath("/dashboard")).toBe(false);
  });
});

describe("session expiry", () => {
  const now = 1_000_000;
  const base = { id: "u", role: "user" as const, apiToken: "t" };

  it("treats a missing or flagged token as expired", () => {
    expect(isSessionExpired(null, now)).toBe(true);
    expect(isSessionExpired({ ...base, error: "TokenExpired" }, now)).toBe(
      true,
    );
    expect(isSessionExpired({ ...base, apiToken: "" }, now)).toBe(true);
  });

  it("follows the API token's own expiry, not just the error flag", () => {
    // The redirect-loop case: a renewed session cookie holding an API
    // token that ran out, with no `error` set yet.
    expect(isSessionExpired({ ...base, apiTokenExpires: now - 1 }, now)).toBe(
      true,
    );
    expect(isSessionExpired({ ...base, apiTokenExpires: now + 1 }, now)).toBe(
      false,
    );
    expect(apiTokenOf({ ...base, apiTokenExpires: now - 1 }, now)).toBeNull();
  });

  it("lets an expired impersonation fall back to the staff session", () => {
    const impersonator = {
      id: "s",
      name: "Staff",
      role: "admin" as const,
      apiToken: "staff",
    };
    expect(
      isSessionExpired(
        {
          ...base,
          apiTokenExpires: now - 1,
          impersonator: { ...impersonator, apiTokenExpires: now + 10 },
        },
        now,
      ),
    ).toBe(false);
    expect(
      isSessionExpired(
        {
          ...base,
          apiTokenExpires: now - 1,
          impersonator: { ...impersonator, apiTokenExpires: now - 10 },
        },
        now,
      ),
    ).toBe(true);
  });
});
