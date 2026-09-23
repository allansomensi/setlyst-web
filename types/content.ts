/**
 * Content types added in v0.12 (links, tours, trash, band suggestions and
 * reminders, pins, ChordPro import). Shapes mirror the API models in
 * `setlyst-api/src/models/{link,tour,trash,suggestion,band_note,pin}.rs`.
 */

import type { GigStatus, SetlistMarkerType, Tonality } from "@/types/api";

// ---------------------------------------------------------------------
// Links (songs and setlists)
// ---------------------------------------------------------------------

export const LINK_PROVIDERS = [
  "youtube",
  "spotify",
  "google_drive",
  "apple_music",
  "deezer",
  "soundcloud",
  "dropbox",
  "onedrive",
] as const;

export type LinkProvider = (typeof LINK_PROVIDERS)[number];

/** A stored link, as the API returns it. */
export interface Link {
  url: string;
  label: string | null;
  provider: LinkProvider;
}

/** A link as sent to the API (the provider is derived server-side). */
export interface LinkInput {
  url: string;
  label?: string | null;
}

// ---------------------------------------------------------------------
// Public share pages
// ---------------------------------------------------------------------

/** A song on a public share page: no ids, no owners, no tags. */
export interface PublicSong {
  /** Position in the running order (merge with the markers by it). */
  position: number;
  title: string;
  artist_name: string;
  tempo: number | null;
  tonality: Tonality | null;
  duration: number | null;
  energy: number | null;
  time_signature: string | null;
  capo: number | null;
  lyrics: string | null;
  links: Link[];
}

export interface PublicMarker {
  marker_type: SetlistMarkerType;
  label: string | null;
  duration_minutes: number | null;
  position: number;
}

// ---------------------------------------------------------------------
// Tours
// ---------------------------------------------------------------------

export interface Tour {
  id: string;
  user_id: string;
  band_id: string | null;
  band_name?: string | null;
  name: string;
  description: string | null;
  /** "YYYY-MM-DD" */
  start_date: string;
  /** "YYYY-MM-DD" */
  end_date: string;
  gig_count: number;
  /** Wall-clock "YYYY-MM-DDTHH:MM:SS" of the next confirmed gig. */
  next_gig_at: string | null;
  created_at: string;
  updated_at: string;
  updated_by_username?: string | null;
  owner_username?: string | null;
  is_pinned?: boolean;
}

export interface TourGigSetlist {
  id: string;
  title: string;
  /** The band repertoire: show `setlists.repertoire.name`, not `title`. */
  is_repertoire: boolean;
  song_count: number;
  total_duration: number;
}

export interface TourGigSummary {
  id: string;
  venue: string;
  location: string | null;
  scheduled_at: string;
  status: GigStatus;
  setlist: TourGigSetlist | null;
}

export interface TourStats {
  total_gigs: number;
  confirmed: number;
  completed: number;
  cancelled: number;
  /** Seconds. */
  total_setlist_duration: number;
}

export interface TourDetail extends Tour {
  gigs: TourGigSummary[];
  stats: TourStats;
}

export interface CreateTourPayload {
  name: string;
  description?: string | null;
  start_date: string;
  end_date: string;
  band_id?: string | null;
}

export interface UpdateTourPayload {
  name?: string;
  description?: string | null;
  start_date?: string;
  end_date?: string;
}

// ---------------------------------------------------------------------
// Trash
// ---------------------------------------------------------------------

export const TRASH_TYPES = [
  "song",
  "artist",
  "setlist",
  "gig",
  "tour",
] as const;
export type TrashType = (typeof TRASH_TYPES)[number];

export interface TrashItem {
  type: TrashType;
  id: string;
  title: string;
  /**
   * Artist (song), "YYYY-MM-DD HH:MM[, location]" (gig),
   * "YYYY-MM-DD..YYYY-MM-DD" (tour), band name or null otherwise.
   */
  subtitle: string | null;
  band_id: string | null;
  band_name: string | null;
  deleted_at: string;
  deleted_by_username: string | null;
  purge_at: string;
  /** Songs trashed together with an artist. */
  batch_count: number;
}

// ---------------------------------------------------------------------
// Band suggestions
// ---------------------------------------------------------------------

export type SuggestionStatus = "open" | "accepted" | "rejected" | "withdrawn";
export type SuggestionFilter = SuggestionStatus | "all";

export interface Suggestion {
  id: string;
  band_id: string;
  setlist: { id: string; title: string; is_repertoire: boolean };
  /** `null` once the suggested song no longer exists. */
  song: {
    id: string;
    title: string;
    artist_name: string;
    tonality: Tonality | null;
    tempo: number | null;
    energy: number | null;
    duration: number | null;
    links: Link[];
  } | null;
  song_title: string;
  artist_name: string;
  suggested_by: {
    id: string;
    username: string;
    avatar_url: string | null;
  } | null;
  note: string | null;
  status: SuggestionStatus;
  votes: { up: number; down: number };
  /** The caller's vote: -1, 0 (none) or 1. */
  my_vote: -1 | 0 | 1;
  resolved_by_username: string | null;
  resolved_at: string | null;
  resolution_note: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------
// Band reminders
// ---------------------------------------------------------------------

export const BAND_NOTE_COLORS = [
  "default",
  "yellow",
  "green",
  "blue",
  "red",
  "purple",
] as const;
export type BandNoteColor = (typeof BAND_NOTE_COLORS)[number];

export interface BandNote {
  id: string;
  band_id: string;
  author: { id: string; username: string; avatar_url: string | null } | null;
  content: string;
  color: BandNoteColor;
  is_pinned: boolean;
  /** Wall-clock "YYYY-MM-DDTHH:MM:SS" or null. */
  due_at: string | null;
  created_at: string;
  updated_at: string;
  updated_by_username: string | null;
  /** Whether the caller may edit or delete it (author or moderator+). */
  can_edit: boolean;
}

// ---------------------------------------------------------------------
// Pins (home page)
// ---------------------------------------------------------------------

export const PIN_ITEM_TYPES = [
  "setlist",
  "band",
  "song",
  "tour",
  "gig",
] as const;
export type PinItemType = (typeof PIN_ITEM_TYPES)[number];

export const MAX_PINS = 12;

export interface PinnedItem {
  item_type: PinItemType;
  item_id: string;
  position: number;
  title: string;
  subtitle: string | null;
  band_id: string | null;
  /** A band repertoire pin: show `setlists.repertoire.name`, not `title`. */
  is_repertoire: boolean;
  /** `/dashboard/{setlists|bands|songs|tours|gigs}/{id}` */
  href_hint: string;
}

// ---------------------------------------------------------------------
// ChordPro import
// ---------------------------------------------------------------------

export interface ChordProWarning {
  code: string;
  line?: number | null;
  detail?: string | null;
}

export interface ChordProPreview {
  title: string;
  artist_name: string | null;
  tonality: Tonality | null;
  tempo: number | null;
  time_signature: string | null;
  capo: number | null;
  duration: number | null;
  lyrics: string | null;
  warnings: ChordProWarning[];
}

export interface ImportChordProPayload {
  content: string;
  artist_id?: string;
  artist_name?: string;
  title?: string;
}

/** `POST /setlists/{id}/duplicate` answers the new setlist plus this count. */
export interface DuplicateSetlistExtras {
  skipped_band_songs?: number;
}
