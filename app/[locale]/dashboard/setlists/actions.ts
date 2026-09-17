"use server";

import { fetchServerApi, ApiError } from "@/lib/api-server";
import { guardedAction, ActionResult } from "@/lib/action-guard";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { Setlist, SetlistItemRef, SetlistMarker } from "@/types/api";

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

export async function duplicateSetlist(
  id: string,
  title?: string,
): Promise<ActionResult<Setlist>> {
  const t = await getTranslations("setlists.errors");

  if (!id) return { success: false, error: t("invalidId") };

  const trimmedTitle = title?.trim();

  return guardedAction(
    () =>
      fetchServerApi<Setlist>(`/setlists/${id}/duplicate`, {
        method: "POST",
        body: JSON.stringify({
          title: trimmedTitle ? trimmedTitle.slice(0, 255) : undefined,
        }),
      }),
    () => revalidatePath("/dashboard/setlists"),
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
  data: { song_id: string },
) {
  const t = await getTranslations("setlists.errors");

  if (!setlistId || !data.song_id) {
    return { success: false, error: t("invalidSetlistOrSongId") };
  }

  return guardedAction(
    async () => {
      try {
        return await fetchServerApi(`/setlists/${setlistId}/songs`, {
          method: "POST",
          body: JSON.stringify({ song_id: data.song_id }),
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

export async function reorderSetlistItems(
  setlistId: string,
  items: SetlistItemRef[],
) {
  const t = await getTranslations("setlists.errors");

  if (!setlistId) return { success: false, error: t("invalidId") };

  if (!Array.isArray(items) || items.length === 0) {
    return { success: false, error: t("emptySongList") };
  }

  return guardedAction(
    () =>
      fetchServerApi(`/setlists/${setlistId}/items/reorder`, {
        method: "PATCH",
        body: JSON.stringify({ items }),
      }),
    () => revalidatePath(`/dashboard/setlists/${setlistId}`),
  );
}

export async function createSetlistBlock(setlistId: string, name: string) {
  const t = await getTranslations("setlists.errors");

  const trimmed = name?.trim();
  if (!setlistId || !trimmed) {
    return { success: false, error: t("invalidId") };
  }

  return guardedAction(
    () =>
      fetchServerApi<SetlistMarker>(`/setlists/${setlistId}/blocks`, {
        method: "POST",
        body: JSON.stringify({ name: trimmed.slice(0, 255) }),
      }),
    () => revalidatePath(`/dashboard/setlists/${setlistId}`),
  );
}

export async function updateSetlistBlock(
  setlistId: string,
  markerId: string,
  name: string,
) {
  const t = await getTranslations("setlists.errors");

  const trimmed = name?.trim();
  if (!setlistId || !markerId || !trimmed) {
    return { success: false, error: t("invalidId") };
  }

  return guardedAction(
    () =>
      fetchServerApi<SetlistMarker>(
        `/setlists/${setlistId}/blocks/${markerId}`,
        {
          method: "PATCH",
          body: JSON.stringify({ name: trimmed.slice(0, 255) }),
        },
      ),
    () => revalidatePath(`/dashboard/setlists/${setlistId}`),
  );
}

export async function createSetlistBreak(
  setlistId: string,
  data: { label?: string; duration_minutes?: number | null },
) {
  const t = await getTranslations("setlists.errors");

  if (!setlistId) return { success: false, error: t("invalidId") };

  return guardedAction(
    () =>
      fetchServerApi<SetlistMarker>(`/setlists/${setlistId}/breaks`, {
        method: "POST",
        body: JSON.stringify({
          label: data.label?.trim() || undefined,
          duration_minutes: data.duration_minutes ?? undefined,
        }),
      }),
    () => revalidatePath(`/dashboard/setlists/${setlistId}`),
  );
}

export async function updateSetlistBreak(
  setlistId: string,
  markerId: string,
  data: { label?: string; duration_minutes?: number | null },
) {
  const t = await getTranslations("setlists.errors");

  if (!setlistId || !markerId) return { success: false, error: t("invalidId") };

  return guardedAction(
    () =>
      fetchServerApi<SetlistMarker>(
        `/setlists/${setlistId}/breaks/${markerId}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            label: data.label?.trim() || undefined,
            duration_minutes: data.duration_minutes ?? undefined,
          }),
        },
      ),
    () => revalidatePath(`/dashboard/setlists/${setlistId}`),
  );
}

export async function deleteSetlistMarker(setlistId: string, markerId: string) {
  const t = await getTranslations("setlists.errors");

  if (!setlistId || !markerId) return { success: false, error: t("invalidId") };

  return guardedAction(
    () =>
      fetchServerApi(`/setlists/${setlistId}/markers/${markerId}`, {
        method: "DELETE",
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

export async function favoriteSetlist(id: string): Promise<ActionResult<void>> {
  const t = await getTranslations("setlists.errors");

  if (!id) return { success: false, error: t("invalidId") };

  return guardedAction(
    () => fetchServerApi(`/setlists/${id}/favorite`, { method: "POST" }),
    () => {
      revalidatePath("/dashboard/setlists");
      revalidatePath("/dashboard");
    },
  );
}

export async function unfavoriteSetlist(
  id: string,
): Promise<ActionResult<void>> {
  const t = await getTranslations("setlists.errors");

  if (!id) return { success: false, error: t("invalidId") };

  return guardedAction(
    () => fetchServerApi(`/setlists/${id}/favorite`, { method: "DELETE" }),
    () => {
      revalidatePath("/dashboard/setlists");
      revalidatePath("/dashboard");
    },
  );
}
