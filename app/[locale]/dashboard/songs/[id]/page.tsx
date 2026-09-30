import { notFound } from "next/navigation";
import { isUuid } from "@/lib/uuid";
import { getTranslations } from "next-intl/server";
import { staticTitle } from "@/lib/page-metadata";
import {
  ApiError,
  fetchAllServerPages,
  fetchServerApi,
} from "@/lib/api-server";
import { getEntitlements, hasFeature } from "@/lib/entitlements";
import { canExportBandPdf, canManageBandSongs } from "@/lib/band-permissions";
import {
  Artist,
  BandCopyStatus,
  BandWithMembership,
  Song,
  SongAnalysis,
  SongSetlistRef,
  SongVersion,
} from "@/types/api";
import { degreeIsSet, normalizeAnalysis } from "@/lib/music/analysis";
import { PageBreadcrumbs } from "@/components/page-breadcrumbs";
import { fetchServerApiOnce } from "@/lib/server-data";
import { SongDetail } from "./_components/song-detail";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // Route params are attacker-chosen and reach API paths: anything but a
  // UUID (`<id>?per_page=…`, `<id>#`) is not a page of this app.
  if (!isUuid(id)) notFound();
  try {
    const song = await fetchServerApiOnce<Song>(`/songs/${id}`);
    return { title: song.title };
  } catch {
    return staticTitle("songs");
  }
}

/** Personal artists, for the edit dialog's picker (band songs keep theirs). */
async function editableArtists(song: Song): Promise<Artist[]> {
  if (song.band_id) {
    return song.artist_name
      ? [
          {
            id: song.artist_id,
            name: song.artist_name,
            user_id: song.user_id,
            band_id: song.band_id,
            created_at: song.created_at,
            updated_at: song.updated_at,
          },
        ]
      : [];
  }
  return fetchAllServerPages<Artist>("/artists")
    .then((res) => res.data ?? [])
    .catch(() => [] as Artist[]);
}

export default async function SongDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // Route params are attacker-chosen and reach API paths: anything but a
  // UUID (`<id>?per_page=…`, `<id>#`) is not a page of this app.
  if (!isUuid(id)) notFound();
  const tNav = await getTranslations("nav");

  // Everything keyed only on the id starts alongside the song itself
  // rather than after it. Each one tolerates failure, so a song that turns
  // out missing leaves nothing unhandled behind.
  const setlistsPromise = fetchServerApi<SongSetlistRef[]>(
    `/songs/${id}/setlists`,
  ).catch(() => null);
  // Only a secondary panel: the page works without it.
  const bandCopiesPromise = fetchServerApi<BandCopyStatus[]>(
    `/songs/${id}/band-copies`,
  ).catch(() => [] as BandCopyStatus[]);
  const versionsPromise = fetchServerApi<SongVersion[]>(
    `/songs/${id}/versions`,
  ).catch(() => null);
  // Only a secondary card too.
  const analysisPromise = fetchServerApi<SongAnalysis | null>(
    `/songs/${id}/analysis`,
  ).catch(() => null);
  const entitlementsPromise = getEntitlements();

  let song: Song;
  try {
    song = await fetchServerApiOnce<Song>(`/songs/${id}`);
  } catch (error) {
    if (
      error instanceof ApiError &&
      (error.status === 404 || error.status === 403 || error.status === 400)
    ) {
      notFound();
    }
    throw error;
  }

  const [
    entitlements,
    band,
    setlists,
    artists,
    bandCopies,
    versions,
    analysis,
  ] = await Promise.all([
    entitlementsPromise,
    song.band_id
      ? fetchServerApi<BandWithMembership>(`/bands/${song.band_id}`).catch(
          () => null,
        )
      : Promise.resolve(null),
    setlistsPromise,
    editableArtists(song),
    bandCopiesPromise,
    versionsPromise,
    analysisPromise,
  ]);

  // What the analysis card shows: how far along it is, not the document.
  const analysisSummary = analysis
    ? (() => {
        const content = normalizeAnalysis(analysis.content);
        return {
          updatedAt: analysis.updated_at,
          updatedBy: analysis.updated_by_username,
          degrees: Object.values(content.entries).filter((entry) =>
            degreeIsSet(entry.degree),
          ).length,
          lines: content.connections.length,
          notes:
            content.notes.length +
            Object.values(content.entries).filter((entry) => entry.note.trim())
              .length,
        };
      })()
    : null;

  const canEdit = !song.band_id || (band ? canManageBandSongs(band) : false);
  const canExport = !song.band_id || (band ? canExportBandPdf(band) : false);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 pb-10">
      <PageBreadcrumbs
        items={[
          { label: tNav("songs"), href: "/dashboard/songs" },
          { label: song.title },
        ]}
      />
      <SongDetail
        song={song}
        artistName={song.artist_name ?? null}
        artists={artists}
        band={band ? { id: band.id, name: band.name } : null}
        setlists={setlists}
        bandCopies={bandCopies}
        versions={versions}
        analysis={analysisSummary}
        canEdit={canEdit}
        canExport={canExport}
        canUseAdvancedPdf={hasFeature(entitlements, "advanced_pdf")}
        pdfInPlan={hasFeature(entitlements, "pdf_export")}
      />
    </div>
  );
}
