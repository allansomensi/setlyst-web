"use server";

import { fetchServerApi } from "@/lib/api-server";
import {
  guardedAction,
  invalidRequest,
  type ActionResult,
} from "@/lib/action-guard";
import { apiPath } from "@/lib/api-endpoint";
import { isUuid } from "@/lib/uuid";
import { revalidateDashboard } from "@/lib/revalidate";
import {
  BandCopyStatus,
  CreateSongPayload,
  Song,
  SongAnalysis,
  SongVersion,
  TagCount,
  UpdateSongPayload,
} from "@/types/api";
import { normalizeAnalysis } from "@/lib/music/analysis";
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
  if (!isUuid(id) || !data || typeof data !== "object") {
    return invalidRequest();
  }
  const t = await getTranslations("songs.errors");

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
      fetchServerApi(apiPath`/songs/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
    revalidateSongViews,
  );
}

/**
 * Creates a version of one of the person's songs ("Simplificada",
 * "Acústica"): a copy of everything in it — chart, key, tempo, tags,
 * links — under the same title and artist, named by `label`, to be
 * edited from there. Returns the new song.
 */
export async function createSongVersion(
  sourceId: string,
  label: string,
): Promise<ActionResult<Song>> {
  if (!isUuid(sourceId)) return invalidRequest();
  const t = await getTranslations("songDetail.versions");
  const versionLabel = label?.trim();
  if (!versionLabel || versionLabel.length > 60) {
    return { success: false, error: t("labelLength") };
  }

  return guardedAction(
    async () => {
      const source = await fetchServerApi<Song>(apiPath`/songs/${sourceId}`);
      const payload: CreateSongPayload = {
        title: source.title,
        artist_id: source.artist_id,
        tempo: source.tempo ?? null,
        lyrics: source.lyrics ?? null,
        tonality: source.tonality ?? null,
        genre: source.genre ?? null,
        duration: source.duration ?? null,
        tags: source.tags,
        energy: source.energy ?? null,
        time_signature: source.time_signature ?? null,
        capo: source.capo ?? null,
        tuning: source.tuning ?? null,
        performance_notes: source.performance_notes ?? null,
        links: (source.links ?? []).map(({ url, label }) => ({ url, label })),
        version_of: source.id,
        version_label: versionLabel,
      };
      return fetchServerApi<Song>("/songs", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    () => {
      revalidateDashboard("/songs", "layout");
      revalidateDashboard("");
    },
  );
}

/** The song's version family: the original and every version. */
export async function getSongVersions(id: string) {
  if (!isUuid(id)) return invalidRequest();
  return guardedAction(() =>
    fetchServerApi<SongVersion[]>(apiPath`/songs/${id}/versions`),
  );
}

/** Moves the song to the trash (restore with `restoreTrashItem`). */
export async function deleteSong(id: string) {
  if (!isUuid(id)) return invalidRequest();

  return guardedAction(
    () => fetchServerApi(apiPath`/songs/${id}`, { method: "DELETE" }),
    revalidateSongViews,
  );
}

/**
 * How the band copies of one of the person's songs compare to it: for a
 * personal song, its copies in their bands; for a band's copy, that copy
 * when the person contributed it.
 */
export async function getSongBandCopies(id: string) {
  if (!isUuid(id)) return invalidRequest();
  return guardedAction(() =>
    fetchServerApi<BandCopyStatus[]>(apiPath`/songs/${id}/band-copies`),
  );
}

/**
 * Replaces a band's copy of a song with the person's current version of
 * it (edits the band made to its copy are replaced).
 */
export async function syncBandSong(id: string) {
  if (!isUuid(id)) return invalidRequest();
  return guardedAction(
    () =>
      fetchServerApi<BandCopyStatus>(apiPath`/songs/${id}/sync`, {
        method: "POST",
      }),
    revalidateSongViews,
  );
}

export async function listSongTags() {
  return guardedAction(() => fetchServerApi<TagCount[]>("/songs/tags"));
}

/** A tag as the client sends it: non-empty text of a sane length. */
function isTagName(value: unknown): value is string {
  return (
    typeof value === "string" && value.trim().length > 0 && value.length <= 100
  );
}

/** Renames a tag on every personal song; renaming onto an existing tag merges them. */
export async function renameSongTag(tag: string, newTag: string) {
  if (!isTagName(tag) || !isTagName(newTag)) return invalidRequest();
  return guardedAction(
    () =>
      fetchServerApi<unknown>(apiPath`/songs/tags/${tag}`, {
        method: "PATCH",
        body: JSON.stringify({ new_name: newTag }),
      }),
    () => revalidateDashboard("/songs", "layout"),
  );
}

export async function deleteSongTag(tag: string) {
  if (!isTagName(tag)) return invalidRequest();
  return guardedAction(
    () =>
      fetchServerApi<unknown>(apiPath`/songs/tags/${tag}`, {
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
  if (!payload || typeof payload !== "object") return invalidRequest();
  if (payload.artist_id != null && !isUuid(payload.artist_id)) {
    return invalidRequest();
  }
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
        `/songs/import/chordpro?dry_run=${dryRun === true}`,
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

/**
 * Saves a song's harmonic analysis. `baseUpdatedAt` is the version the
 * editor started from: when someone else saved in between, the API
 * answers a conflict instead of overwriting their work (pass null to
 * overwrite on purpose).
 */
export async function saveSongAnalysis(
  id: string,
  content: unknown,
  baseUpdatedAt: string | null,
): Promise<ActionResult<SongAnalysis>> {
  if (
    !isUuid(id) ||
    !content ||
    typeof content !== "object" ||
    Array.isArray(content) ||
    (baseUpdatedAt !== null && typeof baseUpdatedAt !== "string")
  ) {
    return invalidRequest();
  }
  // Coerced here too: only a well-formed document is ever sent.
  const document = normalizeAnalysis(content);
  return guardedAction(() =>
    fetchServerApi<SongAnalysis>(apiPath`/songs/${id}/analysis`, {
      method: "PUT",
      body: JSON.stringify({
        content: document,
        base_updated_at: baseUpdatedAt,
      }),
    }),
  );
}

/** Removes a song's harmonic analysis. */
export async function deleteSongAnalysis(id: string) {
  if (!isUuid(id)) return invalidRequest();
  return guardedAction(
    () => fetchServerApi(apiPath`/songs/${id}/analysis`, { method: "DELETE" }),
    // The route pattern, not the id: revalidatePath matches routes.
    () => revalidateDashboard("/songs/[id]", "layout"),
  );
}
