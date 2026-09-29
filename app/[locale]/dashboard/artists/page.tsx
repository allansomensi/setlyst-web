import { staticTitle } from "@/lib/page-metadata";
import { fetchAllServerPages, fetchServerApi } from "@/lib/api-server";
import { Artist, QuotaReport } from "@/types/api";
import { ArtistsTable } from "./_components/artists-table";
import { fetchOrFailed, FETCH_FAILED } from "@/lib/fetch-or-failed";

export async function generateMetadata() {
  return staticTitle("artists");
}

export default async function ArtistsPage() {
  const [response, quotas] = await Promise.all([
    fetchOrFailed(fetchAllServerPages<Artist>("/artists")),
    // Only for the usage chip next to "New artist": never fatal.
    fetchServerApi<QuotaReport>("/users/me/quotas").catch(() => null),
  ]);

  // A failed fetch shows a retrying notice instead of the "no artists
  // yet" empty state — see LoadErrorNotice.
  const hadError = response === FETCH_FAILED;
  const artists = hadError ? [] : (response?.data ?? []);

  return (
    <div className="w-full space-y-4">
      <ArtistsTable
        initialArtists={artists}
        loadError={hadError}
        quotas={quotas}
      />
    </div>
  );
}
