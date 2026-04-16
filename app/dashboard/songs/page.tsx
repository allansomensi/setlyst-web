import { fetchServerApi } from "@/lib/api-server";
import { PaginatedResponse, Song, Artist } from "@/types/api";
import { SongsTable } from "./_components/songs-table";
import { PaginationControl } from "@/components/ui/pagination-control";

export default async function SongsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const currentPage = Number(params?.page) || 1;
  const perPage = 10;

  const [songsRes, artistsRes] = await Promise.all([
    fetchServerApi<PaginatedResponse<Song>>(
      `/songs?page=${currentPage}&per_page=${perPage}`,
    ),
    fetchServerApi<PaginatedResponse<Artist>>("/artists?page=1&per_page=100"),
  ]);

  const songs = songsRes.data || [];
  const meta = songsRes.meta;
  const artists = artistsRes.data || [];

  return (
    <div className="w-full space-y-4">
      <SongsTable initialSongs={songs} artists={artists} />
      {meta && meta.total_pages > 1 && (
        <PaginationControl
          currentPage={meta.current_page}
          totalPages={meta.total_pages}
        />
      )}
    </div>
  );
}
