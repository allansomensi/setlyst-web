"use server";

import { fetchServerApi } from "@/lib/api-server";
import { guardedAction, type ActionResult } from "@/lib/action-guard";
import { revalidateDashboard } from "@/lib/revalidate";
import {
  CreateSongPayload,
  Song,
  TagCount,
  UpdateSongPayload,
} from "@/types/api";
import type { ChordProPreview, ImportChordProPayload } from "@/types/content";
import { CHORDPRO_MAX_BYTES, utf8Size } from "@/lib/chordpro-file";
import { getTranslations } from "next-intl/server";

/**
 * Everything that shows song data: the library, each song's own pages
 * (lyrics, Live Mode), every setlist (running order, analytics, Live
 * Mode), band pages, gig pages and the statistics.
 */
function revalidateSongViews() {
  revalidateDashboard("", "layout");
}

export async function createSong(data: CreateSongPayload) {
  const t = await getTranslations("songs.errors");
  const title = data.title?.trim();

  if (!title || title.length < 1 || title.length > 255) {
    return {
      success: false,
      error: t("titleLength"),
    };
  }
  if (!data.artist_id) {
    return { success: false, error: t("artistRequired") };
  }

  const payload: CreateSongPayload = {
    ...data,
    title,
    tempo: data.tempo ? Math.min(Math.max(Number(data.tempo), 1), 500) : null,
  };

  return guardedAction(
    () =>
      fetchServerApi("/songs", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    () => {
      revalidateDashboard("/songs");
      revalidateDashboard("");
      revalidateDashboard("/analytics");
    },
  );
}

export async function updateSong(id: string, data: UpdateSongPayload) {
  const t = await getTranslations("songs.errors");

  if (!id) return { success: false, error: t("invalidId") };

  const payload: UpdateSongPayload = { ...data };

  if (data.title !== undefined) {
    const title = data.title?.trim();
    if (!title || title.length > 255) {
      return {
        success: false,
        error: t("titleLength"),
      };
    }
    payload.title = title;
  }

  if (data.tempo !== undefined && data.tempo !== null) {
    payload.tempo = Math.min(Math.max(Number(data.tempo), 1), 500);
  }

  return guardedAction(
    () =>
      fetchServerApi(`/songs/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
    revalidateSongViews,
  );
}

/** Moves the song to the trash (restore with `restoreTrashItem`). */
export async function deleteSong(id: string) {
  const t = await getTranslations("songs.errors");

  if (!id) return { success: false, error: t("invalidId") };

  return guardedAction(
    () => fetchServerApi(`/songs/${id}`, { method: "DELETE" }),
    revalidateSongViews,
  );
}

export async function listSongTags() {
  return guardedAction(() => fetchServerApi<TagCount[]>("/songs/tags"));
}

/** Renames a tag on every personal song; renaming onto an existing tag merges them. */
export async function renameSongTag(tag: string, newTag: string) {
  return guardedAction(
    () =>
      fetchServerApi<unknown>(`/songs/tags/${encodeURIComponent(tag)}`, {
        method: "PATCH",
        body: JSON.stringify({ new_name: newTag }),
      }),
    () => revalidateDashboard("/songs", "layout"),
  );
}

export async function deleteSongTag(tag: string) {
  return guardedAction(
    () =>
      fetchServerApi<unknown>(`/songs/tags/${encodeURIComponent(tag)}`, {
        method: "DELETE",
      }),
    () => revalidateDashboard("/songs", "layout"),
  );
}

/**
 * `POST /songs/import/chordpro`. With `dryRun`, only parses the file and
 * answers the preview (title, metadata, lyrics, warnings); otherwise
 * creates the song and answers it.
 */
export async function importChordPro(
  payload: ImportChordProPayload,
  dryRun: true,
): Promise<ActionResult<ChordProPreview>>;
export async function importChordPro(
  payload: ImportChordProPayload,
  dryRun: false,
): Promise<ActionResult<Song>>;
export async function importChordPro(
  payload: ImportChordProPayload,
  dryRun: boolean,
): Promise<ActionResult<ChordProPreview | Song>> {
  const t = await getTranslations("chordproImport.errors");
  if (typeof payload.content !== "string" || !payload.content.trim()) {
    return { success: false, error: t("empty") };
  }
  if (utf8Size(payload.content) > CHORDPRO_MAX_BYTES) {
    return { success: false, error: t("tooLarge") };
  }

  const body: ImportChordProPayload = { content: payload.content };
  if (payload.artist_id) body.artist_id = payload.artist_id;
  const artistName = payload.artist_name?.trim();
  if (artistName) body.artist_name = artistName.slice(0, 255);
  const title = payload.title?.trim();
  if (title) body.title = title.slice(0, 255);

  return guardedAction(
    () =>
      fetchServerApi<ChordProPreview | Song>(
        `/songs/import/chordpro?dry_run=${dryRun}`,
        { method: "POST", body: JSON.stringify(body), timeoutMs: 20_000 },
      ),
    dryRun
      ? undefined
      : () => {
          revalidateDashboard("/songs");
          revalidateDashboard("/artists");
          revalidateDashboard("");
          revalidateDashboard("/analytics");
        },
  );
}
