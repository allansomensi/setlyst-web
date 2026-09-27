import { entityTitle } from "@/lib/page-metadata";
import { notFound } from "next/navigation";
import { isUuid } from "@/lib/uuid";
import { fetchAllServerPages, fetchServerApi } from "@/lib/api-server";
import { BandWithMembership, Setlist, SetlistSong } from "@/types/api";
import { canManageBandSetlists } from "@/lib/band-permissions";
import { notFoundOnMissing } from "@/lib/api-not-found";
import { LiveModeViewer } from "./_components/live-mode-viewer";
import { fetchServerApiOnce, getMyPreferences } from "@/lib/server-data";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // Route params are attacker-chosen and reach API paths: anything but a
  // UUID (`<id>?per_page=…`, `<id>#`) is not a page of this app.
  if (!isUuid(id)) notFound();
  return entityTitle<Setlist>(
    `/setlists/${id}`,
    (s) => s.title,
    "liveSetlist",
    "setlists",
  );
}

export default async function SetlistLivePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { id } = await params;
  // Route params are attacker-chosen and reach API paths: anything but a
  // UUID (`<id>?per_page=…`, `<id>#`) is not a page of this app.
  if (!isUuid(id)) notFound();
  const resolvedSearchParams = await searchParams;

  const songId =
    typeof resolvedSearchParams.songId === "string"
      ? resolvedSearchParams.songId
      : undefined;

  // All three reads are independent. The preferences only seed the text
  // size, so they must never take Live Mode down; a deleted or foreign
  // setlist is a 404, not the generic error screen.
  const [setlist, setlistSongsRes, preferences] = await Promise.all([
    fetchServerApiOnce<Setlist>(`/setlists/${id}`),
    fetchAllServerPages<SetlistSong>(`/setlists/${id}/songs`),
    getMyPreferences().catch(() => null),
  ]).catch(notFoundOnMissing);

  const setlistSongs = setlistSongsRes.data || [];

  // Whether a key changed here can be saved to the setlist (the API
  // refuses it otherwise; this only avoids offering it).
  const band = setlist.band_id
    ? await fetchServerApi<BandWithMembership>(
        `/bands/${setlist.band_id}`,
      ).catch(() => null)
    : null;
  const canSaveKeys =
    !setlist.band_id || (!!band && canManageBandSetlists(band));

  return (
    <LiveModeViewer
      setlist={setlist}
      songs={setlistSongs}
      canSaveKeys={canSaveKeys}
      initialSongId={songId}
      initialFontSize={preferences?.live_mode_font_size}
    />
  );
}
