"use server";

import { guardedAction } from "@/lib/action-guard";
import { fetchServerApi } from "@/lib/api-server";
import { revalidateDashboard } from "@/lib/revalidate";
import type {
  ActiveAnnouncements,
  AnnouncementReceipt,
} from "@/types/communication";
import { isUuid } from "@/lib/uuid";

/**
 * The caller's announcements: what to show right now (modals and
 * banners) and the receipts (seen, dismissed, acknowledged).
 */

function assertId(id: string) {
  if (!isUuid(id)) throw new Error("Invalid announcement id");
}

export async function getActiveAnnouncements() {
  return guardedAction(() =>
    fetchServerApi<ActiveAnnouncements>("/announcements/active"),
  );
}

async function receipt(id: string, step: "seen" | "dismiss" | "acknowledge") {
  assertId(id);
  return fetchServerApi<AnnouncementReceipt>(
    `/announcements/${encodeURIComponent(id)}/${step}`,
    { method: "POST" },
  );
}

export async function markAnnouncementSeen(id: string) {
  return guardedAction(() => receipt(id, "seen"));
}

export async function dismissAnnouncement(id: string) {
  return guardedAction(
    () => receipt(id, "dismiss"),
    () => revalidateDashboard("/announcements"),
  );
}

export async function acknowledgeAnnouncement(id: string) {
  return guardedAction(
    () => receipt(id, "acknowledge"),
    () => revalidateDashboard("/announcements"),
  );
}
