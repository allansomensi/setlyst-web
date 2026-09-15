"use server";

import { fetchServerApi } from "@/lib/api-server";
import { guardedAction, ActionResult } from "@/lib/action-guard";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { Band, BandRole } from "@/types/api";

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
    () => revalidatePath("/dashboard/bands"),
  );
}

export async function updateBand(
  id: string,
  data: {
    name?: string;
    description?: string;
    logo_url?: string | null;
    members_can_manage_setlists?: boolean;
  },
): Promise<ActionResult<void>> {
  const t = await getTranslations("bands.errors");

  if (!id) return { success: false, error: t("invalidId") };

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

  if (data.members_can_manage_setlists !== undefined) {
    payload.members_can_manage_setlists = data.members_can_manage_setlists;
  }

  return guardedAction(
    () =>
      fetchServerApi(`/bands/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
    () => {
      revalidatePath("/dashboard/bands");
      revalidatePath(`/dashboard/bands/${id}`);
    },
  );
}

export async function deleteBand(id: string): Promise<ActionResult<void>> {
  const t = await getTranslations("bands.errors");

  if (!id) return { success: false, error: t("invalidId") };

  return guardedAction(
    () => fetchServerApi(`/bands/${id}`, { method: "DELETE" }),
    () => revalidatePath("/dashboard/bands"),
  );
}

export async function transferBandOwnership(
  id: string,
  newOwnerId: string,
): Promise<ActionResult<void>> {
  const t = await getTranslations("bands.errors");

  if (!id || !newOwnerId) return { success: false, error: t("invalidId") };

  return guardedAction(
    () =>
      fetchServerApi(`/bands/${id}/transfer-ownership`, {
        method: "POST",
        body: JSON.stringify({ new_owner_id: newOwnerId }),
      }),
    () => revalidatePath(`/dashboard/bands/${id}`),
  );
}

export async function updateBandMemberRole(
  bandId: string,
  userId: string,
  role: BandRole,
): Promise<ActionResult<void>> {
  const t = await getTranslations("bands.errors");

  if (!bandId || !userId) return { success: false, error: t("invalidId") };

  return guardedAction(
    () =>
      fetchServerApi(`/bands/${bandId}/members/${userId}`, {
        method: "PATCH",
        body: JSON.stringify({ role }),
      }),
    () => revalidatePath(`/dashboard/bands/${bandId}`),
  );
}

export async function removeBandMember(
  bandId: string,
  userId: string,
): Promise<ActionResult<void>> {
  const t = await getTranslations("bands.errors");

  if (!bandId || !userId) return { success: false, error: t("invalidId") };

  return guardedAction(
    () =>
      fetchServerApi(`/bands/${bandId}/members/${userId}`, {
        method: "DELETE",
      }),
    () => {
      revalidatePath(`/dashboard/bands/${bandId}`);
      revalidatePath("/dashboard/bands");
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
  const t = await getTranslations("bands.errors");

  if (!bandId) return { success: false, error: t("invalidId") };

  return guardedAction(
    () =>
      fetchServerApi(`/bands/${bandId}/invites`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    () => revalidatePath(`/dashboard/bands/${bandId}`),
  );
}

export async function revokeBandInvite(
  bandId: string,
  inviteId: string,
): Promise<ActionResult<void>> {
  const t = await getTranslations("bands.errors");

  if (!bandId || !inviteId) return { success: false, error: t("invalidId") };

  return guardedAction(
    () =>
      fetchServerApi(`/bands/${bandId}/invites/${inviteId}`, {
        method: "DELETE",
      }),
    () => revalidatePath(`/dashboard/bands/${bandId}`),
  );
}

export async function acceptBandInvite(
  code: string,
): Promise<ActionResult<Band>> {
  const t = await getTranslations("bands.errors");

  if (!code) return { success: false, error: t("invalidInviteCode") };

  return guardedAction(
    () => fetchServerApi<Band>(`/invites/${code}/accept`, { method: "POST" }),
    () => revalidatePath("/dashboard/bands"),
  );
}
