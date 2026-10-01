"use server";

import { isUuid } from "@/lib/uuid";
import {
  guardedAction,
  invalidRequest,
  requireStaff,
} from "@/lib/action-guard";
import { fetchServerApi } from "@/lib/api-server";
import { revalidateDashboard } from "@/lib/revalidate";
import {
  SUPPORT_MESSAGE_MAX,
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  type AdminSupportTicketDetail,
  type TicketStatus,
  type UpdateTicketPayload,
} from "@/types/operations";

const enc = encodeURIComponent;

function revalidateSupport() {
  revalidateDashboard("/admin/support");
  revalidateDashboard("/admin/support/[id]");
}

function isOneOf(list: readonly string[], value: unknown): boolean {
  return typeof value === "string" && list.includes(value);
}

/**
 * Changes a ticket's status, priority, category or assignee. Only the
 * fields present are sent; `assignee_id: null` unassigns (the API checks
 * the new assignee is on the staff).
 */
export async function updateTicket(id: string, payload: UpdateTicketPayload) {
  if (!isUuid(id)) return invalidRequest<AdminSupportTicketDetail>();
  const body: UpdateTicketPayload = {};
  if (payload.status !== undefined) {
    if (!isOneOf(TICKET_STATUSES, payload.status)) return invalidRequest();
    body.status = payload.status;
  }
  if (payload.priority !== undefined) {
    if (!isOneOf(TICKET_PRIORITIES, payload.priority)) return invalidRequest();
    body.priority = payload.priority;
  }
  if (payload.category !== undefined) {
    if (!isOneOf(TICKET_CATEGORIES, payload.category)) return invalidRequest();
    body.category = payload.category;
  }
  if (payload.assignee_id !== undefined) {
    if (payload.assignee_id !== null && !isUuid(payload.assignee_id)) {
      return invalidRequest();
    }
    body.assignee_id = payload.assignee_id;
  }
  if (Object.keys(body).length === 0) return invalidRequest();

  return guardedAction(async () => {
    await requireStaff();
    return fetchServerApi<AdminSupportTicketDetail>(
      `/admin/support/tickets/${enc(id)}`,
      { method: "PATCH", body: JSON.stringify(body) },
    );
  }, revalidateSupport);
}

/**
 * Answers the requester (`internal: false`) or leaves a note only staff
 * see. `status` is the ticket's status afterwards; left out, a reply
 * makes it `pending` and a note leaves it as it is (the API's defaults).
 */
export async function replyToTicket(
  id: string,
  input: { body: string; internal: boolean; status?: TicketStatus | null },
) {
  if (!isUuid(id)) return invalidRequest<AdminSupportTicketDetail>();
  const body = typeof input.body === "string" ? input.body.trim() : "";
  if (!body || body.length > SUPPORT_MESSAGE_MAX) return invalidRequest();
  if (input.status != null && !isOneOf(TICKET_STATUSES, input.status)) {
    return invalidRequest();
  }

  return guardedAction(async () => {
    await requireStaff();
    return fetchServerApi<AdminSupportTicketDetail>(
      `/admin/support/tickets/${enc(id)}/messages`,
      {
        method: "POST",
        body: JSON.stringify({
          body,
          internal: input.internal === true,
          ...(input.status ? { status: input.status } : {}),
        }),
      },
    );
  }, revalidateSupport);
}
