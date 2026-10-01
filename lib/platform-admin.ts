/**
 * Pure helpers for the platform-operations screens: the platform switches
 * (blocked e-mail domains), status incidents (shared by the staff console
 * and the public status page) and the e-mail console. The API re-checks
 * everything; these only keep the forms honest before saving.
 */

import type {
  Incident,
  IncidentImpact,
  IncidentKind,
  IncidentStatus,
  OutboxEmail,
  OutboxStatus,
} from "@/types/operations";

// ------------------------------------------------------------- platform

/** Longest maintenance message the API accepts. */
export const MAINTENANCE_MESSAGE_MAX = 500;
/** Most blocked e-mail domains the API stores. */
export const BLOCKED_DOMAINS_MAX = 500;

const DOMAIN_LABEL = /^[a-z0-9-]+$/;

/**
 * `raw` as the API stores a blocked domain: trimmed, without a leading
 * `@` or `.` (nor a trailing `.`), lower-cased. `null` when it isn't a
 * plausible host name (`example.com`, `mail.example.co.uk`), with the
 * API's rules (`setlyst-api/src/models/platform.rs`, `normalize_domain`).
 */
export function normalizeDomain(raw: string): string | null {
  const domain = raw
    .trim()
    .replace(/^@+/, "")
    .replace(/^\.+/, "")
    .replace(/\.+$/, "")
    .toLowerCase();
  const valid =
    domain.length > 0 &&
    domain.length <= 253 &&
    domain.includes(".") &&
    domain
      .split(".")
      .every(
        (label) =>
          label.length > 0 &&
          label.length <= 63 &&
          !label.startsWith("-") &&
          !label.endsWith("-") &&
          DOMAIN_LABEL.test(label),
      );
  return valid ? domain : null;
}

export interface ParsedDomainList {
  /** Normalized, deduplicated and sorted, as the API will store them. */
  domains: string[];
  /** Entries that aren't domains, as typed (deduplicated, in order). */
  invalid: string[];
}

/**
 * The blocked-domains textarea: one domain per line (commas, semicolons
 * and spaces also separate, for pasted lists). Blank entries are ignored.
 */
export function parseDomainList(text: string): ParsedDomainList {
  const domains = new Set<string>();
  const invalid: string[] = [];
  for (const entry of text.split(/[\s,;]+/)) {
    if (!entry) continue;
    const domain = normalizeDomain(entry);
    if (domain) domains.add(domain);
    else if (!invalid.includes(entry)) invalid.push(entry);
  }
  return { domains: [...domains].sort(), invalid };
}

/** The stored list back as the textarea's text. */
export function formatDomainList(domains: readonly string[]): string {
  return domains.join("\n");
}

// ------------------------------------------------------------ incidents

export const INCIDENT_TITLE_MIN = 3;
export const INCIDENT_TITLE_MAX = 150;
/** Longest first message or timeline update. */
export const INCIDENT_TEXT_MAX = 2_000;

/** `POST /admin/incidents`. */
export interface CreateIncidentPayload {
  kind: IncidentKind;
  title: string;
  impact: IncidentImpact;
  status: IncidentStatus;
  components: string[];
  scheduled_for: string | null;
  scheduled_until: string | null;
  message: string;
}

/** `PATCH /admin/incidents/{id}`: `null` clears a window bound. */
export interface UpdateIncidentPayload {
  title?: string;
  impact?: IncidentImpact;
  components?: string[];
  scheduled_for?: string | null;
  scheduled_until?: string | null;
}

/** `POST /admin/incidents/{id}/updates`. */
export interface PostIncidentUpdatePayload {
  status: IncidentStatus;
  body: string;
}

/**
 * Statuses an incident can be published with: maintenance is announced
 * ahead of time (`scheduled`); an incident starts at some stage of the
 * investigation (never `scheduled`, never already `resolved`).
 */
export function initialIncidentStatuses(kind: IncidentKind): IncidentStatus[] {
  return kind === "maintenance"
    ? ["scheduled"]
    : ["investigating", "identified", "monitoring"];
}

/** Statuses a timeline update can move an incident to. */
export function updateIncidentStatuses(kind: IncidentKind): IncidentStatus[] {
  return kind === "maintenance"
    ? ["scheduled", "investigating", "identified", "monitoring", "resolved"]
    : ["investigating", "identified", "monitoring", "resolved"];
}

/** Length of `text` as the API counts it (trimmed, in characters). */
export function textLength(text: string): number {
  return [...text.trim()].length;
}

/** Whether `title` fits the API's 3–150 characters. */
export function isValidIncidentTitle(title: string): boolean {
  const length = textLength(title);
  return length >= INCIDENT_TITLE_MIN && length <= INCIDENT_TITLE_MAX;
}

/** Whether a message or update fits the API's 1–2000 characters. */
export function isValidIncidentText(text: string): boolean {
  const length = textLength(text);
  return length >= 1 && length <= INCIDENT_TEXT_MAX;
}

export function isIncidentActive(incident: Pick<Incident, "status">): boolean {
  return incident.status !== "resolved";
}

/** The most recent timeline entry (the API sends them newest first). */
export function latestIncidentUpdate(incident: Pick<Incident, "updates">) {
  return incident.updates[0] ?? null;
}

/** Badge colours for an incident's impact (and the card accent). */
export const INCIDENT_IMPACT_TONES: Record<IncidentImpact, string> = {
  none: "border-slate-500/30 bg-slate-500/10 text-slate-700 dark:text-slate-300",
  minor:
    "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  major:
    "border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-300",
  critical: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
};

/** Left border of a card, by impact. */
export const INCIDENT_IMPACT_ACCENTS: Record<IncidentImpact, string> = {
  none: "border-l-slate-400",
  minor: "border-l-amber-500",
  major: "border-l-orange-500",
  critical: "border-l-red-500",
};

export const INCIDENT_STATUS_TONES: Record<IncidentStatus, string> = {
  scheduled: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  investigating:
    "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
  identified:
    "border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-300",
  monitoring:
    "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  resolved:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
};

// --------------------------------------------------------------- e-mails

export const OUTBOX_STATUS_TONES: Record<OutboxStatus, string> = {
  pending: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  sending:
    "border-indigo-500/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",
  sent: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  failed: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
  skipped:
    "border-slate-500/30 bg-slate-500/10 text-slate-700 dark:text-slate-300",
};

/** A failed or skipped e-mail whose variables are still stored. */
export function canRetryEmail(
  email: Pick<OutboxEmail, "status" | "retryable">,
): boolean {
  return (
    (email.status === "failed" || email.status === "skipped") && email.retryable
  );
}

/** Only an e-mail still waiting in the queue can be canceled. */
export function canCancelEmail(email: Pick<OutboxEmail, "status">): boolean {
  return email.status === "pending";
}

/**
 * How close the last hour came to the hourly cap, 0–100 (`null` without
 * a cap). Past it only codes and security notices go out.
 */
export function hourlyCapUsage(sent: number, cap: number): number | null {
  if (cap <= 0) return null;
  return Math.min(100, Math.round((sent / cap) * 100));
}
