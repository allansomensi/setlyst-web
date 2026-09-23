"use server";

import { fetchServerApi } from "@/lib/api-server";
import { guardedAction } from "@/lib/action-guard";
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
  const t = await getTranslations("artists.errors");

  if (!id) {
    return { success: false, error: t("invalidId") };
  }

  const name = data.name?.trim();
  if (!name || name.length < 1 || name.length > 255) {
    return {
      success: false,
      error: t("nameLength"),
    };
  }

  return guardedAction(
    () =>
      fetchServerApi(`/artists/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ name }),
      }),
    // The artist name shows next to every one of its songs.
    () => revalidateDashboard("", "layout"),
  );
}

export async function deleteArtist(id: string) {
  const t = await getTranslations("artists.errors");

  if (!id) {
    return { success: false, error: t("invalidId") };
  }

  return guardedAction(
    () => fetchServerApi(`/artists/${id}`, { method: "DELETE" }),
    // Deleting an artist takes its songs with it.
    () => revalidateDashboard("", "layout"),
  );
}
