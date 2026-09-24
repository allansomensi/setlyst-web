"use server";

import { fetchServerApi } from "@/lib/api-server";
import { isStaffRole } from "@/lib/staff-permissions";
import type { ModerationSummary } from "@/types/staff";
import { getSession } from "@/lib/server/session";

/**
 * Open moderation flags, for the badge next to "Pontos de atenção" in the
 * staff navigation. `null` for non-staff sessions or when the API can't
 * be reached (the badge is simply not shown).
 */
export async function getModerationOpenCount(): Promise<number | null> {
  const session = await getSession();
  if (!session || !isStaffRole(session.user.role)) return null;
  try {
    const summary = await fetchServerApi<ModerationSummary>(
      "/admin/moderation/summary",
    );
    return summary.open_total;
  } catch {
    return null;
  }
}
