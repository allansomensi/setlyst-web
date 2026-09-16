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
  "Other",
] as const;

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
  user_id: string;
  band_id: string | null;
  /** The personal song this band-owned copy was forked from, if any. */
  forked_from: string | null;
  tempo?: number | null;
  lyrics?: string | null;
  tonality?: Tonality | null;
  genre?: Genre | null;
  duration?: number | null;
  created_at: string;
  updated_at: string;
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
}

export interface UpdateSongPayload {
  title?: string;
  artist_id?: string;
  tempo?: number | null;
  lyrics?: string | null;
  tonality?: Tonality | null;
  genre?: Genre | null;
  duration?: number | null;
}

export interface Setlist {
  id: string;
  title: string;
  description: string | null;
  user_id: string;
  band_id: string | null;
  share_token: string | null;
  total_duration: number;
  created_at: string;
  updated_at: string;
}

/** The read-only shape returned by the public (unauthenticated) setlist routes. */
export interface PublicSetlist {
  title: string;
  description: string | null;
  total_duration: number;
  songs: SetlistSong[];
}

export interface CreateSetlistPayload {
  title: string;
  description?: string;
  band_id?: string | null;
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
  created_at: string;
  updated_at: string;
}

export interface CreateUserPayload {
  username: string;
  password: string;
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  role?: "user" | "moderator" | "admin";
  status?: "active" | "inactive";
}

export interface UpdateUserPayload {
  username?: string;
  email?: string | null;
  password?: string;
  first_name?: string | null;
  last_name?: string | null;
  role?: "user" | "moderator" | "admin";
  status?: "active" | "inactive";
}

export type UserTheme = "light" | "dark" | "system";

export interface UserPreferences {
  id: string;
  user_id: string;
  language: string;
  theme: UserTheme;
  live_mode_font_size: number;
  created_at: string;
  updated_at: string;
}

export interface UpdatePreferencesPayload {
  language?: string;
  theme?: UserTheme;
  live_mode_font_size?: number;
}

export interface DatabaseStatus {
  version: string;
  max_connections: number;
  opened_connections: number;
}

export interface DependenciesStatus {
  database: DatabaseStatus;
}

export interface ApiStatus {
  updated_at: string;
  dependencies: DependenciesStatus;
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
  | ({ scope: "user" } & UserMetrics)
  | ({ scope: "admin" } & AdminMetrics);

export interface ImportBackupResponse {
  artists_imported: number;
  songs_imported: number;
  setlists_imported: number;
  gigs_imported?: number;
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
  members_can_manage_setlists: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface BandWithMembership extends Band {
  member_count: number;
  my_role: BandRole;
}

export interface CreateBandPayload {
  name: string;
  description?: string;
}

export interface UpdateBandPayload {
  name?: string;
  description?: string;
  logo_url?: string | null;
  members_can_manage_setlists?: boolean;
}

export interface BandMember {
  id: string;
  band_id: string;
  user_id: string;
  role: BandRole;
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

export type GigStatus = "confirmed" | "cancelled" | "completed";

export interface Gig {
  id: string;
  user_id: string;
  band_id: string | null;
  setlist_id: string | null;
  venue: string;
  scheduled_at: string;
  status: GigStatus;
  notes: string | null;
  share_token: string | null;
  created_at: string;
  updated_at: string;
}

/** The read-only shape returned by the public (unauthenticated) gig routes. */
export interface PublicGig {
  venue: string;
  scheduled_at: string;
  status: GigStatus;
  setlist: PublicSetlist | null;
}

export interface CreateGigPayload {
  venue: string;
  scheduled_at: string;
  band_id?: string | null;
  setlist_id?: string | null;
  status?: GigStatus;
  notes?: string;
}

export interface UpdateGigPayload {
  venue?: string;
  scheduled_at?: string;
  setlist_id?: string;
  status?: GigStatus;
  notes?: string;
}
