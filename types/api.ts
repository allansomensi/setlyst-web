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
  tempo?: number | null;
  lyrics?: string | null;
  tonality?: Tonality | null;
  genre?: Genre | null;
  duration?: number | null;
  created_at: string;
  updated_at: string;
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
  created_at: string;
  updated_at: string;
}

export interface CreateSetlistPayload {
  title: string;
  description?: string;
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

export interface UpdateUserPayload {
  username: string;
  email?: string | null;
  password?: string;
  first_name?: string | null;
  last_name?: string | null;
  role: UserRole;
  status: UserStatus;
}
