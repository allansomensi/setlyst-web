import { fetchAllServerPages } from "@/lib/api-server";
import { Artist } from "@/types/api";
import { ArtistsTable } from "./_components/artists-table";

export default async function ArtistsPage() {
  const response = await fetchAllServerPages<Artist>("/artists");

  const artists = response.data || [];

  return (
    <div className="w-full space-y-4">
      <ArtistsTable initialArtists={artists} />
    </div>
  );
}
