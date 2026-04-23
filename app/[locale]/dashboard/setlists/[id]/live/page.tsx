import { fetchServerApi } from "@/lib/api-server";
import { PaginatedResponse, Setlist, Song, UserPreferences } from "@/types/api";
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
    fetchServerApi<PaginatedResponse<Song>>(
      `/setlists/${id}/songs?page=1&per_page=100`,
    ),
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
