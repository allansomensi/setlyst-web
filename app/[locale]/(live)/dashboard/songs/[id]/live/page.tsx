import { entityTitle } from "@/lib/page-metadata";
import { notFound } from "next/navigation";
import { isUuid } from "@/lib/uuid";
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
  // Route params are attacker-chosen and reach API paths: anything but a
  // UUID (`<id>?per_page=…`, `<id>#`) is not a page of this app.
  if (!isUuid(id)) notFound();
  return entityTitle<Song>(`/songs/${id}`, (s) => s.title, "liveSong", "songs");
}

export default async function SongLivePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // Route params are attacker-chosen and reach API paths: anything but a
  // UUID (`<id>?per_page=…`, `<id>#`) is not a page of this app.
  if (!isUuid(id)) notFound();

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
