import { fetchServerApi, fetchAllServerPages } from "@/lib/api-server";
import { Setlist, SetlistSong, UserPreferences } from "@/types/api";
import { LiveModeViewer } from "./_components/live-mode-viewer";

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

  const [setlist, setlistSongsRes] = await Promise.all([
    fetchServerApi<Setlist>(`/setlists/${id}`),
    fetchAllServerPages<SetlistSong>(`/setlists/${id}/songs`),
  ]);

  const setlistSongs = setlistSongsRes.data || [];

  const preferences = await fetchServerApi<UserPreferences>(
    "/users/me/preferences",
    { cache: "no-store" },
  );

  return (
    <LiveModeViewer
      setlist={setlist}
      songs={setlistSongs}
      initialSongId={songId}
      initialFontSize={preferences.live_mode_font_size}
    />
  );
}
