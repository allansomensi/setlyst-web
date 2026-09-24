"use server";

import { fetchServerApi } from "@/lib/api-server";
import { apiPath } from "@/lib/api-endpoint";
import {
  guardedAction,
  invalidRequest,
  ActionResult,
} from "@/lib/action-guard";
import { isUuid } from "@/lib/uuid";
import { revalidateDashboard } from "@/lib/revalidate";
import { getTranslations } from "next-intl/server";
import {
  Band,
  BandRole,
  BandRolePermission,
  BandRolePermissionEntry,
} from "@/types/api";

export async function createBand(data: {
  name: string;
  description?: string;
}): Promise<ActionResult<void>> {
  const t = await getTranslations("bands.errors");
  const name = data.name?.trim();

  if (!name || name.length < 2 || name.length > 60) {
    return { success: false, error: t("nameLength") };
  }

  const description = data.description?.trim() || undefined;

  return guardedAction(
    () =>
      fetchServerApi("/bands", {
        method: "POST",
        body: JSON.stringify({ name, description }),
      }),
    () => revalidateDashboard("/bands"),
  );
}

export async function updateBand(
  id: string,
  data: {
    name?: string;
    description?: string;
    logo_url?: string | null;
  },
): Promise<ActionResult<void>> {
  if (!isUuid(id)) return invalidRequest();
  const t = await getTranslations("bands.errors");

  const payload: typeof data = {};

  if (data.name !== undefined) {
    const name = data.name.trim();
    if (!name || name.length > 60) {
      return { success: false, error: t("nameLength") };
    }
    payload.name = name;
  }

  if (data.description !== undefined) {
    payload.description = data.description.trim() || undefined;
  }

  if (data.logo_url !== undefined) {
    payload.logo_url = data.logo_url ? data.logo_url.trim() || null : null;
  }

  return guardedAction(
    () =>
      fetchServerApi(apiPath`/bands/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
    () => {
      revalidateDashboard("/bands");
      revalidateDashboard("/bands/[id]", "layout");
    },
  );
}

export async function deleteBand(id: string): Promise<ActionResult<void>> {
  if (!isUuid(id)) return invalidRequest();

  return guardedAction(
    () => fetchServerApi(apiPath`/bands/${id}`, { method: "DELETE" }),
    () => revalidateDashboard("/bands"),
  );
}

export async function transferBandOwnership(
  id: string,
  newOwnerId: string,
): Promise<ActionResult<void>> {
  if (!isUuid(id) || !isUuid(newOwnerId)) return invalidRequest();

  return guardedAction(
    () =>
      fetchServerApi(apiPath`/bands/${id}/transfer-ownership`, {
        method: "POST",
        body: JSON.stringify({ new_owner_id: newOwnerId }),
      }),
    () => revalidateDashboard("/bands/[id]", "layout"),
  );
}

export async function updateBandMemberRole(
  bandId: string,
  userId: string,
  role: BandRole,
): Promise<ActionResult<void>> {
  if (!isUuid(bandId) || !isUuid(userId)) return invalidRequest();

  return guardedAction(
    () =>
      fetchServerApi(apiPath`/bands/${bandId}/members/${userId}`, {
        method: "PATCH",
        body: JSON.stringify({ role }),
      }),
    () => revalidateDashboard("/bands/[id]", "layout"),
  );
}

export async function updateBandMemberTitle(
  bandId: string,
  userId: string,
  title: string | null,
): Promise<ActionResult<void>> {
  if (!isUuid(bandId) || !isUuid(userId)) return invalidRequest();

  return guardedAction(
    () =>
      fetchServerApi(apiPath`/bands/${bandId}/members/${userId}/title`, {
        method: "PATCH",
        body: JSON.stringify({ title }),
      }),
    () => revalidateDashboard("/bands/[id]", "layout"),
  );
}

export async function removeBandMember(
  bandId: string,
  userId: string,
): Promise<ActionResult<void>> {
  if (!isUuid(bandId) || !isUuid(userId)) return invalidRequest();

  return guardedAction(
    () =>
      fetchServerApi(apiPath`/bands/${bandId}/members/${userId}`, {
        method: "DELETE",
      }),
    () => {
      revalidateDashboard("/bands/[id]", "layout");
      revalidateDashboard("/bands");
    },
  );
}

export async function leaveBand(
  bandId: string,
  userId: string,
): Promise<ActionResult<void>> {
  return removeBandMember(bandId, userId);
}

export async function createBandInvite(
  bandId: string,
  data: { role?: BandRole; max_uses?: number; expires_in_hours?: number },
): Promise<ActionResult<void>> {
  if (!isUuid(bandId)) return invalidRequest();

  return guardedAction(
    () =>
      fetchServerApi(apiPath`/bands/${bandId}/invites`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    () => revalidateDashboard("/bands/[id]", "layout"),
  );
}

export async function revokeBandInvite(
  bandId: string,
  inviteId: string,
): Promise<ActionResult<void>> {
  if (!isUuid(bandId) || !isUuid(inviteId)) return invalidRequest();

  return guardedAction(
    () =>
      fetchServerApi(apiPath`/bands/${bandId}/invites/${inviteId}`, {
        method: "DELETE",
      }),
    () => revalidateDashboard("/bands/[id]", "layout"),
  );
}

export async function acceptBandInvite(
  code: string,
): Promise<ActionResult<Band>> {
  const t = await getTranslations("bands.errors");

  if (!code) return { success: false, error: t("invalidInviteCode") };

  return guardedAction(
    // Encoded: an invite code arrives from a link someone else sent.
    () =>
      fetchServerApi<Band>(apiPath`/invites/${code}/accept`, {
        method: "POST",
      }),
    () => revalidateDashboard("/bands"),
  );
}

export async function getBandRolePermissions(
  bandId: string,
): Promise<ActionResult<BandRolePermission[]>> {
  if (!isUuid(bandId)) return invalidRequest();

  return guardedAction(() =>
    fetchServerApi<BandRolePermission[]>(apiPath`/bands/${bandId}/permissions`),
  );
}

export async function updateBandRolePermissions(
  bandId: string,
  permissions: BandRolePermissionEntry[],
): Promise<ActionResult<void>> {
  if (!isUuid(bandId)) return invalidRequest();

  return guardedAction(
    () =>
      fetchServerApi(apiPath`/bands/${bandId}/permissions`, {
        method: "PUT",
        body: JSON.stringify({ permissions }),
      }),
    () => revalidateDashboard("/bands/[id]", "layout"),
  );
}

export async function favoriteBand(id: string): Promise<ActionResult<void>> {
  if (!isUuid(id)) return invalidRequest();

  return guardedAction(
    () => fetchServerApi(apiPath`/bands/${id}/favorite`, { method: "POST" }),
    () => {
      revalidateDashboard("/bands");
      revalidateDashboard("");
    },
  );
}

export async function unfavoriteBand(id: string): Promise<ActionResult<void>> {
  if (!isUuid(id)) return invalidRequest();

  return guardedAction(
    () => fetchServerApi(apiPath`/bands/${id}/favorite`, { method: "DELETE" }),
    () => {
      revalidateDashboard("/bands");
      revalidateDashboard("");
    },
  );
}
