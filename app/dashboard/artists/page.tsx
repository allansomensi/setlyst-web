import { fetchServerApi } from "@/lib/api-server";
import { PaginatedResponse, Artist } from "@/types/api";
import { ArtistsTable } from "./_components/artists-table";
import { PaginationControl } from "@/components/ui/pagination-control";

export default async function ArtistsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const currentPage = Number(params?.page) || 1;
  const perPage = 10;

  const response = await fetchServerApi<PaginatedResponse<Artist>>(
    `/artists?page=${currentPage}&per_page=${perPage}`,
  );

  const artists = response.data || [];
  const meta = response.meta;

  return (
    <div className="w-full space-y-4">
      <ArtistsTable initialArtists={artists} />
      {meta && meta.total_pages > 1 && (
        <PaginationControl
          currentPage={meta.current_page}
          totalPages={meta.total_pages}
        />
      )}
    </div>
  );
}
