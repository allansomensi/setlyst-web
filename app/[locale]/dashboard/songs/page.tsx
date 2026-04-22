import { fetchServerApi } from "@/lib/api-server";
import { PaginatedResponse, Song, Artist } from "@/types/api";
import { SongsTable } from "./_components/songs-table";

export default async function SongsPage() {
  const [songsRes, artistsRes] = await Promise.all([
    fetchServerApi<PaginatedResponse<Song>>("/songs?page=1&per_page=100"),
    fetchServerApi<PaginatedResponse<Artist>>("/artists?page=1&per_page=100"),
  ]);

  const songs = songsRes.data || [];
  const artists = artistsRes.data || [];

  return (
    <div className="w-full space-y-4">
      <SongsTable initialSongs={songs} artists={artists} />
    </div>
  );
}
