import type {
  Link,
  LinkInput,
  PublicMarker,
  PublicSong,
} from "@/types/content";

export const TONALITIES = [
  "C",
  "C#",
  "Db",
  "D",
  "D#",
  "Eb",
  "E",
  "E#",
  "F",
  "F#",
  "Gb",
  "G",
  "G#",
  "Ab",
  "A",
  "A#",
  "Bb",
  "B",
  "B#",
  "Cm",
  "C#m",
  "Dbm",
  "Dm",
  "D#m",
  "Ebm",
  "Em",
  "E#m",
  "Fm",
  "F#m",
  "Gbm",
  "Gm",
  "G#m",
  "Abm",
  "Am",
  "A#m",
  "Bbm",
  "Bm",
  "B#m",
] as const;

export const GENRES = [
  "Acoustic",
  "Alternative",
  "Axe",
  "Blues",
  "BossaNova",
  "Choro",
  "Classical",
  "Country",
  "DeathMetal",
  "Disco",
  "Electronic",
  "Emo",
  "Folk",
  "Forro",
  "Funk",
  "Gaucho",
  "Gospel",
  "Grunge",
  "HardRock",
  "HeavyMetal",
  "HipHop",
  "House",
  "Indie",
  "Jazz",
  "KPop",
  "Latin",
  "LoFi",
  "Metal",
  "MPB",
  "Pagode",
  "Pop",
  "PowerMetal",
  "ProgressiveRock",
  "PsychedelicRock",
  "Punk",
  "Reggae",
  "Reggaeton",
  "RnB",
  "Rock",
  "Samba",
  "Sertanejo",
  "Ska",
  "Soul",
  "SymphonicMetal",
  "Techno",
  "ThrashMetal",
  "SoftRock",
  "ClassicRock",
  "PopRock",
  "PowerBallad",
  "FolkRock",
  "ArenaRock",
  "GarageRock",
  "IndieRock",
  "PostRock",
  "SurfRock",
  "GlamRock",
  "StonerRock",
  "SouthernRock",
  "BluesRock",
  "RockAndRoll",
  "AlternativeRock",
  "IndustrialRock",
  "NuMetal",
  "BlackMetal",
  "DoomMetal",
  "GrooveMetal",
  "Metalcore",
  "Deathcore",
  "Grindcore",
  "IndustrialMetal",
  "GothicMetal",
  "FolkMetal",
  "PostPunk",
  "PopPunk",
  "SkaPunk",
  "HardcorePunk",
  "NewWave",
  "Dance",
  "EDM",
  "DrumAndBass",
  "Dubstep",
  "Trance",
  "Ambient",
  "Chillout",
  "Synthpop",
  "Industrial",
  "Trap",
  "Drill",
  "Afrobeat",
  "Grime",
  "FunkCarioca",
  "Piseiro",
  "Brega",
  "Frevo",
  "Arrocha",
  "WorldMusic",
  "Flamenco",
  "Tango",
  "Fado",
  "Other",
] as const;

/**
 * Genre values are stored as compact PascalCase identifiers (e.g.
 * "HardRock") so they match the database enum 1:1. This only affects
 * *display* — it inserts spaces before capitals ("Hard Rock") and fixes a
 * few acronyms that shouldn't be split (KPop -> K-Pop, EDM stays EDM).
 */
const GENRE_DISPLAY_OVERRIDES: Partial<Record<Genre, string>> = {
  KPop: "K-Pop",
  EDM: "EDM",
  RnB: "R&B",
  MPB: "MPB",
};

export function formatGenre(genre: string | null | undefined): string {
  if (!genre) return "";
  const override = GENRE_DISPLAY_OVERRIDES[genre as Genre];
  if (override) return override;
  return genre.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
}

export type Tonality = (typeof TONALITIES)[number];
export type Genre = (typeof GENRES)[number];
export type UserRole = "user" | "moderator" | "admin";
export type UserStatus = "active" | "inactive";

export interface PaginationMeta {
  total_items: number;
  current_page: number;
  per_page: number;
  total_pages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface Artist {
  id: string;
  name: string;
  user_id: string;
  band_id: string | null;
  /** Songs by this artist in the caller's library. */
  song_count?: number;
  updated_by?: string | null;
  updated_by_username?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateArtistPayload {
  name: string;
}

export interface Song {
  id: string;
  title: string;
  artist_id: string;
  /** Resolved by the API on `/songs` responses (also for band artists). */
  artist_name?: string | null;
  user_id: string;
  band_id: string | null;
  /** The personal song this band-owned copy was forked from, if any. */
  forked_from: string | null;
  tempo?: number | null;
  lyrics?: string | null;
  tonality?: Tonality | null;
  genre?: Genre | null;
  duration?: number | null;
  /** Normalized (lowercase) tags, alphabetically sorted. */
  tags: string[];
  /** Perceived energy, 1 (very low) to 5 (very high). */
  energy?: number | null;
  /** One of `TIME_SIGNATURES` (lib/song-fields.ts). */
  time_signature?: string | null;
  /** Capo fret, 0 to 11. */
  capo?: number | null;
  /** Free-text tuning ("Drop D", "Meio tom abaixo"...). */
  tuning?: string | null;
  /** Notes for the stage (cues, arrangement reminders). */
  performance_notes?: string | null;
  /** Reference links (recordings, backing tracks, charts). */
  links?: Link[];
  /** Whether the caller pinned this song to the home page. */
  is_pinned?: boolean;
  /** Who last changed the song (null if never edited or account deleted). */
  updated_by?: string | null;
  updated_by_username?: string | null;
  /** Band copies: when the copy last matched its original. */
  source_synced_at?: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * A band's copy of one of the caller's personal songs, and how it compares
 * to that original (`GET /songs/{id}/band-copies`,
 * `GET /bands/{id}/song-updates`). Only the member who contributed the
 * song sees these.
 */
export interface BandCopyStatus {
  /** The band's copy. */
  song_id: string;
  band_id: string;
  band_name: string;
  /** The caller's personal song it was copied from. */
  source_id: string;
  /** The original has changes the band's copy doesn't have yet. */
  has_updates: boolean;
  /** The band edited its copy since: updating replaces those edits. */
  band_edited: boolean;
  /** The caller may update the copy (the band's `manage_songs`). */
  can_update: boolean;
  synced_at: string | null;
}

/**
 * What became of the band's copy when a personal song was added to a band
 * setlist: copied now, reused as it was, brought up to date with the
 * original, or left as it is although the original changed (the band
 * edited it too, or the caller can't edit band songs).
 */
export type BandCopyOutcome = "created" | "reused" | "updated" | "outdated";

/** `POST /setlists/{id}/songs`. */
export interface AddedSetlistSong {
  /** The song now in the setlist (the band's copy, in a band setlist). */
  song_id: string;
  band_copy: BandCopyOutcome | null;
}

/** One tag of the caller's vocabulary, with how many songs use it. */
export interface TagCount {
  tag: string;
  song_count: number;
}

/**
 * A song as returned by `/setlists/{id}/songs`, with its artist's name
 * resolved server-side. Setlists (especially band ones) can contain songs
 * owned by other users, so the artist can't be looked up against the
 * current user's own `/artists` list.
 */
export interface SetlistSong extends Song {
  artist_name: string;
}

export interface CreateSongPayload {
  title: string;
  artist_id: string;
  tempo?: number | null;
  lyrics?: string | null;
  tonality?: Tonality | null;
  genre?: Genre | null;
  duration?: number | null;
  tags?: string[];
  energy?: number | null;
  time_signature?: string | null;
  capo?: number | null;
  tuning?: string | null;
  performance_notes?: string | null;
  links?: LinkInput[];
}

/**
 * Nullable fields: omit to leave unchanged, send `null` to clear.
 * `tags`, when present, replaces the whole tag set; `links` likewise
 * (`[]` removes every link).
 */
export interface UpdateSongPayload {
  title?: string;
  artist_id?: string;
  tempo?: number | null;
  lyrics?: string | null;
  tonality?: Tonality | null;
  genre?: Genre | null;
  duration?: number | null;
  tags?: string[];
  energy?: number | null;
  time_signature?: string | null;
  capo?: number | null;
  tuning?: string | null;
  performance_notes?: string | null;
  links?: LinkInput[];
}

export interface Setlist {
  id: string;
  title: string;
  description: string | null;
  user_id: string;
  band_id: string | null;
  share_token: string | null;
  total_duration: number;
  /** Whether the current user has favorited this setlist. */
  is_favorite: boolean;
  /** Set when staff took the public link down. */
  share_locked_at?: string | null;
  share_lock_reason?: string | null;
  /** Songs in the running order (blocks and breaks excluded). */
  song_count?: number;
  /** Reference links (recordings, rehearsal videos, charts). */
  links?: Link[];
  /**
   * The band's repertoire: created with the band, collects every song of
   * every band setlist. Stored as "Repertoire"; always display the
   * translated name (see lib/repertoire.ts).
   */
  is_repertoire?: boolean;
  /** Whether the caller pinned this setlist to the home page. */
  is_pinned?: boolean;
  owner_username?: string | null;
  updated_by?: string | null;
  updated_by_username?: string | null;
  created_at: string;
  updated_at: string;
}

export type SetlistMarkerType = "block" | "break";

/** A named block header or a break/pause slot in a setlist's running order. */
export interface SetlistMarker {
  id: string;
  setlist_id: string;
  marker_type: SetlistMarkerType;
  /** Block name (for `block` markers) or an optional break label. */
  label: string | null;
  /** Only meaningful for `break` markers. */
  duration_minutes: number | null;
  position: number;
  created_at: string;
}

export interface CreateSetlistBlockPayload {
  name: string;
}

export interface UpdateSetlistBlockPayload {
  name: string;
}

export interface CreateSetlistBreakPayload {
  label?: string | null;
  duration_minutes?: number | null;
}

export interface UpdateSetlistBreakPayload {
  label?: string | null;
  duration_minutes?: number | null;
}

export interface DuplicateSetlistPayload {
  title?: string;
}

/**
 * One entry in a setlist's combined, position-ordered running order —
 * either a song, a block header, or a break. Returned by
 * `GET /setlists/{id}/items` already merged and sorted.
 */
export type SetlistItem =
  | { item_type: "song"; position: number; song: SetlistSong }
  | { item_type: "block"; position: number; id: string; name: string }
  | {
      item_type: "break";
      position: number;
      id: string;
      label: string | null;
      duration_minutes: number | null;
    };

/** A reference to one item in a setlist's timeline, used for reordering. */
export interface SetlistItemRef {
  item_type: "song" | "block" | "break";
  id: string;
}

export interface ReorderSetlistItemsPayload {
  items: SetlistItemRef[];
}

/** The read-only shape returned by the public (unauthenticated) setlist routes. */
export interface PublicSetlist {
  title: string;
  description: string | null;
  total_duration: number;
  /** Reference links of the setlist. */
  links?: Link[];
  songs: PublicSong[];
  markers: PublicMarker[];
}

export interface CreateSetlistPayload {
  title: string;
  description?: string;
  band_id?: string | null;
  links?: LinkInput[];
}

export interface AddSongToSetlistPayload {
  song_id: string;
  position: number;
}

export interface User {
  id: string;
  username: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  role: UserRole;
  status: UserStatus;
  /** When the username was last changed — `null` if never changed. */
  username_changed_at: string | null;
  must_change_password: boolean;
  password_changed_at: string | null;
  last_login_at: string | null;
  /** A suspension is in effect right now (computed by the API). */
  is_banned: boolean;
  banned_at: string | null;
  /** `null` while `is_banned` means a permanent suspension. */
  banned_until: string | null;
  ban_reason: string | null;
  banned_by_username: string | null;
  created_by_username: string | null;
  updated_by_username: string | null;
  created_at: string;
  updated_at: string;
  /** The e-mail address was confirmed with a code (or by Google). */
  email_verified: boolean;
  /** `https` image URL; the image itself is served through the proxy. */
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  instruments: string[];
  two_factor_enabled: boolean;
  /** `false` for accounts created with Google that never set a password. */
  password_set: boolean;
  /** Version of the Terms of Use accepted (`LEGAL_VERSION` when current). */
  terms_version: string | null;
  terms_accepted_at: string | null;
  referral_code: string | null;
}

/** Alias kept for readability where the API calls it `UserPublic`. */
export type UserPublic = User;

export interface UsernameAvailability {
  available: boolean;
  /** Why the name can't be used, when it's invalid or reserved. */
  reason?: string | null;
}

export interface UsernameHistoryEntry {
  old_username: string;
  changed_at: string;
}

export interface UserProfileAdminDetails {
  email: string | null;
  role: UserRole;
  status: UserStatus;
  username_changed_at: string | null;
  is_banned: boolean;
  banned_until: string | null;
  last_login_at: string | null;
  /** Open moderation flags about this account. */
  open_flags?: number;
}

/** A band both the viewer and the profile's owner belong to. */
export interface BandInCommon {
  id: string;
  name: string;
  logo_url: string | null;
}

/** Another user's profile, as returned by GET /users/{id}/profile. */
export interface UserProfileView {
  id: string;
  username: string;
  first_name: string | null;
  last_name: string | null;
  created_at: string;
  /** `null` when there is none (or it was removed by moderation). */
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  instruments: string[];
  bands_in_common: BandInCommon[];
  member_since: string;
  /** The viewer is looking at their own profile. */
  is_self: boolean;
  /** Present only when the viewer is staff. */
  admin_details: UserProfileAdminDetails | null;
}

export interface CreateUserPayload {
  username: string;
  password: string;
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  role?: UserRole;
  status?: UserStatus;
  /** Force a new password at first sign-in (API default: true). */
  require_password_change?: boolean;
}

/** Staff edit. Empty strings clear optional text fields. */
export interface UpdateUserPayload {
  username?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  role?: UserRole;
  status?: UserStatus;
}

export type UserTheme = "light" | "dark" | "system";

export interface UserPreferences {
  id: string;
  user_id: string;
  language: string;
  theme: UserTheme;
  live_mode_font_size: number;
  /** Client-owned settings blob — see lib/ui-settings.ts. */
  ui_settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface UpdatePreferencesPayload {
  language?: string;
  theme?: UserTheme;
  live_mode_font_size?: number;
  /** Shallow-merged; a `null` section removes it. */
  ui_settings?: Record<string, unknown>;
}

export type ServiceHealth = "operational" | "degraded" | "down";

export interface DatabaseStatus {
  status: ServiceHealth;
  version: string | null;
  latency_ms: number | null;
  max_connections: number | null;
  opened_connections: number | null;
  pool_size: number;
  pool_idle: number;
}

export interface DependenciesStatus {
  database: DatabaseStatus;
}

/**
 * `GET /status`. The public endpoint returns only `status` and `version`;
 * the other fields come with the staff-only `/status/details`.
 */
/**
 * `GET /status`. The public report carries `status` only; the other
 * fields come from the authenticated `/status/details`.
 */
export interface ApiStatus {
  status: ServiceHealth;
  version?: string;
  updated_at?: string;
  uptime_seconds?: number;
  dependencies?: DependenciesStatus;
}

export interface GenreCount {
  genre: string;
  count: number;
}

export interface ArtistSongCount {
  artist_name: string;
  song_count: number;
}

export interface RoleCount {
  role: string;
  count: number;
}

export interface UserMetrics {
  total_artists: number;
  total_songs: number;
  total_setlists: number;
  total_bands: number;
  songs_with_lyrics: number;
  songs_without_lyrics: number;
  songs_with_tonality: number;
  songs_with_tempo: number;
  top_genres: GenreCount[];
  top_artists_by_songs: ArtistSongCount[];
}

export interface AdminMetrics {
  total_users: number;
  total_artists: number;
  total_songs: number;
  total_setlists: number;
  total_bands: number;
  songs_with_lyrics: number;
  songs_without_lyrics: number;
  active_users: number;
  inactive_users: number;
  top_genres: GenreCount[];
  users_by_role: RoleCount[];
}

export type MetricsResponse =
  ({ scope: "user" } & UserMetrics) | ({ scope: "admin" } & AdminMetrics);

export interface TimeseriesPoint {
  date: string;
  count: number;
}

export interface UserTimeseries {
  songs_created: TimeseriesPoint[];
  setlists_created: TimeseriesPoint[];
  gigs_created: TimeseriesPoint[];
}

export interface AdminTimeseries {
  users_registered: TimeseriesPoint[];
  songs_created: TimeseriesPoint[];
  setlists_created: TimeseriesPoint[];
  bands_created: TimeseriesPoint[];
}

export type TimeseriesResponse =
  ({ scope: "user" } & UserTimeseries) | ({ scope: "admin" } & AdminTimeseries);

export interface ImportBackupResponse {
  artists_imported: number;
  songs_imported: number;
  setlists_imported: number;
  gigs_imported?: number;
  tours_imported?: number;
  /**
   * Tours in the file left out because the plan doesn't include tours
   * (their gigs are imported without a tour).
   */
  skipped_tours?: number;
}

export interface BackupArtist {
  id: string;
  name: string;
}

export interface BackupSong {
  id: string;
  title: string;
  artist_id: string;
  tempo?: number | null;
  lyrics?: string | null;
  tonality?: Tonality | null;
  genre?: Genre | null;
  duration?: number | null;
}

export interface BackupSetlistSong {
  position: number;
  song_id: string;
}

export interface BackupSetlist {
  id: string;
  title: string;
  description?: string | null;
  songs: BackupSetlistSong[];
}

export interface BackupGig {
  id: string;
  venue: string;
  scheduled_at: string;
  setlist_id?: string | null;
  status: GigStatus;
  notes?: string | null;
}

export interface ImportBackupPayload {
  version: number;
  exported_at: string;
  artists: BackupArtist[];
  songs: BackupSong[];
  setlists: BackupSetlist[];
  gigs?: BackupGig[];
}

export type BandRole = "owner" | "admin" | "moderator" | "member";

export const BAND_ROLE_LEVEL: Record<BandRole, number> = {
  member: 0,
  moderator: 1,
  admin: 2,
  owner: 3,
};

export interface Band {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  /** `null` once the creator's account is deleted. */
  created_by: string | null;
  updated_by?: string | null;
  updated_by_username?: string | null;
  created_at: string;
  updated_at: string;
}

export interface BandWithMembership extends Band {
  member_count: number;
  my_role: BandRole;
  /** Whether the current user has favorited this band. */
  is_favorite: boolean;
  /** The band's repertoire setlist (see `Setlist.is_repertoire`). */
  repertoire_id?: string | null;
  /** Up votes that accept a suggestion automatically (`null` = off). */
  suggestion_auto_accept_votes?: number | null;
  /** Suggestions still open for voting. */
  open_suggestions?: number;
  /** Whether the caller pinned this band to the home page. */
  is_pinned?: boolean;
  /** What the caller may do in this band (computed by the API). */
  my_permissions: BandPermissions;
}

/** `GET /songs/{id}/setlists`: a live setlist the caller can see that contains the song. */
export interface SongSetlistRef {
  id: string;
  title: string;
  /** The band repertoire: show `setlists.repertoire.name`, not `title`. */
  is_repertoire: boolean;
  band_id: string | null;
  band_name: string | null;
  /** The song's position in that setlist. */
  position: number;
}

/** The caller's effective band permissions (`BandWithMembership.my_permissions`). */
export interface BandPermissions {
  manage_setlists: boolean;
  manage_songs: boolean;
  export_pdf: boolean;
}

export interface CreateBandPayload {
  name: string;
  description?: string;
}

/** Nullable fields: omit to keep, `null` to clear. */
export interface UpdateBandPayload {
  name?: string;
  description?: string | null;
  logo_url?: string | null;
  /** 1..100, `null` turns automatic acceptance off. */
  suggestion_auto_accept_votes?: number | null;
}

export interface BandMember {
  id: string;
  band_id: string;
  user_id: string;
  role: BandRole;
  title: string | null;
  joined_at: string;
  username: string;
  first_name: string | null;
  last_name: string | null;
}

export interface BandInvite {
  id: string;
  band_id: string;
  code: string;
  role: BandRole;
  created_by: string;
  max_uses: number | null;
  uses_count: number;
  expires_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

export interface CreateBandInvitePayload {
  role?: BandRole;
  max_uses?: number;
  expires_in_hours?: number;
}

export type BandPermission = "manage_setlists" | "manage_songs" | "export_pdf";

export const BAND_PERMISSIONS: BandPermission[] = [
  "manage_setlists",
  "manage_songs",
  "export_pdf",
];

export const CONFIGURABLE_BAND_ROLES: Extract<
  BandRole,
  "member" | "moderator"
>[] = ["member", "moderator"];

export interface BandRolePermission {
  role: BandRole;
  permission: BandPermission;
  allowed: boolean;
}

export interface BandRolePermissionEntry {
  role: BandRole;
  permission: BandPermission;
  allowed: boolean;
}

export type GigStatus = "confirmed" | "cancelled" | "completed";

export interface Gig {
  id: string;
  user_id: string;
  band_id: string | null;
  setlist_id: string | null;
  venue: string;
  location: string | null;
  scheduled_at: string;
  status: GigStatus;
  notes: string | null;
  share_token: string | null;
  share_locked_at?: string | null;
  share_lock_reason?: string | null;
  /** The tour this gig belongs to, if any (same scope as the gig). */
  tour_id?: string | null;
  tour_name?: string | null;
  /** Whether the caller pinned this gig to the home page. */
  is_pinned?: boolean;
  updated_by?: string | null;
  updated_by_username?: string | null;
  created_at: string;
  updated_at: string;
}

/** The read-only shape returned by the public (unauthenticated) gig routes. */
export interface PublicGig {
  venue: string;
  location: string | null;
  scheduled_at: string;
  status: GigStatus;
  setlist: PublicSetlist | null;
}

export interface CreateGigPayload {
  venue: string;
  location?: string;
  scheduled_at: string;
  band_id?: string | null;
  setlist_id?: string | null;
  tour_id?: string | null;
  status?: GigStatus;
  notes?: string;
}

/** Nullable fields: omit to keep, `null` to clear. */
export interface UpdateGigPayload {
  venue?: string;
  location?: string | null;
  scheduled_at?: string;
  setlist_id?: string | null;
  tour_id?: string | null;
  status?: GigStatus;
  notes?: string | null;
}

// ---------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------

export type NotificationType =
  | "band_role_changed"
  | "band_member_removed"
  | "platform_role_changed"
  | "band_member_added"
  | "share_link_revoked"
  | "announcement"
  | "release_published"
  | "band_suggestion_created"
  | "band_suggestion_resolved"
  | "moderation_action"
  | "subscription_changed"
  | "trial_ending"
  | "credits_granted"
  | "security_alert";

export interface BandRoleChangedData {
  band_id: string;
  band_name: string;
  old_role: BandRole;
  new_role: BandRole;
  actor_id: string;
}

export interface BandMemberRemovedData {
  band_id: string;
  band_name: string;
  actor_id: string;
}

export interface PlatformRoleChangedData {
  old_role: UserRole;
  new_role: UserRole;
  actor_id: string;
}

export interface BandMemberAddedData {
  band_id: string;
  band_name: string;
  role: BandRole;
  actor_id: string;
}

export interface ShareLinkRevokedData {
  kind: "setlist" | "gig";
  target_id: string;
  title: string;
  reason: string | null;
  actor_id: string;
}

export interface AnnouncementNotificationData {
  announcement_id: string;
  title: string;
  level: "info" | "success" | "warning" | "critical";
}

export interface ReleasePublishedData {
  version: string;
  release_id: string;
}

export interface BandSuggestionCreatedData {
  band_id: string;
  band_name: string;
  suggestion_id: string;
  song_title: string;
  suggested_by: string;
}

export interface BandSuggestionResolvedData {
  band_id: string;
  band_name: string;
  suggestion_id: string;
  song_title: string;
  /** `accepted`, `rejected` or `withdrawn`. */
  status: string;
}

export interface ModerationActionData {
  /** `avatar_removed`, `band_logo_removed` or `username_reset`. */
  action: string;
  note: string | null;
  band_id: string | null;
  band_name: string | null;
}

export interface SubscriptionChangedData {
  /** `plan_granted`, `extended`, `trial_started`, `trial_extended`, `revoked`, `expired`. */
  kind: string;
  plan_code: string | null;
  status: string | null;
  current_period_end: string | null;
}

export interface TrialEndingData {
  plan_code: string;
  ends_at: string;
}

export interface CreditsGrantedData {
  amount: number;
  /** `admin_adjustment`, `promo_code`, `referral_referrer`, `referral_referred`... */
  reason: string;
}

export interface SecurityAlertData {
  /** `password_changed`, `email_changed`, `two_factor_enabled`... */
  event: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  data:
    | BandRoleChangedData
    | BandMemberRemovedData
    | PlatformRoleChangedData
    | BandMemberAddedData
    | ShareLinkRevokedData
    | AnnouncementNotificationData
    | ReleasePublishedData
    | BandSuggestionCreatedData
    | BandSuggestionResolvedData
    | ModerationActionData
    | SubscriptionChangedData
    | TrialEndingData
    | CreditsGrantedData
    | SecurityAlertData;
  read_at: string | null;
  created_at: string;
}

export interface UnreadCountResponse {
  unread_count: number;
}

// ---------------------------------------------------------------------
// Quotas
// ---------------------------------------------------------------------

export type QuotaResource =
  | "songs"
  | "artists"
  | "setlists"
  | "gigs"
  | "tags"
  | "bands_owned"
  | "band_memberships"
  | "band_members"
  | "band_setlists"
  | "band_gigs"
  | "band_songs"
  | "setlist_items"
  | "tours"
  | "band_tours";

export type QuotaLimits = Record<QuotaResource, number>;
export type QuotaOverrides = Partial<Record<QuotaResource, number | null>>;

export interface QuotaUsageItem {
  resource: QuotaResource;
  /** `null` for per-band / per-setlist limits. */
  used: number | null;
  /** `null` when the account is unlimited. */
  limit: number | null;
  overridden: boolean;
}

export interface QuotaReport {
  unlimited: boolean;
  items: QuotaUsageItem[];
}

export interface UserQuotaSettings {
  overrides: QuotaOverrides;
  unlimited: boolean;
  updated_at: string | null;
  updated_by_username: string | null;
}

// ---------------------------------------------------------------------
// Staff console
// ---------------------------------------------------------------------

export interface ImpersonationResponse {
  token: string;
  expires_at: string;
  user_id: string;
  username: string;
}

export interface AdminUserBand {
  band_id: string;
  band_name: string;
  role: BandRole;
  joined_at: string;
}

export interface AdminUserOverview {
  user: User;
  usage: QuotaReport;
  quota_settings: UserQuotaSettings;
  bands: AdminUserBand[];
}

export interface AdminBandSummary {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  created_by: string | null;
  owner_id: string | null;
  owner_username: string | null;
  member_count: number;
  setlist_count: number;
  song_count: number;
  gig_count: number;
  updated_by_username: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminBandDetail {
  band: AdminBandSummary;
  members: BandMember[];
}

export interface AdminSongSummary {
  id: string;
  title: string;
  artist_id: string;
  artist_name: string;
  user_id: string;
  owner_username: string | null;
  band_id: string | null;
  band_name: string | null;
  tonality: Tonality | null;
  tempo: number | null;
  genre: Genre | null;
  duration: number | null;
  has_lyrics: boolean;
  tags: string[];
  setlist_count: number;
  updated_by_username: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminSongDetail {
  song: SetlistSong;
  summary: AdminSongSummary;
}

export interface AdminSetlistSummary {
  id: string;
  title: string;
  description: string | null;
  user_id: string;
  owner_username: string | null;
  band_id: string | null;
  band_name: string | null;
  song_count: number;
  total_duration: number;
  share_token: string | null;
  share_locked_at: string | null;
  share_lock_reason: string | null;
  updated_by_username: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminSetlistDetail {
  setlist: AdminSetlistSummary;
  items: SetlistItem[];
}

export interface SharedLink {
  kind: "setlist" | "gig";
  id: string;
  title: string;
  owner_id: string;
  owner_username: string | null;
  band_id: string | null;
  band_name: string | null;
  share_token: string | null;
  share_locked_at: string | null;
  share_lock_reason: string | null;
  share_locked_by_username: string | null;
  updated_at: string;
}

export interface AuditLogEntry {
  id: string;
  actor_id: string | null;
  actor_username: string | null;
  impersonator_id: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  target_label: string | null;
  metadata: Record<string, unknown>;
  ip_address: string | null;
  created_at: string;
}
