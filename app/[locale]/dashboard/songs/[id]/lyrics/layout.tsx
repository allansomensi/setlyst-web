import { entityTitle } from "@/lib/page-metadata";
import { notFound } from "next/navigation";
import { isUuid } from "@/lib/uuid";
import type { Song } from "@/types/api";

// The editor page is a Client Component, so its tab title lives here.
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
