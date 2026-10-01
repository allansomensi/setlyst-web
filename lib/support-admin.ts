/**
 * Pure helpers for the staff support inbox (`/dashboard/admin/support`):
 * reading its filters from the URL, ordering and describing tickets, and
 * formatting the numbers in its header. No React, no I/O, so they can be
 * unit tested (lib/__tests__/support-admin.test.ts).
 */

import { ADMIN_PAGE_SIZE } from "@/lib/admin-list";
import { isUuid } from "@/lib/uuid";
import {
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  TICKET_TABS,
  type TicketCategory,
  type TicketPriority,
  type TicketStatus,
  type TicketTab,
} from "@/types/operations";

type RawParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw?.trim() || undefined;
}

function oneOf<T extends string>(
  list: readonly T[],
  value: string | undefined,
): T | null {
  return value && (list as readonly string[]).includes(value)
    ? (value as T)
    : null;
}

export const DEFAULT_TICKET_TAB: TicketTab = "active";

/** The inbox tab in `?status=`, `active` when missing or unknown. */
export function parseTicketTab(value: string | undefined): TicketTab {
  return oneOf(TICKET_TABS, value) ?? DEFAULT_TICKET_TAB;
}

/**
 * The "assigned to" quick filter, kept in `?assignee=`: `me` (the viewer,
 * so a shared link means "mine" for whoever opens it) or `none`.
 */
export const ASSIGNEE_FILTERS = ["me", "none"] as const;
export type AssigneeFilter = (typeof ASSIGNEE_FILTERS)[number];

export interface SupportInboxFilters {
  tab: TicketTab;
  priority: TicketPriority | null;
  category: TicketCategory | null;
  assignee: AssigneeFilter | null;
  userId: string | null;
  q: string | null;
  page: number;
}

/** Reads the inbox filters from the page's search params. */
export function parseInboxFilters(raw: RawParams): SupportInboxFilters {
  const userId = first(raw.user_id);
  const q = first(raw.q);
  return {
    tab: parseTicketTab(first(raw.status)),
    priority: oneOf(TICKET_PRIORITIES, first(raw.priority)),
    category: oneOf(TICKET_CATEGORIES, first(raw.category)),
    assignee: oneOf(ASSIGNEE_FILTERS, first(raw.assignee)),
    userId: userId && isUuid(userId) ? userId : null,
    q: q ? q.slice(0, 100) : null,
    page: Math.max(1, Number.parseInt(first(raw.page) ?? "1", 10) || 1),
  };
}

/**
 * The query string of `GET /admin/support/tickets` for `filters`. Only
 * well-formed values reach the API (see `parseInboxFilters`); "assigned to
 * me" becomes the viewer's own id.
 */
export function inboxApiQuery(
  filters: SupportInboxFilters,
  viewerId: string,
  perPage = ADMIN_PAGE_SIZE,
): string {
  const params = new URLSearchParams({
    status: filters.tab,
    page: String(filters.page),
    per_page: String(perPage),
  });
  if (filters.priority) params.set("priority", filters.priority);
  if (filters.category) params.set("category", filters.category);
  if (filters.assignee === "me" && isUuid(viewerId)) {
    params.set("assignee_id", viewerId);
  } else if (filters.assignee === "none") {
    params.set("unassigned", "true");
  }
  if (filters.userId) params.set("user_id", filters.userId);
  if (filters.q) params.set("q", filters.q);
  return params.toString();
}

/** Whether anything beyond the tab and the page narrows the inbox. */
export function hasInboxFilters(filters: SupportInboxFilters): boolean {
  return Boolean(
    filters.priority ||
    filters.category ||
    filters.assignee ||
    filters.userId ||
    filters.q,
  );
}

/** Open and pending tickets are the ones still being worked on. */
export function isActiveStatus(status: TicketStatus): boolean {
  return status === "open" || status === "pending";
}

/**
 * The requester spoke last on a ticket that is still being worked on:
 * someone on the staff owes them an answer.
 */
export function isAwaitingStaff(ticket: {
  status: TicketStatus;
  last_from_requester: boolean;
}): boolean {
  return ticket.last_from_requester && isActiveStatus(ticket.status);
}

const PRIORITY_RANK: Record<TicketPriority, number> = {
  low: 0,
  normal: 1,
  high: 2,
  urgent: 3,
};

/** Higher is more pressing (`urgent` = 3). Unknown values rank as normal. */
export function priorityRank(priority: TicketPriority): number {
  return PRIORITY_RANK[priority] ?? PRIORITY_RANK.normal;
}

/** `high` and `urgent` stand out in the inbox. */
export function isHighPriority(priority: TicketPriority): boolean {
  return priorityRank(priority) >= PRIORITY_RANK.high;
}

/** `#1042`. */
export function ticketLabel(ticket: { number: number }): string {
  return `#${ticket.number}`;
}

export type ComposerMode = "reply" | "note";

/**
 * The value the composer's "status after sending" select starts on: a
 * reply hands the ticket back to the requester (`pending`, as the API
 * does by default), a note leaves it alone (`""`, no status sent). Any
 * status can be picked instead: a reply that only acknowledges the
 * request keeps it `open`, a note can resolve it.
 */
export function defaultStatusAfterSend(mode: ComposerMode): TicketStatus | "" {
  return mode === "reply" ? "pending" : "";
}

export type DurationParts =
  | { unit: "lessThanMinute"; value: 0 }
  | { unit: "minutes" | "hours" | "days"; value: number };

/**
 * A duration in minutes (the summary's median first response) broken
 * into the unit it reads best in: minutes under an hour, hours (one
 * decimal under ten) under two days, then days (one decimal under ten).
 */
export function splitMinutes(minutes: number): DurationParts | null {
  if (!Number.isFinite(minutes) || minutes < 0) return null;
  if (minutes < 1) return { unit: "lessThanMinute", value: 0 };
  if (minutes < 59.5) return { unit: "minutes", value: Math.round(minutes) };
  const hours = minutes / 60;
  if (hours < 47.95) return { unit: "hours", value: roundSmall(hours) };
  return { unit: "days", value: roundSmall(hours / 24) };
}

/** One decimal under ten, whole numbers above. */
function roundSmall(value: number): number {
  return value < 9.95 ? Math.round(value * 10) / 10 : Math.round(value);
}

/** An average rating rounded to one decimal, or null when there is none. */
export function roundRating(value: number | null | undefined): number | null {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return null;
  }
  return Math.round(value * 10) / 10;
}

export interface ContextEntry {
  key: string;
  value: string;
}

const CONTEXT_MAX_DEPTH = 3;
const CONTEXT_MAX_ENTRIES = 30;
const CONTEXT_MAX_VALUE = 300;

/**
 * The ticket's `context` (what the app attached when it was opened: the
 * page, the browser, a song id...) as a flat key/value list. Nested
 * objects become dotted keys; arrays of plain values are joined; anything
 * deeper or longer is cut short so a large blob can't swamp the page.
 */
export function contextEntries(context: unknown): ContextEntry[] {
  const out: ContextEntry[] = [];
  const push = (key: string, value: string) => {
    if (out.length >= CONTEXT_MAX_ENTRIES) return;
    out.push({
      key,
      value:
        value.length > CONTEXT_MAX_VALUE
          ? `${value.slice(0, CONTEXT_MAX_VALUE - 1)}…`
          : value,
    });
  };

  const walk = (value: unknown, key: string, depth: number) => {
    if (value === null || value === undefined) {
      push(key, "—");
    } else if (Array.isArray(value)) {
      const plain = value.every((item) => item === null || !isObject(item));
      if (plain || depth >= CONTEXT_MAX_DEPTH) {
        push(key, plain ? value.map(stringify).join(", ") : json(value));
      } else {
        value.forEach((item, index) =>
          walk(item, `${key}.${index}`, depth + 1),
        );
      }
    } else if (isObject(value)) {
      if (depth >= CONTEXT_MAX_DEPTH) {
        push(key, json(value));
        return;
      }
      for (const [child, childValue] of Object.entries(value)) {
        walk(childValue, key ? `${key}.${child}` : child, depth + 1);
      }
    } else {
      push(key, stringify(value));
    }
  };

  if (isObject(context)) walk(context, "", 0);
  return out;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringify(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return json(value);
}

function json(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
