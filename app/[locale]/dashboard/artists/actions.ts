"use server";

import { fetchServerApi } from "@/lib/api-server";
import { guardedAction, invalidRequest } from "@/lib/action-guard";
import { apiPath } from "@/lib/api-endpoint";
import { isUuid } from "@/lib/uuid";
import { revalidateDashboard } from "@/lib/revalidate";
import { getTranslations } from "next-intl/server";

export async function createArtist(data: { name: string }) {
  const t = await getTranslations("artists.errors");
  const name = data.name?.trim();

  if (!name || name.length < 1 || name.length > 255) {
    return {
      success: false,
      error: t("nameLength"),
    };
  }

  return guardedAction(
    () =>
      fetchServerApi("/artists", {
        method: "POST",
        body: JSON.stringify({ name }),
      }),
    () => revalidateDashboard("/artists"),
  );
}

export async function updateArtist(id: string, data: { name: string }) {
  if (!isUuid(id)) return invalidRequest();
  const t = await getTranslations("artists.errors");

  const name = data.name?.trim();
  if (!name || name.length < 1 || name.length > 255) {
    return {
      success: false,
      error: t("nameLength"),
    };
  }

  return guardedAction(
    () =>
      fetchServerApi(apiPath`/artists/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ name }),
      }),
    // The artist name shows next to every one of its songs.
    () => revalidateDashboard("", "layout"),
  );
}

export async function deleteArtist(id: string) {
  if (!isUuid(id)) return invalidRequest();

  return guardedAction(
    () => fetchServerApi(apiPath`/artists/${id}`, { method: "DELETE" }),
    // Deleting an artist takes its songs with it.
    () => revalidateDashboard("", "layout"),
  );
}
