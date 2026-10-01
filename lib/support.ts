/**
 * The support desk, requester side: which actions a request allows, how
 * its status reads, and the checks the "new request" form runs before
 * anything is sent. Pure, so it is unit tested
 * (lib/__tests__/support.test.ts); the API applies the same limits.
 */

import {
  SUPPORT_MESSAGE_MAX,
  SUPPORT_SUBJECT_MAX,
  SUPPORT_SUBJECT_MIN,
  TICKET_CATEGORIES,
  type SupportTicket,
  type TicketCategory,
  type TicketStatus,
} from "@/types/operations";

/** Longest comment accepted with a rating. */
export const SUPPORT_RATING_COMMENT_MAX = 500;

/** Size cap of the `context` object sent with a new request (JSON bytes). */
export const SUPPORT_CONTEXT_MAX_BYTES = 2_000;

/** How much of the browser's user agent goes into that context. */
const USER_AGENT_MAX = 200;

export const SUPPORT_HREF = "/dashboard/support";

export function supportTicketHref(id: string): string {
  return `${SUPPORT_HREF}/${encodeURIComponent(id)}`;
}

/** `#1042`: how a request is referred to everywhere (e-mails too). */
export function formatTicketNumber(number: number): string {
  return `#${number}`;
}

/**
 * Badge colors per status, from the requester's point of view: amber when
 * the team is waiting on them, neutral while the team works on it, green
 * once solved.
 */
export const TICKET_STATUS_STYLES: Record<TicketStatus, string> = {
  open: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  pending:
    "border-amber-500/30 bg-amber-500/15 text-amber-800 dark:text-amber-300",
  resolved:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  closed: "border-border bg-muted text-muted-foreground",
};

/** A closed request is final: no replies (the API answers `TICKET_CLOSED`). */
export function canReplyToTicket(status: TicketStatus): boolean {
  return status !== "closed";
}

export function canCloseTicket(status: TicketStatus): boolean {
  return status !== "closed";
}

/** Rated once, after the team marked it resolved (or it was closed). */
export function canRateTicket(
  ticket: Pick<SupportTicket, "status" | "rating">,
): boolean {
  return (
    (ticket.status === "resolved" || ticket.status === "closed") &&
    ticket.rating === null
  );
}

export function isTicketCategory(value: unknown): value is TicketCategory {
  return (
    typeof value === "string" &&
    (TICKET_CATEGORIES as readonly string[]).includes(value)
  );
}

/**
 * Length the way the API counts it (characters, not UTF-16 units: an
 * emoji is one), after trimming.
 */
export function supportTextLength(value: string): number {
  return Array.from(value.trim()).length;
}

/** Why a field of the form can't be sent, as a key under `support.form`. */
export type TicketDraftError =
  | "subjectTooShort"
  | "subjectTooLong"
  | "categoryRequired"
  | "messageRequired"
  | "messageTooLong";

export interface TicketDraft {
  subject: string;
  category: string;
  body: string;
}

export function validateTicketDraft(
  draft: TicketDraft,
): Partial<Record<keyof TicketDraft, TicketDraftError>> {
  const errors: Partial<Record<keyof TicketDraft, TicketDraftError>> = {};
  const subject = supportTextLength(draft.subject);
  if (subject < SUPPORT_SUBJECT_MIN) errors.subject = "subjectTooShort";
  else if (subject > SUPPORT_SUBJECT_MAX) errors.subject = "subjectTooLong";
  if (!isTicketCategory(draft.category)) errors.category = "categoryRequired";
  const body = validateSupportMessage(draft.body);
  if (body) errors.body = body;
  return errors;
}

/** The check a reply (or the first message) gets before it is sent. */
export function validateSupportMessage(
  body: string,
): "messageRequired" | "messageTooLong" | null {
  const length = supportTextLength(body);
  if (length === 0) return "messageRequired";
  if (length > SUPPORT_MESSAGE_MAX) return "messageTooLong";
  return null;
}

/**
 * Where the request was opened from, for the staff reading it: the page
 * and a shortened user agent. Anything that doesn't fit the API's cap is
 * dropped rather than refused, so the request itself always goes out.
 */
export function supportContext(
  page: string,
  userAgent: string | null | undefined,
): Record<string, string> {
  const context: Record<string, string> = { page: page.slice(0, 300) };
  if (userAgent) context.user_agent = userAgent.slice(0, USER_AGENT_MAX);
  return new TextEncoder().encode(JSON.stringify(context)).length <=
    SUPPORT_CONTEXT_MAX_BYTES
    ? context
    : { page: context.page };
}
