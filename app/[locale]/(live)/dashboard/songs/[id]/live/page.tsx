import { entityTitle } from "@/lib/page-metadata";
import { fetchServerApi } from "@/lib/api-server";
import { Song, UserPreferences } from "@/types/api";
import { notFoundOnMissing } from "@/lib/api-not-found";
import { SongLiveModeViewer } from "./_components/song-live-mode-viewer";

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
    fetchServerApi<Song>(`/songs/${id}`),
    fetchServerApi<UserPreferences>("/users/me/preferences", {
      cache: "no-store",
    }).catch(() => null),
  ]).catch(notFoundOnMissing);

  return (
    <SongLiveModeViewer
      song={song}
      initialFontSize={preferences?.live_mode_font_size}
    />
  );
}
