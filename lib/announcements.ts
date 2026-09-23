/**
 * Pure helpers for announcements: the staff editor's form model and its
 * validation (mirroring the API, `models/announcement.rs`), which fields
 * may change in each status, the PATCH diff, and call-to-action links.
 */

import {
  isBeforeUtc,
  localInputToUtcNaive,
  utcNaiveToLocalInput,
} from "@/lib/datetime-local";
import type {
  Announcement,
  AnnouncementLevel,
  AnnouncementPatch,
  AnnouncementPayload,
  AnnouncementStatus,
  AudiencePayload,
} from "@/types/communication";

export const TITLE_MIN = 3;
export const TITLE_MAX = 120;
export const BODY_MAX = 5000;
export const CTA_LABEL_MAX = 40;
export const CTA_URL_MAX = 500;

/** Audience pseudo plans: no live subscription, and a running trial. */
export const AUDIENCE_PLAN_NONE = "none";
export const AUDIENCE_PLAN_TRIAL = "trial";

/** Fields the API still accepts while an announcement is active. */
export const LIVE_EDITABLE_FIELDS = [
  "title",
  "body",
  "cta_label",
  "cta_url",
  "ends_at",
  "show_modal",
  "show_banner",
] as const satisfies readonly (keyof AnnouncementPayload)[];

export type AnnouncementField = keyof AnnouncementPayload;

/** The editor's state. Dates are `datetime-local` values (local time). */
export interface AnnouncementForm {
  title: string;
  body: string;
  level: AnnouncementLevel;
  show_modal: boolean;
  show_banner: boolean;
  send_notification: boolean;
  send_email: boolean;
  dismissible: boolean;
  requires_acknowledgement: boolean;
  cta_label: string;
  cta_url: string;
  /** Empty = everybody. */
  audience_roles: string[];
  audience_plans: string[];
  audience_locales: string[];
  starts_at: string;
  ends_at: string;
}

export function emptyAnnouncementForm(): AnnouncementForm {
  return {
    title: "",
    body: "",
    level: "info",
    show_modal: false,
    show_banner: true,
    send_notification: true,
    send_email: false,
    dismissible: true,
    requires_acknowledgement: false,
    cta_label: "",
    cta_url: "",
    audience_roles: [],
    audience_plans: [],
    audience_locales: [],
    starts_at: "",
    ends_at: "",
  };
}

export function announcementToForm(a: Announcement): AnnouncementForm {
  return {
    title: a.title,
    body: a.body,
    level: a.level,
    show_modal: a.show_modal,
    show_banner: a.show_banner,
    send_notification: a.send_notification,
    send_email: a.send_email,
    dismissible: a.dismissible,
    requires_acknowledgement: a.requires_acknowledgement,
    cta_label: a.cta_label ?? "",
    cta_url: a.cta_url ?? "",
    audience_roles: a.audience_roles ?? [],
    audience_plans: a.audience_plans ?? [],
    audience_locales: a.audience_locales ?? [],
    starts_at: utcNaiveToLocalInput(a.starts_at),
    ends_at: utcNaiveToLocalInput(a.ends_at),
  };
}

function orNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function listOrNull(values: string[]): string[] | null {
  const unique = Array.from(
    new Set(values.map((v) => v.trim()).filter(Boolean)),
  );
  return unique.length ? unique : null;
}

export function audienceOf(form: AnnouncementForm): AudiencePayload {
  return {
    audience_roles: listOrNull(form.audience_roles),
    audience_plans: listOrNull(form.audience_plans),
    audience_locales: listOrNull(form.audience_locales),
  };
}

/** A stable key of the audience, to debounce the live count. */
export function audienceKey(audience: AudiencePayload): string {
  const part = (list: string[] | null) =>
    list ? [...list].sort().join(",") : "*";
  return [
    part(audience.audience_roles),
    part(audience.audience_plans),
    part(audience.audience_locales),
  ].join("|");
}

export function formToPayload(form: AnnouncementForm): AnnouncementPayload {
  const ack = form.requires_acknowledgement;
  return {
    title: form.title.trim(),
    body: form.body.trim(),
    level: form.level,
    // Acknowledgement is asked in the modal, so it implies the modal.
    show_modal: form.show_modal || ack,
    show_banner: form.show_banner,
    send_notification: form.send_notification,
    send_email: form.send_email,
    dismissible: ack ? false : form.dismissible,
    requires_acknowledgement: ack,
    cta_label: orNull(form.cta_label),
    cta_url: orNull(form.cta_url),
    ...audienceOf(form),
    starts_at: localInputToUtcNaive(form.starts_at),
    ends_at: localInputToUtcNaive(form.ends_at),
  };
}

/** Same as `formToPayload` for an announcement loaded from the API. */
export function announcementToPayload(a: Announcement): AnnouncementPayload {
  return {
    title: a.title,
    body: a.body,
    level: a.level,
    show_modal: a.show_modal,
    show_banner: a.show_banner,
    send_notification: a.send_notification,
    send_email: a.send_email,
    dismissible: a.dismissible,
    requires_acknowledgement: a.requires_acknowledgement,
    cta_label: a.cta_label,
    cta_url: a.cta_url,
    audience_roles: a.audience_roles?.length ? a.audience_roles : null,
    audience_plans: a.audience_plans?.length ? a.audience_plans : null,
    audience_locales: a.audience_locales?.length ? a.audience_locales : null,
    starts_at: a.starts_at,
    ends_at: a.ends_at,
  };
}

/**
 * A call-to-action link the API accepts: an app path starting with a
 * single `/`, or an `https` URL with a host and no credentials.
 */
export function isValidCtaUrl(url: string): boolean {
  if (!url || url.length > CTA_URL_MAX || /[\s\u0000-\u001f\u007f]/.test(url)) {
    return false;
  }
  if (url.startsWith("/")) {
    return !url.startsWith("//") && !url.startsWith("/\\");
  }
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === "https:" &&
      parsed.hostname.includes(".") &&
      !parsed.username &&
      !parsed.password
    );
  } catch {
    return false;
  }
}

/** External (`https://...`) links open in a new tab; app paths don't. */
export function isExternalCta(url: string): boolean {
  return /^https:\/\//i.test(url);
}

export type AnnouncementIssue =
  | "titleLength"
  | "bodyLength"
  | "ctaIncomplete"
  | "ctaLabelLength"
  | "ctaUrl"
  | "noChannel"
  | "windowOrder";

/** The first problems of a form, as the API would see them. */
export function validateAnnouncementForm(
  form: AnnouncementForm,
): AnnouncementIssue[] {
  const payload = formToPayload(form);
  const issues: AnnouncementIssue[] = [];
  const titleLength = Array.from(payload.title).length;
  if (titleLength < TITLE_MIN || titleLength > TITLE_MAX) {
    issues.push("titleLength");
  }
  const bodyLength = Array.from(payload.body).length;
  if (bodyLength < 1 || bodyLength > BODY_MAX) issues.push("bodyLength");

  const { cta_label: label, cta_url: url } = payload;
  if ((label === null) !== (url === null)) {
    issues.push("ctaIncomplete");
  } else if (label !== null && url !== null) {
    if (Array.from(label).length > CTA_LABEL_MAX) issues.push("ctaLabelLength");
    if (!isValidCtaUrl(url)) issues.push("ctaUrl");
  }

  if (
    !payload.show_modal &&
    !payload.show_banner &&
    !payload.send_notification &&
    !payload.send_email
  ) {
    issues.push("noChannel");
  }
  if (
    payload.starts_at &&
    payload.ends_at &&
    !isBeforeUtc(payload.starts_at, payload.ends_at)
  ) {
    issues.push("windowOrder");
  }
  return issues;
}

/** Which fields may change in `status` (`null` = a new announcement). */
export function editableFields(
  status: AnnouncementStatus | null,
): "all" | "none" | readonly AnnouncementField[] {
  switch (status) {
    case null:
    case "draft":
    case "scheduled":
      return "all";
    case "active":
      return LIVE_EDITABLE_FIELDS;
    default:
      return "none";
  }
}

export function isFieldEditable(
  status: AnnouncementStatus | null,
  field: AnnouncementField,
): boolean {
  const editable = editableFields(status);
  if (editable === "all") return true;
  if (editable === "none") return false;
  return editable.includes(field);
}

function sameValue(a: unknown, b: unknown): boolean {
  if (Array.isArray(a) || Array.isArray(b)) {
    const left = Array.isArray(a) ? [...a].sort() : [];
    const right = Array.isArray(b) ? [...b].sort() : [];
    return left.length === right.length && left.every((v, i) => v === right[i]);
  }
  return (a ?? null) === (b ?? null);
}

/** Only the fields that differ between `original` and `next`. */
export function buildAnnouncementPatch(
  original: AnnouncementPayload,
  next: AnnouncementPayload,
): AnnouncementPatch {
  const patch: Record<string, unknown> = {};
  for (const key of Object.keys(next) as AnnouncementField[]) {
    if (!sameValue(original[key], next[key])) patch[key] = next[key];
  }
  return patch as AnnouncementPatch;
}

/** Fields of `patch` the API would refuse in `status` (`ANNOUNCEMENT_LOCKED`). */
export function lockedFieldsIn(
  patch: AnnouncementPatch,
  status: AnnouncementStatus | null,
): AnnouncementField[] {
  return (Object.keys(patch) as AnnouncementField[]).filter(
    (field) => !isFieldEditable(status, field),
  );
}

/** Whether people see it now, or will (it can still be archived). */
export function canArchive(status: AnnouncementStatus | null): boolean {
  return status === "scheduled" || status === "active" || status === "ended";
}

/** Tailwind classes per level: surface, accent border and icon color. */
export const LEVEL_STYLES: Record<
  AnnouncementLevel,
  { surface: string; border: string; icon: string; dot: string; button: string }
> = {
  info: {
    surface: "bg-sky-500/10",
    border: "border-sky-500/40",
    icon: "text-sky-600 dark:text-sky-400",
    dot: "bg-sky-500",
    button: "",
  },
  success: {
    surface: "bg-emerald-500/10",
    border: "border-emerald-500/40",
    icon: "text-emerald-600 dark:text-emerald-400",
    dot: "bg-emerald-500",
    button: "",
  },
  warning: {
    surface: "bg-amber-500/10",
    border: "border-amber-500/50",
    icon: "text-amber-600 dark:text-amber-400",
    dot: "bg-amber-500",
    button: "",
  },
  critical: {
    surface: "bg-red-500/10",
    border: "border-red-500/50",
    icon: "text-red-600 dark:text-red-400",
    dot: "bg-red-500",
    button: "bg-destructive text-white hover:bg-destructive/90",
  },
};

export const STATUS_BADGE_STYLES: Record<AnnouncementStatus, string> = {
  draft: "border-border text-muted-foreground",
  scheduled: "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  active:
    "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  ended: "border-border bg-muted text-muted-foreground",
  archived: "border-border bg-muted text-muted-foreground line-through",
};
