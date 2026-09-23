"use server";

import { fetchServerApi, ApiError } from "@/lib/api-server";
import { guardedAction, ActionResult } from "@/lib/action-guard";
import { revalidateDashboard } from "@/lib/revalidate";
import { isUuid } from "@/lib/server/api-route";
import { getTranslations } from "next-intl/server";
import {
  PaginatedResponse,
  Setlist,
  SetlistItemRef,
  SetlistMarker,
  SetlistSong,
} from "@/types/api";
import type {
  DuplicateSetlistExtras,
  LinkInput,
  Suggestion,
} from "@/types/content";

/**
 * A setlist's running order changed: its own pages (detail, Live Mode,
 * analytics), the lists showing its song count and duration, and gigs
 * showing it.
 */
function revalidateSetlistContent() {
  revalidateDashboard("/setlists", "layout");
  revalidateDashboard("/bands/[id]/setlists");
  revalidateDashboard("/gigs", "layout");
}

/** A setlist itself changed (title, description) or was deleted. */
function revalidateSetlistViews(bandId?: string) {
  revalidateSetlistContent();
  revalidateDashboard("");
  if (bandId) revalidateDashboard("/bands/[id]", "layout");
}

export async function createSetlist(data: {
  title: string;
  description?: string;
  band_id?: string;
  links?: LinkInput[];
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
        body: JSON.stringify({
          title,
          description,
          band_id: data.band_id,
          links: data.links,
        }),
      }),
    () =>
      data.band_id
        ? revalidateDashboard("/bands/[id]/setlists")
        : revalidateDashboard("/setlists"),
  );
}

export async function updateSetlist(
  id: string,
  data: { title?: string; description?: string; links?: LinkInput[] },
  bandId?: string,
) {
  const t = await getTranslations("setlists.errors");

  if (!id) return { success: false, error: t("invalidId") };

  const payload: {
    title?: string;
    description?: string | null;
    links?: LinkInput[];
  } = {};

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
    // Empty clears it (the API reads `null` as "remove").
    payload.description = data.description.trim() || null;
  }

  if (data.links !== undefined) payload.links = data.links;

  return guardedAction(
    () =>
      fetchServerApi(`/setlists/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
    () => revalidateSetlistViews(bandId),
  );
}

export async function duplicateSetlist(
  id: string,
  title?: string,
): Promise<ActionResult<Setlist & DuplicateSetlistExtras>> {
  const t = await getTranslations("setlists.errors");

  if (!id) return { success: false, error: t("invalidId") };

  const trimmedTitle = title?.trim();

  return guardedAction(
    () =>
      fetchServerApi<Setlist & DuplicateSetlistExtras>(
        `/setlists/${id}/duplicate`,
        {
          method: "POST",
          body: JSON.stringify({
            title: trimmedTitle ? trimmedTitle.slice(0, 255) : undefined,
          }),
        },
      ),
    () => revalidateDashboard("/setlists"),
  );
}

/** Moves the setlist to the trash (the band repertoire can't be). */
export async function deleteSetlist(id: string, bandId?: string) {
  const t = await getTranslations("setlists.errors");

  if (!id) return { success: false, error: t("invalidId") };

  return guardedAction(
    () => fetchServerApi(`/setlists/${id}`, { method: "DELETE" }),
    () => revalidateSetlistViews(bandId),
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

  return guardedAction(async () => {
    try {
      return await fetchServerApi(`/setlists/${setlistId}/songs`, {
        method: "POST",
        body: JSON.stringify({ song_id: data.song_id }),
      });
    } catch (err) {
      // `ALREADY_EXISTS` here always means this song: say so plainly.
      if (err instanceof ApiError && err.status === 409) {
        throw new ApiError(
          409,
          err.message,
          null,
          "SONG_ALREADY_IN_SETLIST",
          err.meta,
        );
      }
      throw err;
    }
  }, revalidateSetlistContent);
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
    revalidateSetlistContent,
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
    revalidateSetlistContent,
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
    revalidateSetlistContent,
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
    revalidateSetlistContent,
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
    revalidateSetlistContent,
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
    revalidateSetlistContent,
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
    revalidateSetlistContent,
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
    revalidateSetlistContent,
  );
}

export async function enableSetlistSharing(
  id: string,
): Promise<ActionResult<Setlist>> {
  const t = await getTranslations("setlists.errors");

  if (!id) return { success: false, error: t("invalidId") };

  return guardedAction(
    () => fetchServerApi<Setlist>(`/setlists/${id}/share`, { method: "POST" }),
    revalidateSetlistContent,
  );
}

export async function disableSetlistSharing(
  id: string,
): Promise<ActionResult<void>> {
  const t = await getTranslations("setlists.errors");

  if (!id) return { success: false, error: t("invalidId") };

  return guardedAction(
    () => fetchServerApi(`/setlists/${id}/share`, { method: "DELETE" }),
    revalidateSetlistContent,
  );
}

export async function favoriteSetlist(id: string): Promise<ActionResult<void>> {
  const t = await getTranslations("setlists.errors");

  if (!id) return { success: false, error: t("invalidId") };

  return guardedAction(
    () => fetchServerApi(`/setlists/${id}/favorite`, { method: "POST" }),
    () => {
      revalidateDashboard("/setlists");
      revalidateDashboard("");
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
      revalidateDashboard("/setlists");
      revalidateDashboard("");
    },
  );
}

/**
 * Proposes one of the caller's songs for a band setlist (members without
 * `manage_setlists`). The band votes; a manager accepts or rejects.
 */
export async function suggestSongForSetlist(
  bandId: string,
  data: { song_id: string; setlist_id: string; note?: string },
): Promise<ActionResult<Suggestion>> {
  const t = await getTranslations("setlists.errors");
  if (!isUuid(bandId) || !isUuid(data.song_id) || !isUuid(data.setlist_id)) {
    return { success: false, error: t("invalidSetlistOrSongId") };
  }
  const note = data.note?.trim().slice(0, 500) || undefined;
  return guardedAction(
    () =>
      fetchServerApi<Suggestion>(`/bands/${bandId}/suggestions`, {
        method: "POST",
        body: JSON.stringify({
          song_id: data.song_id,
          setlist_id: data.setlist_id,
          note,
        }),
      }),
    () => revalidateDashboard("/bands/[id]", "layout"),
  );
}

/** One page of the band's repertoire (`GET /bands/{id}/repertoire`). */
export async function searchBandRepertoire(
  bandId: string,
  query: string,
  page = 1,
): Promise<ActionResult<PaginatedResponse<SetlistSong>>> {
  const t = await getTranslations("setlists.errors");
  if (!isUuid(bandId)) return { success: false, error: t("invalidId") };
  const params = new URLSearchParams({
    page: String(Math.max(1, Math.min(page, 1000))),
    per_page: "20",
  });
  const q = query.trim().slice(0, 100);
  if (q) params.set("q", q);
  return guardedAction(() =>
    fetchServerApi<PaginatedResponse<SetlistSong>>(
      `/bands/${bandId}/repertoire?${params}`,
    ),
  );
}
