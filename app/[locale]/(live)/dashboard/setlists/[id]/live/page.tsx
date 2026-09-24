import { entityTitle } from "@/lib/page-metadata";
import { fetchServerApi, fetchAllServerPages } from "@/lib/api-server";
import { Setlist, SetlistSong, UserPreferences } from "@/types/api";
import { notFoundOnMissing } from "@/lib/api-not-found";
import { LiveModeViewer } from "./_components/live-mode-viewer";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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
  const resolvedSearchParams = await searchParams;

  const songId =
    typeof resolvedSearchParams.songId === "string"
      ? resolvedSearchParams.songId
      : undefined;

  // All three reads are independent. The preferences only seed the text
  // size, so they must never take Live Mode down; a deleted or foreign
  // setlist is a 404, not the generic error screen.
  const [setlist, setlistSongsRes, preferences] = await Promise.all([
    fetchServerApi<Setlist>(`/setlists/${id}`),
    fetchAllServerPages<SetlistSong>(`/setlists/${id}/songs`),
    fetchServerApi<UserPreferences>("/users/me/preferences", {
      cache: "no-store",
    }).catch(() => null),
  ]).catch(notFoundOnMissing);

  const setlistSongs = setlistSongsRes.data || [];

  return (
    <LiveModeViewer
      setlist={setlist}
      songs={setlistSongs}
      initialSongId={songId}
      initialFontSize={preferences?.live_mode_font_size}
    />
  );
}
