import { staticTitle } from "@/lib/page-metadata";
import { fetchAllServerPages, fetchServerApi } from "@/lib/api-server";
import { Artist, QuotaReport } from "@/types/api";
import { ArtistsTable } from "./_components/artists-table";

export async function generateMetadata() {
  return staticTitle("artists");
}

export default async function ArtistsPage() {
  const [response, quotas] = await Promise.all([
    fetchAllServerPages<Artist>("/artists"),
    // Only for the usage chip next to "New artist": never fatal.
    fetchServerApi<QuotaReport>("/users/me/quotas").catch(() => null),
  ]);

  const artists = response.data || [];

  return (
    <div className="w-full space-y-4">
      <ArtistsTable initialArtists={artists} quotas={quotas} />
    </div>
  );
}
