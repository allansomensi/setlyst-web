import { fetchServerApi } from "@/lib/api-server";
import { PaginatedResponse, Setlist, Song, Artist } from "@/types/api";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Clock } from "lucide-react";
import { SetlistSongsManager } from "./_components/setlists-songs-manager";
import { SetlistActions } from "./_components/setlist-actions";
import { getTranslations } from "next-intl/server";
import { formatDuration } from "@/lib/utils";

export default async function SetlistDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations("setlists");

  const [setlist, setlistSongsRes, allSongsRes, allArtistsRes] =
    await Promise.all([
      fetchServerApi<Setlist>(`/setlists/${id}`),
      fetchServerApi<PaginatedResponse<Song>>(
        `/setlists/${id}/songs?page=1&per_page=100`,
      ),
      fetchServerApi<PaginatedResponse<Song>>("/songs?page=1&per_page=100"),
      fetchServerApi<PaginatedResponse<Artist>>("/artists?page=1&per_page=100"),
    ]);

  const setlistSongs = setlistSongsRes.data || [];
  const allSongs = allSongsRes.data || [];
  const allArtists = allArtistsRes.data || [];

  return (
    <div className="w-full space-y-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/dashboard/setlists">
              <ChevronLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {setlist.title}
            </h1>
            {setlist.description && (
              <p className="text-muted-foreground">{setlist.description}</p>
            )}
            <div className="text-muted-foreground bg-muted/50 mt-2 flex w-fit items-center gap-1.5 rounded-md border px-2.5 py-1 text-sm font-medium">
              <Clock className="text-primary h-4 w-4" />
              <span>
                {t("totalDuration")}: {formatDuration(setlist.total_duration)}
              </span>
            </div>
          </div>
        </div>

        <SetlistActions setlistId={setlist.id} setlistTitle={setlist.title} />
      </div>

      <SetlistSongsManager
        setlistId={setlist.id}
        setlistSongs={setlistSongs}
        allSongs={allSongs}
        artists={allArtists}
      />
    </div>
  );
}
