"use server";

import { fetchServerApi } from "@/lib/api-server";
import {
  guardedAction,
  invalidRequest,
  type ActionResult,
} from "@/lib/action-guard";
import { apiPath } from "@/lib/api-endpoint";
import { isUuid } from "@/lib/uuid";
import { revalidateDashboard } from "@/lib/revalidate";
import {
  SUPPORT_CONTEXT_MAX_BYTES,
  SUPPORT_RATING_COMMENT_MAX,
  validateSupportMessage,
  validateTicketDraft,
} from "@/lib/support";
import type {
  SupportMessage,
  SupportTicket,
  SupportTicketDetail,
  TicketCategory,
} from "@/types/operations";

/** The list and the request's own page (its status, the thread). */
function revalidateSupport() {
  revalidateDashboard("/support", "layout");
}

/** A plain object of at most the API's size, or nothing. */
function sanitizeContext(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  try {
    const json = JSON.stringify(value);
    return new TextEncoder().encode(json).length <= SUPPORT_CONTEXT_MAX_BYTES
      ? (value as Record<string, unknown>)
      : undefined;
  } catch {
    return undefined;
  }
}

export async function createSupportTicket(input: {
  subject: string;
  category: TicketCategory;
  body: string;
  context?: Record<string, unknown>;
}): Promise<ActionResult<SupportTicketDetail>> {
  if (
    !input ||
    typeof input.subject !== "string" ||
    typeof input.body !== "string"
  ) {
    return invalidRequest();
  }
  // The form checks the same before sending: failing here means the
  // request didn't come from it.
  const errors = validateTicketDraft(input);
  if (Object.keys(errors).length > 0) return invalidRequest();

  return guardedAction(
    () =>
      fetchServerApi<SupportTicketDetail>("/support/tickets", {
        method: "POST",
        body: JSON.stringify({
          subject: input.subject.trim(),
          category: input.category,
          body: input.body.trim(),
          context: sanitizeContext(input.context),
        }),
      }),
    revalidateSupport,
  );
}

export async function replyToSupportTicket(
  id: string,
  body: string,
): Promise<ActionResult<SupportMessage>> {
  if (!isUuid(id) || typeof body !== "string" || validateSupportMessage(body)) {
    return invalidRequest();
  }

  return guardedAction(
    () =>
      fetchServerApi<SupportMessage>(apiPath`/support/tickets/${id}/messages`, {
        method: "POST",
        body: JSON.stringify({ body: body.trim() }),
      }),
    revalidateSupport,
  );
}

export async function closeSupportTicket(
  id: string,
): Promise<ActionResult<SupportTicket>> {
  if (!isUuid(id)) return invalidRequest();

  return guardedAction(
    () =>
      fetchServerApi<SupportTicket>(apiPath`/support/tickets/${id}/close`, {
        method: "POST",
      }),
    revalidateSupport,
  );
}

export async function rateSupportTicket(
  id: string,
  rating: number,
  comment?: string,
): Promise<ActionResult<SupportTicket>> {
  const trimmed = typeof comment === "string" ? comment.trim() : "";
  if (
    !isUuid(id) ||
    !Number.isInteger(rating) ||
    rating < 1 ||
    rating > 5 ||
    trimmed.length > SUPPORT_RATING_COMMENT_MAX
  ) {
    return invalidRequest();
  }

  return guardedAction(
    () =>
      fetchServerApi<SupportTicket>(apiPath`/support/tickets/${id}/rating`, {
        method: "POST",
        body: JSON.stringify({ rating, comment: trimmed || undefined }),
      }),
    revalidateSupport,
  );
}
