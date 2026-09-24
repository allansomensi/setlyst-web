import { entityTitle } from "@/lib/page-metadata";
import { Song } from "@/types/api";
import { notFoundOnMissing } from "@/lib/api-not-found";
import { SongLiveModeViewer } from "./_components/song-live-mode-viewer";
import { fetchServerApiOnce, getMyPreferences } from "@/lib/server-data";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return entityTitle<Song>(`/songs/${id}`, (s) => s.title, "liveSong", "songs");
}

export default async function SongLivePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [song, preferences] = await Promise.all([
    fetchServerApiOnce<Song>(`/songs/${id}`),
    getMyPreferences().catch(() => null),
  ]).catch(notFoundOnMissing);

  return (
    <SongLiveModeViewer
      song={song}
      initialFontSize={preferences?.live_mode_font_size}
    />
  );
}
