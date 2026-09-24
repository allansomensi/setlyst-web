"use server";

import { fetchServerApi } from "@/lib/api-server";
import {
  guardedAction,
  invalidRequest,
  ActionResult,
} from "@/lib/action-guard";
import { apiPath } from "@/lib/api-endpoint";
import { isUuid } from "@/lib/uuid";
import { revalidateDashboard } from "@/lib/revalidate";
import { getTranslations } from "next-intl/server";
import { Gig, GigStatus } from "@/types/api";

/** Gig lists and pages, and the home page's "next gigs". */
function revalidateGigViews(bandId?: string | null) {
  revalidateDashboard("/gigs", "layout");
  revalidateDashboard("/tours", "layout");
  revalidateDashboard("");
  if (bandId) revalidateDashboard("/bands/[id]", "layout");
}

/**
 * `<input type="datetime-local">` yields "YYYY-MM-DDTHH:MM" (no seconds).
 * The API's `NaiveDateTime` deserializer expects seconds, so pad it here
 * rather than relying on every caller to remember to.
 */
/** An optional id: absent, empty, or a UUID. */
function isOptionalId(value: unknown): boolean {
  return value === undefined || value === null || value === "" || isUuid(value);
}

function normalizeScheduledAt(value: string): string {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value) ? `${value}:00` : value;
}

export async function createGig(data: {
  venue: string;
  location?: string;
  scheduled_at: string;
  band_id?: string;
  setlist_id?: string;
  tour_id?: string;
  status?: GigStatus;
  notes?: string;
}) {
  if (
    !data ||
    !isOptionalId(data.band_id) ||
    !isOptionalId(data.setlist_id) ||
    !isOptionalId(data.tour_id)
  ) {
    return invalidRequest();
  }
  const t = await getTranslations("gigs.errors");
  const venue = data.venue?.trim();

  if (!venue || venue.length < 1 || venue.length > 255) {
    return { success: false, error: t("venueLength") };
  }

  if (!data.scheduled_at) {
    return { success: false, error: t("scheduledAtRequired") };
  }

  const notes = data.notes?.trim() || undefined;
  const location = data.location?.trim() || undefined;

  return guardedAction(
    () =>
      fetchServerApi<Gig>("/gigs", {
        method: "POST",
        body: JSON.stringify({
          venue,
          location,
          scheduled_at: normalizeScheduledAt(data.scheduled_at),
          band_id: data.band_id || undefined,
          setlist_id: data.setlist_id || undefined,
          tour_id: data.tour_id || undefined,
          status: data.status,
          notes,
        }),
      }),
    () => revalidateGigViews(data.band_id),
  );
}

/**
 * Gig fields an update may change. For `location`, `setlist_id`, `notes`
 * and `tour_id`, `null` (or an empty string) clears the value; leaving a
 * field out keeps it unchanged.
 */
export interface UpdateGigInput {
  venue?: string;
  location?: string | null;
  scheduled_at?: string;
  setlist_id?: string | null;
  tour_id?: string | null;
  status?: GigStatus;
  notes?: string | null;
}

export async function updateGig(
  id: string,
  data: UpdateGigInput,
  bandId?: string,
) {
  if (
    !isUuid(id) ||
    !data ||
    !isOptionalId(data.setlist_id) ||
    !isOptionalId(data.tour_id)
  ) {
    return invalidRequest();
  }
  const t = await getTranslations("gigs.errors");

  const payload: UpdateGigInput = {};

  if (data.venue !== undefined) {
    const venue = data.venue.trim();
    if (!venue || venue.length > 255) {
      return { success: false, error: t("venueLength") };
    }
    payload.venue = venue;
  }

  if (data.scheduled_at) {
    payload.scheduled_at = normalizeScheduledAt(data.scheduled_at);
  }

  if (data.status !== undefined) {
    payload.status = data.status;
  }

  // Clearable fields: an empty value is sent as an explicit null, which
  // the API reads as "remove it" (absent would mean "leave as is").
  if (data.location !== undefined) {
    payload.location = data.location?.trim() || null;
  }
  if (data.notes !== undefined) {
    payload.notes = data.notes?.trim() || null;
  }
  if (data.setlist_id !== undefined) {
    payload.setlist_id = data.setlist_id || null;
  }
  if (data.tour_id !== undefined) {
    payload.tour_id = data.tour_id || null;
  }

  return guardedAction(
    () =>
      fetchServerApi(apiPath`/gigs/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
    () => revalidateGigViews(bandId),
  );
}

/** Moves the gig to the trash. */
export async function deleteGig(id: string, bandId?: string) {
  if (!isUuid(id)) return invalidRequest();

  return guardedAction(
    () => fetchServerApi(apiPath`/gigs/${id}`, { method: "DELETE" }),
    () => revalidateGigViews(bandId),
  );
}

export async function enableGigSharing(id: string): Promise<ActionResult<Gig>> {
  if (!isUuid(id)) return invalidRequest();

  return guardedAction(
    () => fetchServerApi<Gig>(apiPath`/gigs/${id}/share`, { method: "POST" }),
    () => revalidateDashboard("/gigs/[id]"),
  );
}

export async function disableGigSharing(
  id: string,
): Promise<ActionResult<void>> {
  if (!isUuid(id)) return invalidRequest();

  return guardedAction(
    () => fetchServerApi(apiPath`/gigs/${id}/share`, { method: "DELETE" }),
    () => revalidateDashboard("/gigs/[id]"),
  );
}
