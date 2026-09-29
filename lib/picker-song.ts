import type { Song } from "@/types/api";

/**
 * What the "add song" picker shows of a song. The page projects its
 * library down to these fields before handing it over: the full records
 * carry every lyric, and serializing all of them into the page's payload
 * (again after each save on the page) is what made setlist pages heavy.
 *
 * Kept out of add-song-dialog.tsx on purpose: that file is a client
 * module, and a function imported from one into a Server Component is a
 * client reference, not the function — calling it there throws.
 */
export type PickerSong = Pick<
  Song,
  "id" | "title" | "artist_id" | "version_label" | "tonality" | "tempo" | "tags"
>;

/** The projection the page applies (see PickerSong). */
export function toPickerSong(song: Song): PickerSong {
  return {
    id: song.id,
    title: song.title,
    artist_id: song.artist_id,
    version_label: song.version_label ?? null,
    tonality: song.tonality ?? null,
    tempo: song.tempo ?? null,
    tags: song.tags ?? [],
  };
}
