import { describe, expect, it } from "vitest";
import { adminListQuery } from "@/lib/admin-list";
import { formatApiDate, parseApiTimestamp } from "@/lib/dates";
import { safeCallbackPath } from "@/lib/links";
import { parseSignInError } from "@/lib/sign-in-errors";
import {
  assignableRoles,
  canChangeRole,
  canManageUser,
} from "@/lib/staff-permissions";
import { normalizeTag, normalizeTags, tagIssue } from "@/lib/tags";
import { DEFAULT_UI_SETTINGS, normalizeUiSettings } from "@/lib/ui-settings";
import {
  hasUnseenRelease,
  LATEST_RELEASE_ID,
  RELEASE_NOTES,
} from "@/lib/whats-new";

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

  it("reserves role changes for admins, never on themselves", () => {
    expect(canChangeRole(admin, user)).toBe(true);
    expect(canChangeRole(admin, { id: "a2", role: "admin" })).toBe(true);
    expect(canChangeRole(admin, admin)).toBe(false);
    expect(canChangeRole(moderator, user)).toBe(false);
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
});

describe("safeCallbackPath", () => {
  it("only allows paths inside the app", () => {
    expect(safeCallbackPath("/dashboard/songs")).toBe("/dashboard/songs");
    expect(safeCallbackPath("//evil.example")).toBeNull();
    expect(safeCallbackPath("https://evil.example")).toBeNull();
    expect(safeCallbackPath("/\\evil.example")).toBeNull();
    expect(safeCallbackPath(null)).toBeNull();
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

describe("release notes", () => {
  it("have unique ids, newest first, with every locale filled", () => {
    const ids = RELEASE_NOTES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    const dates = RELEASE_NOTES.map((r) => r.date);
    expect([...dates].sort().reverse()).toEqual(dates);
    for (const release of RELEASE_NOTES) {
      for (const text of [release.title, ...release.items.map((i) => i.text)]) {
        expect(text.en && text["pt-BR"] && text.es).toBeTruthy();
      }
    }
  });

  it("flags unseen releases", () => {
    expect(hasUnseenRelease(null)).toBe(true);
    expect(hasUnseenRelease(LATEST_RELEASE_ID)).toBe(false);
  });
});
