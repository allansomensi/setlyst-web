"use server";

import { fetchServerApi } from "@/lib/api-server";
import { guardedAction } from "@/lib/action-guard";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

export async function createSetlist(data: {
  title: string;
  description?: string;
}) {
  const t = await getTranslations("setlists.errors");
  const title = data.title?.trim();

  if (!title || title.length < 1 || title.length > 255) {
    return {
      success: false,
      error: t("titleLength"),
    };
  }

  const description = data.description?.trim() || undefined;

  return guardedAction(
    () =>
      fetchServerApi("/setlists", {
        method: "POST",
        body: JSON.stringify({ title, description }),
      }),
    () => revalidatePath("/dashboard/setlists"),
  );
}

export async function updateSetlist(
  id: string,
  data: { title?: string; description?: string },
) {
  const t = await getTranslations("setlists.errors");

  if (!id) return { success: false, error: t("invalidId") };

  const payload: { title?: string; description?: string } = {};

  if (data.title !== undefined) {
    const title = data.title.trim();
    if (!title || title.length > 255) {
      return {
        success: false,
        error: t("titleLength"),
      };
    }
    payload.title = title;
  }

  if (data.description !== undefined) {
    payload.description = data.description.trim() || undefined;
  }

  return guardedAction(
    () =>
      fetchServerApi(`/setlists/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
    () => revalidatePath("/dashboard/setlists"),
  );
}

export async function deleteSetlist(id: string) {
  const t = await getTranslations("setlists.errors");

  if (!id) return { success: false, error: t("invalidId") };

  return guardedAction(
    () => fetchServerApi(`/setlists/${id}`, { method: "DELETE" }),
    () => revalidatePath("/dashboard/setlists"),
  );
}

export async function addSongToSetlist(
  setlistId: string,
  data: { song_id: string; position: number },
) {
  const t = await getTranslations("setlists.errors");

  if (!setlistId || !data.song_id) {
    return { success: false, error: t("invalidSetlistOrSongId") };
  }

  const position = Math.max(1, Math.floor(Number(data.position)));

  return guardedAction(
    () =>
      fetchServerApi(`/setlists/${setlistId}/songs`, {
        method: "POST",
        body: JSON.stringify({ song_id: data.song_id, position }),
      }),
    () => revalidatePath(`/dashboard/setlists/${setlistId}`),
  );
}

export async function removeSongFromSetlist(setlistId: string, songId: string) {
  const t = await getTranslations("setlists.errors");

  if (!setlistId || !songId) {
    return { success: false, error: t("invalidSetlistOrSongId") };
  }

  return guardedAction(
    () =>
      fetchServerApi(`/setlists/${setlistId}/songs/${songId}`, {
        method: "DELETE",
      }),
    () => revalidatePath(`/dashboard/setlists/${setlistId}`),
  );
}

export async function reorderSetlistSongs(
  setlistId: string,
  songIds: string[],
) {
  const t = await getTranslations("setlists.errors");

  if (!setlistId) return { success: false, error: t("invalidId") };

  if (!Array.isArray(songIds) || songIds.length === 0) {
    return { success: false, error: t("emptySongList") };
  }

  if (songIds.some((id) => typeof id !== "string" || !id.trim())) {
    return { success: false, error: t("invalidSongIds") };
  }

  return guardedAction(
    () =>
      fetchServerApi(`/setlists/${setlistId}/songs/reorder`, {
        method: "PATCH",
        body: JSON.stringify({ song_ids: songIds }),
      }),
    () => revalidatePath(`/dashboard/setlists/${setlistId}`),
  );
}
