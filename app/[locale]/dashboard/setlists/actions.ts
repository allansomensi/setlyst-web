"use server";

import { fetchServerApi, ApiError } from "@/lib/api-server";
import { guardedAction, ActionResult } from "@/lib/action-guard";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { Setlist } from "@/types/api";

export async function createSetlist(data: {
  title: string;
  description?: string;
  band_id?: string;
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
        body: JSON.stringify({ title, description, band_id: data.band_id }),
      }),
    () =>
      data.band_id
        ? revalidatePath(`/dashboard/bands/${data.band_id}/setlists`)
        : revalidatePath("/dashboard/setlists"),
  );
}

export async function updateSetlist(
  id: string,
  data: { title?: string; description?: string },
  bandId?: string,
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
    () => {
      revalidatePath("/dashboard/setlists");
      if (bandId) revalidatePath(`/dashboard/bands/${bandId}/setlists`);
    },
  );
}

export async function deleteSetlist(id: string, bandId?: string) {
  const t = await getTranslations("setlists.errors");

  if (!id) return { success: false, error: t("invalidId") };

  return guardedAction(
    () => fetchServerApi(`/setlists/${id}`, { method: "DELETE" }),
    () => {
      revalidatePath("/dashboard/setlists");
      if (bandId) revalidatePath(`/dashboard/bands/${bandId}/setlists`);
    },
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
    async () => {
      try {
        return await fetchServerApi(`/setlists/${setlistId}/songs`, {
          method: "POST",
          body: JSON.stringify({ song_id: data.song_id, position }),
        });
      } catch (err) {
        if (err instanceof ApiError && err.status === 409) {
          throw new Error(t("songAlreadyInSetlist"));
        }
        throw err;
      }
    },
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

export async function enableSetlistSharing(
  id: string,
): Promise<ActionResult<Setlist>> {
  const t = await getTranslations("setlists.errors");

  if (!id) return { success: false, error: t("invalidId") };

  return guardedAction(
    () => fetchServerApi<Setlist>(`/setlists/${id}/share`, { method: "POST" }),
    () => revalidatePath(`/dashboard/setlists/${id}`),
  );
}

export async function disableSetlistSharing(
  id: string,
): Promise<ActionResult<void>> {
  const t = await getTranslations("setlists.errors");

  if (!id) return { success: false, error: t("invalidId") };

  return guardedAction(
    () => fetchServerApi(`/setlists/${id}/share`, { method: "DELETE" }),
    () => revalidatePath(`/dashboard/setlists/${id}`),
  );
}
