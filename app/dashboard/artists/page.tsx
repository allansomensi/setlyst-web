import { fetchServerApi } from "@/lib/api-server";
import { PaginatedResponse, Artist } from "@/types/api";
import { ArtistsTable } from "./_components/artists-table";

export default async function ArtistsPage() {
  const response = await fetchServerApi<PaginatedResponse<Artist>>(
    "/artists?page=1&per_page=100",
  );

  const artists = response.data || [];

  return (
    <div className="w-full space-y-4">
      <ArtistsTable initialArtists={artists} />
    </div>
  );
}
