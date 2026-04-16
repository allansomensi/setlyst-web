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
