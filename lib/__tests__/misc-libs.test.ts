import { describe, expect, it } from "vitest";
import { adminListQuery } from "@/lib/admin-list";
import { formatApiDate, formatApiDay, parseApiTimestamp } from "@/lib/dates";
import { safeCallbackPath } from "@/lib/links";
import { apiTokenOf } from "@/lib/session-api-token";
import { isServiceWorkerEnabled } from "@/lib/offline/sw-enabled";
import { parseSignInError } from "@/lib/sign-in-errors";
import {
  assignableRoles,
  canAdministerUser,
  canChangeRole,
  canManageUser,
  hasStaffCapability,
} from "@/lib/staff-permissions";
import { normalizeTag, normalizeTags, tagIssue } from "@/lib/tags";
import { DEFAULT_UI_SETTINGS, normalizeUiSettings } from "@/lib/ui-settings";

describe("staff permissions", () => {
  const admin = { id: "a", role: "admin" as const };
  const moderator = { id: "m", role: "moderator" as const };
  const user = { id: "u", role: "user" as const };

  it("only lets staff manage accounts strictly below them", () => {
    expect(canManageUser(moderator, user)).toBe(true);
    expect(canManageUser(moderator, { id: "m2", role: "moderator" })).toBe(
      false,
    );
    expect(canManageUser(moderator, admin)).toBe(false);
    expect(canManageUser(admin, moderator)).toBe(true);
    expect(canManageUser(admin, { id: "a2", role: "admin" })).toBe(false);
    expect(canManageUser(admin, admin)).toBe(false);
  });

  it("reserves role changes for admins, never on themselves or other admins", () => {
    expect(canChangeRole(admin, user)).toBe(true);
    expect(canChangeRole(admin, moderator)).toBe(true);
    // The API refuses admin-on-admin changes (INSUFFICIENT_ROLE).
    expect(canChangeRole(admin, { id: "a2", role: "admin" })).toBe(false);
    expect(canChangeRole(admin, admin)).toBe(false);
    expect(canChangeRole(moderator, user)).toBe(false);
  });

  it("keeps deletion, temporary passwords and view-as for admins", () => {
    expect(canAdministerUser(admin, user)).toBe(true);
    expect(canAdministerUser(admin, moderator)).toBe(true);
    expect(canAdministerUser(admin, { id: "a2", role: "admin" })).toBe(false);
    expect(canAdministerUser(moderator, user)).toBe(false);
    expect(hasStaffCapability("moderator", "audit")).toBe(false);
    expect(hasStaffCapability("moderator", "announcements")).toBe(true);
    expect(hasStaffCapability("moderator", "announcements.publish")).toBe(
      false,
    );
    expect(hasStaffCapability("admin", "announcements.publish")).toBe(true);
  });

  it("limits the roles each actor can create", () => {
    expect(assignableRoles("moderator")).toEqual(["user"]);
    expect(assignableRoles("admin")).toContain("admin");
    expect(assignableRoles("user")).toEqual([]);
  });
});

describe("tags", () => {
  it("normalizes case and whitespace", () => {
    expect(normalizeTag("  Rock   n  Roll ")).toBe("rock n roll");
    expect(normalizeTag("   ")).toBeNull();
  });

  it("validates length and characters", () => {
    expect(tagIssue("balada")).toBeNull();
    expect(tagIssue("romântica")).toBeNull();
    expect(tagIssue("a".repeat(31))).toBe("too_long");
    expect(tagIssue("no/slash")).toBe("characters");
  });

  it("de-duplicates and caps the list", () => {
    expect(normalizeTags(["Balada", "balada", " BALADA "])).toEqual(["balada"]);
    expect(
      normalizeTags(Array.from({ length: 15 }, (_, i) => `t${i}`)),
    ).toHaveLength(10);
  });
});

describe("adminListQuery", () => {
  it("keeps only allowed, well-formed filters", () => {
    const { query, page } = adminListQuery(
      {
        page: "3",
        q: " rock ",
        user_id: "not-a-uuid",
        band_id: "4f9a7c1e-2b3d-4e5f-8a9b-0c1d2e3f4a5b",
        shared: "maybe",
        evil: "x",
      },
      ["q", "user_id", "band_id", "shared"],
    );
    const params = new URLSearchParams(query);
    expect(page).toBe(3);
    expect(params.get("q")).toBe("rock");
    expect(params.has("user_id")).toBe(false);
    expect(params.get("band_id")).toBe("4f9a7c1e-2b3d-4e5f-8a9b-0c1d2e3f4a5b");
    expect(params.has("shared")).toBe(false);
    expect(params.has("evil")).toBe(false);
  });

  it("never requests a page below 1", () => {
    expect(adminListQuery({ page: "-4" }).page).toBe(1);
    expect(adminListQuery({ page: "abc" }).page).toBe(1);
  });
});

describe("dates", () => {
  it("reads naive API timestamps as UTC", () => {
    expect(parseApiTimestamp("2026-09-22T21:31:00").toISOString()).toBe(
      "2026-09-22T21:31:00.000Z",
    );
    expect(parseApiTimestamp("2026-09-22T21:31:00Z").toISOString()).toBe(
      "2026-09-22T21:31:00.000Z",
    );
  });

  it("formats empty or invalid values as an empty string", () => {
    expect(formatApiDate(null, "en")).toBe("");
    expect(formatApiDate("nope", "en")).toBe("");
  });

  it("reads plain days as UTC midnight and never shifts them", () => {
    expect(parseApiTimestamp("2026-09-22").toISOString()).toBe(
      "2026-09-22T00:00:00.000Z",
    );
    expect(formatApiDay("2026-09-01", "en")).toBe("September 1, 2026");
    expect(formatApiDay("2026-09-01", "pt-BR", { day: "numeric" })).toBe("1");
    expect(formatApiDay(undefined, "en")).toBe("");
  });
});

describe("safeCallbackPath", () => {
  it("only allows paths inside the app", () => {
    expect(safeCallbackPath("/dashboard/songs")).toBe("/dashboard/songs");
    expect(safeCallbackPath("//evil.example")).toBeNull();
    expect(safeCallbackPath("https://evil.example")).toBeNull();
    expect(safeCallbackPath("/\\evil.example")).toBeNull();
    expect(safeCallbackPath(null)).toBeNull();
  });

  it("refuses control characters and encoded slashes", () => {
    expect(safeCallbackPath("/%09/example.com")).toBeNull();
    expect(safeCallbackPath("/\t/example.com")).toBeNull();
    expect(safeCallbackPath("/\n/example.com")).toBeNull();
    expect(safeCallbackPath("/\u0085/example.com")).toBeNull();
    expect(safeCallbackPath("/%C2%85/example.com")).toBeNull();
    expect(safeCallbackPath("/%2F/example.com")).toBeNull();
    expect(safeCallbackPath("/%2f%2fexample.com")).toBeNull();
    expect(safeCallbackPath("/%5Cexample.com")).toBeNull();
    expect(safeCallbackPath("/%252F/example.com")).toBeNull();
    expect(safeCallbackPath("/%zz")).toBeNull();
  });

  it("keeps ordinary encoded paths and queries", () => {
    expect(safeCallbackPath("/pt-BR/dashboard/songs?q=a%20b")).toBe(
      "/pt-BR/dashboard/songs?q=a%20b",
    );
    expect(safeCallbackPath("/dashboard/songs?q=50%25")).toBe(
      "/dashboard/songs?q=50%25",
    );
  });
});

describe("parseSignInError", () => {
  it("decodes structured errors and falls back to invalid credentials", () => {
    expect(
      parseSignInError('{"code":"ACCOUNT_BANNED","meta":{"until":null}}'),
    ).toEqual({
      code: "ACCOUNT_BANNED",
      meta: { until: null },
    });
    expect(parseSignInError("CredentialsSignin").code).toBe(
      "INVALID_CREDENTIALS",
    );
    expect(parseSignInError('{"code":"WHATEVER"}').code).toBe(
      "INVALID_CREDENTIALS",
    );
  });
});

describe("ui settings", () => {
  it("coerces anything into a complete settings object", () => {
    expect(normalizeUiSettings(undefined)).toEqual(DEFAULT_UI_SETTINGS);
    const settings = normalizeUiSettings({
      live: { showChords: true, fontFamily: "comic" },
      lists: { pageSize: 7 },
      whatsNew: { lastSeen: 42 },
    });
    expect(settings.live.showChords).toBe(true);
    expect(settings.live.fontFamily).toBe("sans");
    expect(settings.lists.pageSize).toBe(25);
    expect(settings.whatsNew.lastSeen).toBeNull();
  });
});

describe("apiTokenOf", () => {
  const now = 1_000_000;

  it("returns a fresh token", () => {
    expect(apiTokenOf({ apiToken: "a", apiTokenExpires: now + 1 }, now)).toBe(
      "a",
    );
    expect(apiTokenOf({ apiToken: "a" }, now)).toBe("a");
  });

  it("never falls back to the impersonator's token", () => {
    const token = {
      apiToken: "impersonated",
      apiTokenExpires: now - 1,
      impersonator: {
        id: "s",
        name: "staff",
        role: "admin" as const,
        apiToken: "staff",
        apiTokenExpires: now + 60_000,
      },
    };
    expect(apiTokenOf(token, now)).toBeNull();
  });

  it("is null for expired or missing sessions", () => {
    expect(apiTokenOf(null, now)).toBeNull();
    expect(
      apiTokenOf({ apiToken: "a", error: "TokenExpired" }, now),
    ).toBeNull();
    expect(apiTokenOf({ apiToken: "a", apiTokenExpires: now }, now)).toBeNull();
  });
});

describe("isServiceWorkerEnabled", () => {
  it("runs in production, and in development only when asked", () => {
    expect(isServiceWorkerEnabled({ nodeEnv: "production" })).toBe(true);
    expect(isServiceWorkerEnabled({ nodeEnv: "development" })).toBe(false);
    expect(
      isServiceWorkerEnabled({ nodeEnv: "development", enableInDev: "true" }),
    ).toBe(true);
    expect(
      isServiceWorkerEnabled({ nodeEnv: "development", enableInDev: "1" }),
    ).toBe(false);
  });
});
