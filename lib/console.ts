/**
 * Pure helpers for the staff console: the account list's filters (and the
 * CSV exports, which take the same ones), what the overview flags as
 * needing attention, global search input, and which accounts a bulk
 * action applies to. No server or browser APIs, so they are unit tested
 * (lib/__tests__/console.test.ts).
 */

import { canManageUser, type StaffActor } from "@/lib/staff-permissions";
import type { User, UserRole } from "@/types/api";
import type {
  BulkUserAction,
  BulkUserResult,
  ConsoleOverview,
} from "@/types/operations";

// ------------------------------------------------------- account filters

export const USER_ROLE_FILTERS = [
  "user",
  "moderator",
  "admin",
] as const satisfies readonly UserRole[];

/** `GET /users?state=`: deactivated is `inactive`, suspended is `banned`. */
export const USER_STATE_FILTERS = ["active", "inactive", "banned"] as const;

/** `GET /users?sort=`; the API's default is `username`. */
export const USER_SORTS = [
  "username",
  "newest",
  "oldest",
  "last_login",
] as const;
export type UserSort = (typeof USER_SORTS)[number];

/**
 * Query keys the staff account list copies from its URL to `GET /users`
 * (through `adminListQuery`). `created_from`/`created_to` are whole days
 * in the URL and become UTC instants separately (lib/date-range.ts).
 */
export const USER_LIST_KEYS = [
  "q",
  "role",
  "state",
  "verified",
  "two_factor",
  "sort",
] as const;

/** The values each enumerated filter accepts; anything else is dropped. */
export const USER_LIST_CHOICES: Readonly<Record<string, readonly string[]>> = {
  role: USER_ROLE_FILTERS,
  state: USER_STATE_FILTERS,
  verified: ["true", "false"],
  two_factor: ["true", "false"],
  sort: USER_SORTS,
};

/** The URL params that narrow the account list (for "clear filters"). */
export const USER_FILTER_PARAMS = [
  ...USER_LIST_KEYS.filter((key) => key !== "sort"),
  "created_from",
  "created_to",
] as const;

/** A list's API query without its paging, for the matching CSV export. */
export function withoutPaging(query: string | URLSearchParams): string {
  const params = new URLSearchParams(query);
  params.delete("page");
  params.delete("per_page");
  return params.toString();
}

// ------------------------------------------------------------ CSV exports

/**
 * The CSV exports the app proxies (`/api/export/admin/{kind}`), with the
 * only query keys each forwards to the API. Both are admin-only there.
 */
export const ADMIN_EXPORTS = {
  users: {
    endpoint: "/admin/users/export",
    keys: new Set<string>([...USER_LIST_KEYS, "created_from", "created_to"]),
  },
  "audit-logs": {
    endpoint: "/admin/audit-logs/export",
    keys: new Set<string>([
      "actor_id",
      "target_id",
      "action",
      "q",
      "from",
      "to",
    ]),
  },
} as const satisfies Record<
  string,
  { endpoint: string; keys: ReadonlySet<string> }
>;

export type AdminExportKind = keyof typeof ADMIN_EXPORTS;

export function isAdminExportKind(value: string): value is AdminExportKind {
  return Object.prototype.hasOwnProperty.call(ADMIN_EXPORTS, value);
}

/** The app's own download URL for an export with `query` (an API query). */
export function adminExportHref(kind: AdminExportKind, query = ""): string {
  const params = new URLSearchParams(query);
  const forwarded = new URLSearchParams();
  for (const [key, value] of params) {
    if (ADMIN_EXPORTS[kind].keys.has(key) && !forwarded.has(key)) {
      forwarded.set(key, value);
    }
  }
  const qs = forwarded.toString();
  return `/api/export/admin/${kind}${qs ? `?${qs}` : ""}`;
}

// -------------------------------------------------------------- overview

/**
 * The e-mail queue counts as backed up when its oldest message has waited
 * this long, or holds this many messages.
 */
export const EMAIL_BACKLOG_MINUTES = 15;
export const EMAIL_BACKLOG_SIZE = 100;

export type AttentionKey =
  | "maintenance"
  | "incidents"
  | "supportUrgent"
  | "emailsFailed"
  | "supportOpen"
  | "moderation"
  | "emailBacklog"
  | "registrationsClosed"
  | "staffTwoFactor";

export interface AttentionItem {
  key: AttentionKey;
  /** `critical`: something is broken or someone is waiting on it. */
  tone: "critical" | "warning";
  count: number;
}

/** Naive UTC (`2026-10-01T12:00:00`) to epoch milliseconds, or NaN. */
function apiInstant(value: string): number {
  return Date.parse(/[zZ]|[+-]\d{2}:?\d{2}$/.test(value) ? value : `${value}Z`);
}

/**
 * Minutes the oldest pending e-mail has waited when the overview was
 * computed, or null when nothing is pending.
 */
export function oldestPendingMinutes(overview: ConsoleOverview): number | null {
  if (!overview.oldest_pending_email_at || overview.emails_pending === 0) {
    return null;
  }
  const waited =
    apiInstant(overview.generated_at) -
    apiInstant(overview.oldest_pending_email_at);
  return Number.isFinite(waited)
    ? Math.max(0, Math.floor(waited / 60_000))
    : null;
}

export function emailBacklogStale(overview: ConsoleOverview): boolean {
  if (overview.emails_pending >= EMAIL_BACKLOG_SIZE) return true;
  const minutes = oldestPendingMinutes(overview);
  return minutes !== null && minutes >= EMAIL_BACKLOG_MINUTES;
}

/**
 * What the console's home lists under "Needs attention": only what is
 * abnormal or waiting on staff, most urgent first. Empty means all clear.
 */
export function attentionItems(overview: ConsoleOverview): AttentionItem[] {
  const items: AttentionItem[] = [];
  const add = (
    key: AttentionKey,
    tone: AttentionItem["tone"],
    count: number,
    when = count > 0,
  ) => {
    if (when) items.push({ key, tone, count });
  };

  add("maintenance", "critical", 1, overview.maintenance_mode !== "off");
  add("incidents", "critical", overview.incidents_active);
  add("supportUrgent", "critical", overview.support_urgent);
  add("emailsFailed", "critical", overview.emails_failed_24h);
  add("supportOpen", "warning", overview.support_open);
  add("moderation", "warning", overview.moderation_open);
  add(
    "emailBacklog",
    "warning",
    overview.emails_pending,
    emailBacklogStale(overview),
  );
  add("registrationsClosed", "warning", 1, !overview.registrations_open);
  add("staffTwoFactor", "warning", overview.users.staff_without_2fa);
  return items;
}

// ---------------------------------------------------------------- search

export const SEARCH_MIN_LENGTH = 2;
export const SEARCH_MAX_LENGTH = 100;

/** `?q=` as searched: trimmed and capped. */
export function normalizeSearch(raw: string | string[] | undefined): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return (value ?? "").trim().slice(0, SEARCH_MAX_LENGTH);
}

export function searchState(q: string): "empty" | "short" | "ready" {
  if (!q) return "empty";
  return [...q].length < SEARCH_MIN_LENGTH ? "short" : "ready";
}

// ----------------------------------------------------------- bulk actions

/** Accounts one bulk request takes at most (`POST /admin/users/bulk`). */
export const BULK_MAX = 100;

type BulkFields = Pick<User, "id" | "status" | "is_banned">;

/** Whether `actor` may tick `user` for a bulk action (same as one by one). */
export function canSelectForBulk(
  actor: StaffActor,
  user: Pick<User, "id" | "role">,
): boolean {
  return canManageUser(actor, user);
}

/**
 * The selected accounts `action` would change: lifting a suspension only
 * touches suspended accounts, deactivating only active ones, reactivating
 * only deactivated ones. The others are left out of the request, so they
 * don't fill the audit log with no-ops.
 */
export function bulkTargets(
  action: BulkUserAction,
  users: readonly BulkFields[],
): string[] {
  const applies = (user: BulkFields) => {
    switch (action) {
      case "unban":
        return user.is_banned;
      case "deactivate":
        return user.status === "active";
      case "activate":
        return user.status === "inactive";
      default:
        return true;
    }
  };
  return users.filter(applies).map((user) => user.id);
}

/** The refused accounts grouped by error code, in the order first seen. */
export function groupBulkFailures(
  failed: BulkUserResult["failed"],
): { code: string; userIds: string[] }[] {
  const groups = new Map<string, string[]>();
  for (const { user_id, code } of failed) {
    const list = groups.get(code) ?? [];
    list.push(user_id);
    groups.set(code, list);
  }
  return [...groups].map(([code, userIds]) => ({ code, userIds }));
}

// ------------------------------------------------------ sign-in activity

/** Sign-in methods with a translated name (`password+two_factor`...). */
export const SIGN_IN_METHODS = ["password", "google", "two_factor"] as const;
export type SignInMethod = (typeof SIGN_IN_METHODS)[number];

/**
 * The parts of a recorded sign-in method (`google+two_factor` → google,
 * two_factor). Unknown parts are kept as sent.
 */
export function signInMethodParts(method: string | null | undefined): string[] {
  return (method ?? "")
    .split("+")
    .map((part) => part.trim())
    .filter(Boolean);
}

export function isKnownSignInMethod(value: string): value is SignInMethod {
  return (SIGN_IN_METHODS as readonly string[]).includes(value);
}
