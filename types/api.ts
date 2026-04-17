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
  created_at: string;
  updated_at: string;
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
  role: "user" | "moderator" | "admin";
  status: "active" | "inactive";
  created_at: string;
  updated_at: string;
}

export interface UpdateUserPayload {
  username?: string;
  email?: string | null;
  password?: string;
  first_name?: string | null;
  last_name?: string | null;
}
