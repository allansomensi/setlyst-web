"use server";

import { guardedAction, requireStaff } from "@/lib/action-guard";
import { fetchServerApi } from "@/lib/api-server";
import { revalidateDashboard } from "@/lib/revalidate";
import type { ReleaseNotePayload } from "@/types/communication";
import type { ReleaseNote } from "@/types/public";
import { isUuid } from "@/lib/uuid";

/** Release notes ("Novidades") editing: admin only (moderators read). */

function path(id: string, suffix = "") {
  if (!isUuid(id)) throw new Error("Invalid release note id");
  return `/admin/release-notes/${encodeURIComponent(id)}${suffix}`;
}

function revalidateNotes() {
  revalidateDashboard("/admin/release-notes", "layout");
  revalidateDashboard("/whats-new");
}

export async function createReleaseNote(payload: ReleaseNotePayload) {
  return guardedAction(async () => {
    await requireStaff(true);
    return fetchServerApi<ReleaseNote>("/admin/release-notes", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }, revalidateNotes);
}

export async function updateReleaseNote(
  id: string,
  payload: ReleaseNotePayload,
) {
  return guardedAction(async () => {
    await requireStaff(true);
    return fetchServerApi<ReleaseNote>(path(id), {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  }, revalidateNotes);
}

export async function publishReleaseNote(id: string, notify: boolean) {
  return guardedAction(async () => {
    await requireStaff(true);
    return fetchServerApi<ReleaseNote>(path(id, "/publish"), {
      method: "POST",
      body: JSON.stringify({ notify }),
      timeoutMs: 60_000,
    });
  }, revalidateNotes);
}

export async function unpublishReleaseNote(id: string) {
  return guardedAction(async () => {
    await requireStaff(true);
    return fetchServerApi<ReleaseNote>(path(id, "/unpublish"), {
      method: "POST",
    });
  }, revalidateNotes);
}

export async function deleteReleaseNote(id: string) {
  return guardedAction(async () => {
    await requireStaff(true);
    await fetchServerApi<unknown>(path(id), { method: "DELETE" });
  }, revalidateNotes);
}
