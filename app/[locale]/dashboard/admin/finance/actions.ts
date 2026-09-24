"use server";

import { guardedAction, requireStaff } from "@/lib/action-guard";
import { fetchServerApi } from "@/lib/api-server";
import { revalidateDashboard } from "@/lib/revalidate";
import type { FinanceSyncResult } from "@/types/finance";

/**
 * One step of copying paid invoices and refunds from Stripe into the API's
 * payment ledger (admin only). Each call does a few seconds of work; while
 * the result isn't `done`, call again with its `cursor`.
 */
export async function syncFinance(cursor: string | null) {
  return guardedAction(
    async () => {
      await requireStaff(true);
      return fetchServerApi<FinanceSyncResult>("/admin/finance/sync", {
        method: "POST",
        body: JSON.stringify({ cursor }),
        timeoutMs: 30_000,
      });
    },
    () => revalidateDashboard("/admin/finance"),
  );
}
