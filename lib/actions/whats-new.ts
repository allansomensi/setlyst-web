"use server";

import { fetchPublicApi } from "@/lib/public-api";
import { latestReleaseId } from "@/lib/release-note-editor";
import type { ReleaseNote } from "@/types/public";

/**
 * The id of the newest published release note, which the "What's new"
 * dot compares with `ui_settings.whatsNew.lastSeen`. Cached for a minute
 * (every dashboard page asks); `null` when there is none or the API can't
 * be reached (no dot is shown then).
 */
export async function getLatestReleaseId(): Promise<string | null> {
  const result = await fetchPublicApi<ReleaseNote[]>("/public/release-notes", {
    revalidate: 60,
  });
  return result.ok && Array.isArray(result.data)
    ? latestReleaseId(result.data)
    : null;
}
