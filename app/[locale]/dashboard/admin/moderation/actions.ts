"use server";

import { isUuid } from "@/lib/uuid";
import {
  guardedAction,
  requireStaff,
  invalidRequest,
} from "@/lib/action-guard";
import { fetchServerApi } from "@/lib/api-server";
import { revalidateDashboard } from "@/lib/revalidate";
import type { ModerationFlag, ResolveFlagPayload } from "@/types/staff";

const enc = encodeURIComponent;

function revalidateModeration() {
  revalidateDashboard("/admin/moderation");
  revalidateDashboard("/users/[id]");
}

export async function resolveFlag(id: string, payload: ResolveFlagPayload) {
  if (!isUuid(id)) return invalidRequest();
  return guardedAction(async () => {
    await requireStaff();
    const note = payload.note?.trim()
      ? payload.note.trim().slice(0, 500)
      : null;
    return fetchServerApi<ModerationFlag>(
      `/admin/moderation/flags/${enc(id)}/resolve`,
      {
        method: "POST",
        body: JSON.stringify({ ...payload, note }),
      },
    );
  }, revalidateModeration);
}

export async function rescanModeration() {
  return guardedAction(async () => {
    await requireStaff(true);
    // `images_in_background`: usernames are checked right away (and
    // counted in `flagged`); avatars and logos keep being reviewed by a
    // background job, whose flags reach the queue later.
    return fetchServerApi<{
      flagged: number;
      images_in_background?: boolean;
    }>("/admin/moderation/rescan", {
      method: "POST",
      timeoutMs: 120_000,
    });
  }, revalidateModeration);
}
