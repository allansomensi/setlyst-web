import type { ImportBackupPayload } from "@/types/api";

/** What a setlist file holds, as shown before importing it. */
export interface SetlistFileSummary {
  title: string;
  songs: number;
  artists: number;
  /** Blocks and breaks. */
  markers: number;
}

export type SetlistFileReading =
  | { ok: true; summary: SetlistFileSummary }
  | { ok: false; reason: "invalid" | "backup" };

/**
 * Reads a setlist file (`GET /setlists/{id}/export`) well enough to show
 * what it holds, and tells a full account backup apart: that one goes
 * through Settings → Backup, since it would bring a whole library along.
 */
export function readSetlistFile(text: string): SetlistFileReading {
  let file: Partial<ImportBackupPayload> | null;
  try {
    file = JSON.parse(text);
  } catch {
    return { ok: false, reason: "invalid" };
  }
  if (
    !file ||
    typeof file !== "object" ||
    typeof file.version !== "number" ||
    !Array.isArray(file.setlists) ||
    !Array.isArray(file.songs) ||
    !Array.isArray(file.artists)
  ) {
    return { ok: false, reason: "invalid" };
  }
  // Backups older than format 5 carry no `kind`.
  if (file.kind !== "setlist") return { ok: false, reason: "backup" };
  const setlist = file.setlists.length === 1 ? file.setlists[0] : null;
  if (typeof setlist?.title !== "string") {
    return { ok: false, reason: "invalid" };
  }
  return {
    ok: true,
    summary: {
      title: setlist.title,
      songs: Array.isArray(setlist.songs) ? setlist.songs.length : 0,
      artists: file.artists.length,
      markers: Array.isArray(setlist.markers) ? setlist.markers.length : 0,
    },
  };
}
