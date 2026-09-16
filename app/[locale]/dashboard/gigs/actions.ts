"use server";

import { fetchServerApi } from "@/lib/api-server";
import { guardedAction, ActionResult } from "@/lib/action-guard";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { Gig, GigStatus } from "@/types/api";

/**
 * `<input type="datetime-local">` yields "YYYY-MM-DDTHH:MM" (no seconds).
 * The API's `NaiveDateTime` deserializer expects seconds, so pad it here
 * rather than relying on every caller to remember to.
 */
function normalizeScheduledAt(value: string): string {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value) ? `${value}:00` : value;
}

export async function createGig(data: {
  venue: string;
  scheduled_at: string;
  band_id?: string;
  setlist_id?: string;
  status?: GigStatus;
  notes?: string;
}) {
  const t = await getTranslations("gigs.errors");
  const venue = data.venue?.trim();

  if (!venue || venue.length < 1 || venue.length > 255) {
    return { success: false, error: t("venueLength") };
  }

  if (!data.scheduled_at) {
    return { success: false, error: t("scheduledAtRequired") };
  }

  const notes = data.notes?.trim() || undefined;

  return guardedAction(
    () =>
      fetchServerApi<Gig>("/gigs", {
        method: "POST",
        body: JSON.stringify({
          venue,
          scheduled_at: normalizeScheduledAt(data.scheduled_at),
          band_id: data.band_id || undefined,
          setlist_id: data.setlist_id || undefined,
          status: data.status,
          notes,
        }),
      }),
    () => {
      revalidatePath("/dashboard/gigs");
      if (data.band_id) revalidatePath(`/dashboard/bands/${data.band_id}/gigs`);
    },
  );
}

export async function updateGig(
  id: string,
  data: {
    venue?: string;
    scheduled_at?: string;
    setlist_id?: string;
    status?: GigStatus;
    notes?: string;
  },
  bandId?: string,
) {
  const t = await getTranslations("gigs.errors");

  if (!id) return { success: false, error: t("invalidId") };

  const payload: {
    venue?: string;
    scheduled_at?: string;
    setlist_id?: string;
    status?: GigStatus;
    notes?: string;
  } = {};

  if (data.venue !== undefined) {
    const venue = data.venue.trim();
    if (!venue || venue.length > 255) {
      return { success: false, error: t("venueLength") };
    }
    payload.venue = venue;
  }

  if (data.scheduled_at !== undefined && data.scheduled_at) {
    payload.scheduled_at = normalizeScheduledAt(data.scheduled_at);
  }

  if (data.setlist_id !== undefined) {
    payload.setlist_id = data.setlist_id;
  }

  if (data.status !== undefined) {
    payload.status = data.status;
  }

  if (data.notes !== undefined) {
    payload.notes = data.notes.trim() || undefined;
  }

  return guardedAction(
    () =>
      fetchServerApi(`/gigs/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
    () => {
      revalidatePath("/dashboard/gigs");
      revalidatePath(`/dashboard/gigs/${id}`);
      if (bandId) revalidatePath(`/dashboard/bands/${bandId}/gigs`);
    },
  );
}

export async function deleteGig(id: string, bandId?: string) {
  const t = await getTranslations("gigs.errors");

  if (!id) return { success: false, error: t("invalidId") };

  return guardedAction(
    () => fetchServerApi(`/gigs/${id}`, { method: "DELETE" }),
    () => {
      revalidatePath("/dashboard/gigs");
      if (bandId) revalidatePath(`/dashboard/bands/${bandId}/gigs`);
    },
  );
}

export async function enableGigSharing(id: string): Promise<ActionResult<Gig>> {
  const t = await getTranslations("gigs.errors");

  if (!id) return { success: false, error: t("invalidId") };

  return guardedAction(
    () => fetchServerApi<Gig>(`/gigs/${id}/share`, { method: "POST" }),
    () => revalidatePath(`/dashboard/gigs/${id}`),
  );
}

export async function disableGigSharing(
  id: string,
): Promise<ActionResult<void>> {
  const t = await getTranslations("gigs.errors");

  if (!id) return { success: false, error: t("invalidId") };

  return guardedAction(
    () => fetchServerApi(`/gigs/${id}/share`, { method: "DELETE" }),
    () => revalidatePath(`/dashboard/gigs/${id}`),
  );
}
