import { staticTitle } from "@/lib/page-metadata";
import { fetchAllServerPages, fetchServerApi } from "@/lib/api-server";
import { Song, Artist, QuotaReport } from "@/types/api";
import { SongsTable } from "./_components/songs-table";
import { fetchOrFailed, FETCH_FAILED } from "@/lib/fetch-or-failed";
import { getEntitlements, hasFeature } from "@/lib/entitlements";

export async function generateMetadata() {
  return staticTitle("songs");
}

export default async function SongsPage() {
  // Independent sources — one failing (a transient rate limit, timeout)
  // shouldn't take the whole page down when the other loaded fine.
  // `hadError` is what tells SongsTable an empty `songs` array means "this
  // fetch failed," not "you have no songs" — see LoadErrorNotice.
  const [songsRes, artistsRes, entitlements, quotas] = await Promise.all([
    fetchOrFailed(fetchAllServerPages<Song>("/songs")),
    fetchOrFailed(fetchAllServerPages<Artist>("/artists")),
    getEntitlements(),
    // Only for the "123 / 150" chip next to "Add song": never fatal.
    fetchServerApi<QuotaReport>("/users/me/quotas").catch(() => null),
  ]);

  const hadError = songsRes === FETCH_FAILED || artistsRes === FETCH_FAILED;
  const songs = songsRes === FETCH_FAILED ? [] : (songsRes?.data ?? []);
  const artists = artistsRes === FETCH_FAILED ? [] : (artistsRes?.data ?? []);

  return (
    <div className="w-full space-y-4">
      <SongsTable
        initialSongs={songs}
        artists={artists}
        loadError={hadError}
        quotas={quotas}
        features={{
          chordproImport: hasFeature(entitlements, "chordpro_import"),
          advancedPdf: hasFeature(entitlements, "advanced_pdf"),
          pdfExport: hasFeature(entitlements, "pdf_export"),
        }}
      />
    </div>
  );
}
