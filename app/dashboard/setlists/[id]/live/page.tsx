import { fetchServerApi } from "@/lib/api-server";
import { PaginatedResponse, Setlist, Song } from "@/types/api";
import { LiveModeViewer } from "./_components/live-mode-viewer";

export default async function SetlistLivePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [setlist, setlistSongsRes] = await Promise.all([
    fetchServerApi<Setlist>(`/setlists/${id}`),
    fetchServerApi<PaginatedResponse<Song>>(
      `/setlists/${id}/songs?page=1&per_page=100`,
    ),
  ]);

  const setlistSongs = setlistSongsRes.data || [];

  return <LiveModeViewer setlist={setlist} songs={setlistSongs} />;
}
