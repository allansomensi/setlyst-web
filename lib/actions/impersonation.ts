"use server";

import { fetchServerApi } from "@/lib/api-server";
import { guardedAction } from "@/lib/action-guard";
import type { ImpersonationResponse } from "@/types/api";

/**
 * Asks the API for a read-only token to view the platform as `userId`.
 * The API enforces who may impersonate whom (staff, strictly outranking
 * the target) and records it in the audit log; the caller then hands the
 * token to the session (`useSession().update`), where lib/auth.ts
 * verifies it belongs to this staff member before switching.
 */
export async function requestImpersonation(userId: string) {
  return guardedAction(() =>
    fetchServerApi<ImpersonationResponse>(
      `/users/${encodeURIComponent(userId)}/impersonate`,
      { method: "POST", body: "{}" },
    ),
  );
}
