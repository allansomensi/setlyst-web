"use server";

import {
  guardedAction,
  invalidRequest,
  requireStaff,
} from "@/lib/action-guard";
import { fetchServerApi } from "@/lib/api-server";
import { revalidateDashboard } from "@/lib/revalidate";
import { isUuid } from "@/lib/uuid";
import type { OutboxEmail } from "@/types/operations";

/**
 * The e-mail console. Every staff member can send themselves a test
 * message; retrying and canceling queued e-mails is admin-only.
 */

const enc = encodeURIComponent;

function revalidateEmails() {
  revalidateDashboard("/admin/emails");
}

export async function retryEmail(id: string) {
  if (!isUuid(id)) return invalidRequest<OutboxEmail>();
  return guardedAction(async () => {
    await requireStaff(true);
    return fetchServerApi<OutboxEmail>(`/admin/emails/${enc(id)}/retry`, {
      method: "POST",
    });
  }, revalidateEmails);
}

export async function cancelEmail(id: string) {
  if (!isUuid(id)) return invalidRequest<OutboxEmail>();
  return guardedAction(async () => {
    await requireStaff(true);
    return fetchServerApi<OutboxEmail>(`/admin/emails/${enc(id)}/cancel`, {
      method: "POST",
    });
  }, revalidateEmails);
}

/** Queues a test message to the caller's own (verified) address. */
export async function sendTestEmail() {
  return guardedAction(async () => {
    await requireStaff();
    return fetchServerApi<{ id: string; to: string }>("/admin/emails/test", {
      method: "POST",
    });
  }, revalidateEmails);
}
