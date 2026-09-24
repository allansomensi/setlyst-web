"use server";

import { getTranslations } from "next-intl/server";
import { fetchServerApi } from "@/lib/api-server";
import { apiPath } from "@/lib/api-endpoint";
import {
  guardedAction,
  invalidRequest,
  type ActionResult,
} from "@/lib/action-guard";
import { revalidateDashboard } from "@/lib/revalidate";
import { isUuid } from "@/lib/server/api-route";
import type {
  CreateTourPayload,
  Tour,
  UpdateTourPayload,
} from "@/types/content";

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Tour lists and pages, gig pages (tour names), band pages, the home page. */
function revalidateTourViews() {
  revalidateDashboard("/tours", "layout");
  revalidateDashboard("/gigs", "layout");
  revalidateDashboard("/bands/[id]", "layout");
  revalidateDashboard("");
}

async function checkFields(
  data: Partial<CreateTourPayload>,
): Promise<string | null> {
  const t = await getTranslations("tours.errors");
  if (data.name !== undefined) {
    const name = data.name.trim();
    if (!name || name.length > 120) return t("nameLength");
  }
  if (data.description != null && data.description.length > 2000) {
    return t("descriptionLength");
  }
  if (data.start_date !== undefined && !DATE.test(data.start_date)) {
    return t("dates");
  }
  if (data.end_date !== undefined && !DATE.test(data.end_date)) {
    return t("dates");
  }
  if (data.start_date && data.end_date && data.end_date < data.start_date) {
    return t("dates");
  }
  return null;
}

export async function createTour(
  data: CreateTourPayload,
): Promise<ActionResult<Tour>> {
  const problem = await checkFields(data);
  if (problem) return { success: false, error: problem };
  if (data.band_id && !isUuid(data.band_id)) {
    return { success: false, error: problem ?? "Invalid band." };
  }
  return guardedAction(
    () =>
      fetchServerApi<Tour>("/tours", {
        method: "POST",
        body: JSON.stringify({
          name: data.name.trim(),
          description: data.description?.trim() || null,
          start_date: data.start_date,
          end_date: data.end_date,
          band_id: data.band_id || null,
        }),
      }),
    revalidateTourViews,
  );
}

export async function updateTour(
  id: string,
  data: UpdateTourPayload,
): Promise<ActionResult<Tour>> {
  if (!isUuid(id)) return invalidRequest();
  const problem = await checkFields(data);
  if (problem) return { success: false, error: problem };
  const payload: UpdateTourPayload = {};
  if (data.name !== undefined) payload.name = data.name.trim();
  if (data.description !== undefined) {
    payload.description = data.description?.trim() || null;
  }
  if (data.start_date) payload.start_date = data.start_date;
  if (data.end_date) payload.end_date = data.end_date;
  return guardedAction(
    () =>
      fetchServerApi<Tour>(apiPath`/tours/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
    revalidateTourViews,
  );
}

/** Moves the tour to the trash (its gigs stay, without the tour). */
export async function deleteTour(id: string): Promise<ActionResult<void>> {
  if (!isUuid(id)) return invalidRequest();
  return guardedAction(
    () => fetchServerApi<void>(apiPath`/tours/${id}`, { method: "DELETE" }),
    revalidateTourViews,
  );
}
