"use server";

import {
  guardedAction,
  requireStaff,
  invalidRequest,
} from "@/lib/action-guard";
import { fetchServerApi } from "@/lib/api-server";
import { revalidateDashboard } from "@/lib/revalidate";
import type {
  AdminAnnouncement,
  AnnouncementPatch,
  AnnouncementPayload,
  AudiencePayload,
} from "@/types/communication";
import { isUuid } from "@/lib/uuid";

/** Staff side of announcements (moderators and admins). */

function path(id: string, suffix = "") {
  if (!isUuid(id)) throw new Error("Invalid announcement id");
  return `/admin/announcements/${encodeURIComponent(id)}${suffix}`;
}

function revalidateAnnouncements() {
  revalidateDashboard("/admin/announcements", "layout");
  revalidateDashboard("/announcements");
}

export async function createAnnouncement(payload: AnnouncementPayload) {
  return guardedAction(async () => {
    await requireStaff();
    return fetchServerApi<AdminAnnouncement>("/admin/announcements", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }, revalidateAnnouncements);
}

export async function updateAnnouncement(id: string, patch: AnnouncementPatch) {
  if (!isUuid(id)) return invalidRequest();
  return guardedAction(async () => {
    await requireStaff();
    return fetchServerApi<AdminAnnouncement>(path(id), {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  }, revalidateAnnouncements);
}

export async function publishAnnouncement(id: string) {
  if (!isUuid(id)) return invalidRequest();
  return guardedAction(async () => {
    await requireStaff();
    return fetchServerApi<AdminAnnouncement>(path(id, "/publish"), {
      method: "POST",
      timeoutMs: 60_000,
    });
  }, revalidateAnnouncements);
}

export async function archiveAnnouncement(id: string) {
  if (!isUuid(id)) return invalidRequest();
  return guardedAction(async () => {
    await requireStaff();
    return fetchServerApi<AdminAnnouncement>(path(id, "/archive"), {
      method: "POST",
    });
  }, revalidateAnnouncements);
}

/** Deletes a draft (published ones are archived by the API instead). */
export async function deleteAnnouncement(id: string) {
  if (!isUuid(id)) return invalidRequest();
  return guardedAction(async () => {
    await requireStaff();
    await fetchServerApi<unknown>(path(id), { method: "DELETE" });
  }, revalidateAnnouncements);
}

export async function previewAudience(audience: AudiencePayload) {
  return guardedAction(async () => {
    await requireStaff();
    const result = await fetchServerApi<{ count: number }>(
      "/admin/announcements/preview-audience",
      { method: "POST", body: JSON.stringify(audience) },
    );
    return result.count;
  });
}
