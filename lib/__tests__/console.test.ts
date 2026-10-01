import { describe, expect, it } from "vitest";
import { adminListQuery } from "@/lib/admin-list";
import {
  adminExportHref,
  attentionItems,
  bulkTargets,
  canSelectForBulk,
  emailBacklogStale,
  groupBulkFailures,
  isAdminExportKind,
  normalizeSearch,
  oldestPendingMinutes,
  searchState,
  signInMethodParts,
  USER_LIST_CHOICES,
  USER_LIST_KEYS,
  withoutPaging,
} from "@/lib/console";
import type { ConsoleOverview } from "@/types/operations";

const ID_A = "4f9a7c1e-2b3d-4e5f-8a9b-0c1d2e3f4a5b";
const ID_B = "5f9a7c1e-2b3d-4e5f-8a9b-0c1d2e3f4a5b";
const ID_C = "6f9a7c1e-2b3d-4e5f-8a9b-0c1d2e3f4a5b";

function overview(overrides: Partial<ConsoleOverview> = {}): ConsoleOverview {
  return {
    maintenance_mode: "off",
    registrations_open: true,
    users: {
      total: 10,
      new_today: 0,
      new_7d: 1,
      new_30d: 2,
      active_7d: 5,
      active_30d: 8,
      unverified: 1,
      banned: 0,
      deactivated: 0,
      staff_without_2fa: 0,
    },
    signups: [],
    support_open: 0,
    support_unassigned: 0,
    support_urgent: 0,
    moderation_open: 0,
    emails_failed_24h: 0,
    emails_pending: 0,
    oldest_pending_email_at: null,
    incidents_active: 0,
    generated_at: "2026-10-01T12:00:00",
    ...overrides,
  };
}

describe("account list filters", () => {
  it("forwards only known filters with valid values", () => {
    const { query } = adminListQuery(
      {
        q: " ana ",
        role: "moderator",
        state: "banned",
        verified: "maybe",
        two_factor: "false",
        sort: "newest",
        is_admin: "true",
      },
      USER_LIST_KEYS,
      USER_LIST_CHOICES,
    );
    const params = new URLSearchParams(query);
    expect(params.get("q")).toBe("ana");
    expect(params.get("role")).toBe("moderator");
    expect(params.get("state")).toBe("banned");
    expect(params.has("verified")).toBe(false);
    expect(params.get("two_factor")).toBe("false");
    expect(params.get("sort")).toBe("newest");
    expect(params.has("is_admin")).toBe(false);
  });

  it("drops unknown roles, states and sorts", () => {
    const { query } = adminListQuery(
      { role: "owner", state: "mustChange", sort: "email" },
      USER_LIST_KEYS,
      USER_LIST_CHOICES,
    );
    const params = new URLSearchParams(query);
    expect(params.has("role")).toBe(false);
    expect(params.has("state")).toBe(false);
    expect(params.has("sort")).toBe(false);
  });

  it("strips paging for the export", () => {
    expect(withoutPaging("page=2&per_page=25&role=admin")).toBe("role=admin");
    expect(withoutPaging(new URLSearchParams("page=1"))).toBe("");
  });
});

describe("CSV exports", () => {
  it("knows only the two exports", () => {
    expect(isAdminExportKind("users")).toBe(true);
    expect(isAdminExportKind("audit-logs")).toBe(true);
    expect(isAdminExportKind("toString")).toBe(false);
    expect(isAdminExportKind("payments")).toBe(false);
  });

  it("keeps only each export's own keys", () => {
    expect(
      adminExportHref("users", "role=admin&page=2&action=user.&q=a b"),
    ).toBe("/api/export/admin/users?role=admin&q=a+b");
    expect(
      adminExportHref(
        "audit-logs",
        `action=user.&from=2026-09-01T03:00:00&role=admin&actor_id=${ID_A}`,
      ),
    ).toBe(
      `/api/export/admin/audit-logs?action=user.&from=2026-09-01T03%3A00%3A00&actor_id=${ID_A}`,
    );
    expect(adminExportHref("users")).toBe("/api/export/admin/users");
  });
});

describe("attentionItems", () => {
  it("is empty when everything is normal", () => {
    expect(attentionItems(overview())).toEqual([]);
  });

  it("lists what is abnormal, most urgent first", () => {
    const items = attentionItems(
      overview({
        maintenance_mode: "read_only",
        registrations_open: false,
        support_open: 3,
        support_urgent: 1,
        moderation_open: 2,
        emails_failed_24h: 4,
        incidents_active: 1,
        users: { ...overview().users, staff_without_2fa: 2 },
      }),
    );
    expect(items.map((i) => i.key)).toEqual([
      "maintenance",
      "incidents",
      "supportUrgent",
      "emailsFailed",
      "supportOpen",
      "moderation",
      "registrationsClosed",
      "staffTwoFactor",
    ]);
    expect(items.find((i) => i.key === "emailsFailed")).toEqual({
      key: "emailsFailed",
      tone: "critical",
      count: 4,
    });
  });

  it("flags the e-mail queue only when it is backed up", () => {
    const fresh = overview({
      emails_pending: 3,
      oldest_pending_email_at: "2026-10-01T11:55:00",
    });
    expect(oldestPendingMinutes(fresh)).toBe(5);
    expect(emailBacklogStale(fresh)).toBe(false);
    expect(attentionItems(fresh)).toEqual([]);

    const stale = overview({
      emails_pending: 3,
      oldest_pending_email_at: "2026-10-01T11:30:00",
    });
    expect(oldestPendingMinutes(stale)).toBe(30);
    expect(attentionItems(stale)).toEqual([
      { key: "emailBacklog", tone: "warning", count: 3 },
    ]);

    expect(emailBacklogStale(overview({ emails_pending: 250 }))).toBe(true);
    expect(oldestPendingMinutes(overview())).toBeNull();
  });
});

describe("search", () => {
  it("normalizes the query", () => {
    expect(normalizeSearch("  rock  ")).toBe("rock");
    expect(normalizeSearch(["#1042", "x"])).toBe("#1042");
    expect(normalizeSearch(undefined)).toBe("");
    expect(normalizeSearch("a".repeat(300))).toHaveLength(100);
  });

  it("needs at least two characters", () => {
    expect(searchState("")).toBe("empty");
    expect(searchState("a")).toBe("short");
    expect(searchState("ab")).toBe("ready");
  });
});

describe("bulk actions", () => {
  const users = [
    { id: ID_A, status: "active" as const, is_banned: false },
    { id: ID_B, status: "inactive" as const, is_banned: false },
    { id: ID_C, status: "active" as const, is_banned: true },
  ];

  it("sends only the accounts the action changes", () => {
    expect(bulkTargets("revoke_sessions", users)).toEqual([ID_A, ID_B, ID_C]);
    expect(bulkTargets("ban", users)).toEqual([ID_A, ID_B, ID_C]);
    expect(bulkTargets("unban", users)).toEqual([ID_C]);
    expect(bulkTargets("deactivate", users)).toEqual([ID_A, ID_C]);
    expect(bulkTargets("activate", users)).toEqual([ID_B]);
  });

  it("selects only accounts the actor manages", () => {
    const moderator = { id: ID_A, role: "moderator" as const };
    expect(canSelectForBulk(moderator, { id: ID_B, role: "user" })).toBe(true);
    expect(canSelectForBulk(moderator, { id: ID_B, role: "moderator" })).toBe(
      false,
    );
    expect(canSelectForBulk(moderator, { id: ID_A, role: "user" })).toBe(false);
    const admin = { id: ID_A, role: "admin" as const };
    expect(canSelectForBulk(admin, { id: ID_B, role: "moderator" })).toBe(true);
    expect(canSelectForBulk(admin, { id: ID_B, role: "admin" })).toBe(false);
  });

  it("groups failures by code", () => {
    expect(
      groupBulkFailures([
        { user_id: ID_A, code: "INSUFFICIENT_ROLE" },
        { user_id: ID_B, code: "NOT_FOUND" },
        { user_id: ID_C, code: "INSUFFICIENT_ROLE" },
      ]),
    ).toEqual([
      { code: "INSUFFICIENT_ROLE", userIds: [ID_A, ID_C] },
      { code: "NOT_FOUND", userIds: [ID_B] },
    ]);
  });
});

describe("signInMethodParts", () => {
  it("splits combined methods", () => {
    expect(signInMethodParts("google+two_factor")).toEqual([
      "google",
      "two_factor",
    ]);
    expect(signInMethodParts("password")).toEqual(["password"]);
    expect(signInMethodParts(null)).toEqual([]);
  });
});
