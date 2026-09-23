import { entityTitle } from "@/lib/page-metadata";
import type { Song } from "@/types/api";

// The editor page is a Client Component, so its tab title lives here.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return entityTitle<Song>(
    `/songs/${id}`,
    (s) => s.title,
    "editLyrics",
    "songs",
  );
}

export default function LyricsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
