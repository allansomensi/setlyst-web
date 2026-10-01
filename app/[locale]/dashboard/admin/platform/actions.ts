"use server";

import { guardedAction, requireStaff } from "@/lib/action-guard";
import { fetchServerApi } from "@/lib/api-server";
import { revalidateDashboard } from "@/lib/revalidate";
import type { PlatformSettings } from "@/types/operations";

/**
 * The platform switches (admin): maintenance mode, sign-ups and blocked
 * e-mail domains. The API normalizes the domains and sets `started_at`
 * itself; the saved settings come back for the form to show.
 */
export async function savePlatformSettings(settings: PlatformSettings) {
  return guardedAction(
    async () => {
      await requireStaff(true);
      return fetchServerApi<PlatformSettings>("/admin/settings/platform", {
        method: "PUT",
        body: JSON.stringify(settings),
      });
    },
    // The console overview shows the maintenance mode and the sign-up
    // switch too.
    () => revalidateDashboard("/admin", "layout"),
  );
}
