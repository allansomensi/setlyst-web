"use server";

import { updateTag } from "next/cache";
import {
  guardedAction,
  invalidRequest,
  requireStaff,
} from "@/lib/action-guard";
import { fetchServerApi } from "@/lib/api-server";
import { PUBLIC_INCIDENTS_TAG } from "@/lib/maintenance";
import type {
  CreateIncidentPayload,
  PostIncidentUpdatePayload,
  UpdateIncidentPayload,
} from "@/lib/platform-admin";
import { revalidateDashboard } from "@/lib/revalidate";
import { isUuid } from "@/lib/uuid";
import type { Incident } from "@/types/operations";

/**
 * Status incidents and scheduled maintenance. Every staff member
 * publishes and updates them (they go to the public status page at once);
 * deleting one published by mistake is admin-only.
 */

const enc = encodeURIComponent;

function revalidateIncidents() {
  // The status page shows them too (cached for 30 s otherwise).
  updateTag(PUBLIC_INCIDENTS_TAG);
  revalidateDashboard("/admin/incidents", "layout");
}

export async function createIncident(payload: CreateIncidentPayload) {
  return guardedAction(async () => {
    await requireStaff();
    return fetchServerApi<Incident>("/admin/incidents", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }, revalidateIncidents);
}

export async function updateIncident(
  id: string,
  payload: UpdateIncidentPayload,
) {
  if (!isUuid(id)) return invalidRequest<Incident>();
  return guardedAction(async () => {
    await requireStaff();
    return fetchServerApi<Incident>(`/admin/incidents/${enc(id)}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  }, revalidateIncidents);
}

export async function postIncidentUpdate(
  id: string,
  payload: PostIncidentUpdatePayload,
) {
  if (!isUuid(id)) return invalidRequest<Incident>();
  return guardedAction(async () => {
    await requireStaff();
    return fetchServerApi<Incident>(`/admin/incidents/${enc(id)}/updates`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }, revalidateIncidents);
}

export async function deleteIncident(id: string) {
  if (!isUuid(id)) return invalidRequest();
  return guardedAction(async () => {
    await requireStaff(true);
    await fetchServerApi<unknown>(`/admin/incidents/${enc(id)}`, {
      method: "DELETE",
    });
  }, revalidateIncidents);
}
