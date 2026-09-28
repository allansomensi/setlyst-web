import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { isUuid } from "@/lib/uuid";
import { entityTitle } from "@/lib/page-metadata";
import { ApiError, fetchServerApi } from "@/lib/api-server";
import { canManageBandSongs } from "@/lib/band-permissions";
import type { BandWithMembership, Song, SongAnalysis } from "@/types/api";
import { PageBreadcrumbs } from "@/components/page-breadcrumbs";
import { AnalysisEditor } from "./_components/analysis-editor";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // Route params are attacker-chosen and reach API paths: anything but a
  // UUID (`<id>?per_page=…`, `<id>#`) is not a page of this app.
  if (!isUuid(id)) notFound();
  return entityTitle<Song>(
    `/songs/${id}`,
    (s) => s.title,
    "harmonicAnalysis",
    "songs",
  );
}

export default async function SongAnalysisPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const tNav = await getTranslations("nav");
  const t = await getTranslations("analysis");

  let song: Song;
  try {
    song = await fetchServerApi<Song>(`/songs/${id}`);
  } catch (error) {
    if (
      error instanceof ApiError &&
      (error.status === 404 || error.status === 403 || error.status === 400)
    ) {
      notFound();
    }
    throw error;
  }

  const [analysis, band] = await Promise.all([
    fetchServerApi<SongAnalysis | null>(`/songs/${id}/analysis`),
    song.band_id
      ? fetchServerApi<BandWithMembership>(`/bands/${song.band_id}`).catch(
          () => null,
        )
      : Promise.resolve(null),
  ]);

  const canEdit = !song.band_id || (band ? canManageBandSongs(band) : false);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5">
      <PageBreadcrumbs
        items={[
          { label: tNav("songs"), href: "/dashboard/songs" },
          { label: song.title, href: `/dashboard/songs/${song.id}` },
          { label: t("title") },
        ]}
      />
      <AnalysisEditor
        // A fresh document from the server (another tab saved, a reload
        // after a conflict) starts the editor over.
        key={analysis?.updated_at ?? "new"}
        song={song}
        initial={analysis}
        canEdit={canEdit}
      />
    </div>
  );
}
