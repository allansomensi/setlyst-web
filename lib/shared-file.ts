import type { ImportBackupPayload } from "@/types/api";

/** What a file exported from a setlist, gig or tour holds. */
export type SharedFileKind = "setlist" | "gig" | "tour";

export const SHARED_FILE_KINDS: readonly SharedFileKind[] = [
  "setlist",
  "gig",
  "tour",
];

/** What a shared file holds, as shown before importing it. */
export interface SharedFileSummary {
  kind: SharedFileKind;
  /** The setlist's title, the gig's venue or the tour's name. */
  title: string;
  songs: number;
  artists: number;
  setlists: number;
  gigs: number;
  /** Blocks and breaks, across its setlists. */
  markers: number;
}

export type SharedFileReading =
  | { ok: true; summary: SharedFileSummary }
  | { ok: false; reason: "invalid" | "backup" };

const isKind = (value: unknown): value is SharedFileKind =>
  SHARED_FILE_KINDS.includes(value as SharedFileKind);

/**
 * Reads a file exported from a setlist, gig or tour
 * (`GET /{setlists,gigs,tours}/{id}/export`) well enough to show what it
 * holds, and tells a full account backup apart: that one goes through
 * Settings → Backup, since it would bring a whole library along. The API
 * checks the file again, in full.
 */
export function readSharedFile(text: string): SharedFileReading {
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
  if (file.kind === undefined || file.kind === "backup") {
    return { ok: false, reason: "backup" };
  }
  if (!isKind(file.kind)) return { ok: false, reason: "invalid" };

  const gigs = Array.isArray(file.gigs) ? file.gigs : [];
  const tours = Array.isArray(file.tours) ? file.tours : [];
  const title =
    file.kind === "setlist"
      ? file.setlists.length === 1 && file.setlists[0]?.title
      : file.kind === "gig"
        ? gigs.length === 1 && gigs[0]?.venue
        : tours.length === 1 && tours[0]?.name;
  if (typeof title !== "string") return { ok: false, reason: "invalid" };

  return {
    ok: true,
    summary: {
      kind: file.kind,
      title,
      songs: file.songs.length,
      artists: file.artists.length,
      setlists: file.setlists.length,
      gigs: gigs.length,
      markers: file.setlists.reduce(
        (sum, setlist) =>
          sum + (Array.isArray(setlist?.markers) ? setlist.markers.length : 0),
        0,
      ),
    },
  };
}

/** Where a kind of file is imported (the app's route handler). */
export const importRoute = (kind: SharedFileKind) =>
  `/api/import/shared/${kind}`;

/** Where a kind of file is exported (the app's route handler). */
export const exportRoute = (kind: SharedFileKind, id: string) =>
  `/api/export/shared/${kind}/${id}`;
