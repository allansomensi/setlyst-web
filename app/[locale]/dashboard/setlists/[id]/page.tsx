import { fetchServerApi } from "@/lib/api-server";
import {
  PaginatedResponse,
  Setlist,
  Song,
  SetlistSong,
  SetlistItem,
  Artist,
} from "@/types/api";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Clock } from "lucide-react";
import { SetlistSongsManager } from "./_components/setlists-songs-manager";
import { SetlistActions } from "./_components/setlist-actions";
import { SetlistOfflineStatus } from "./_components/setlist-offline-status";
import { getTranslations } from "next-intl/server";
import { PageBreadcrumbs } from "@/components/page-breadcrumbs";
import { formatDuration } from "@/lib/utils";

export default async function SetlistDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations("setlists");
  const tNav = await getTranslations("nav");

  const [setlist, setlistSongsRes, setlistItems, allSongsRes, allArtistsRes] =
    await Promise.all([
      fetchServerApi<Setlist>(`/setlists/${id}`),
      fetchServerApi<PaginatedResponse<SetlistSong>>(
        `/setlists/${id}/songs?page=1&per_page=100`,
      ),
      fetchServerApi<SetlistItem[]>(`/setlists/${id}/items`),
      fetchServerApi<PaginatedResponse<Song>>("/songs?page=1&per_page=100"),
      fetchServerApi<PaginatedResponse<Artist>>("/artists?page=1&per_page=100"),
    ]);

  const setlistSongs = setlistSongsRes.data || [];
  const allSongs = allSongsRes.data || [];
  const allArtists = allArtistsRes.data || [];

  return (
    <div className="w-full space-y-6">
      <PageBreadcrumbs
        items={[
          { label: tNav("setlists"), href: "/dashboard/setlists" },
          { label: setlist.title },
        ]}
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3 sm:items-center sm:gap-4">
          <Button variant="outline" size="icon" asChild className="shrink-0">
            <Link href="/dashboard/setlists">
              <ChevronLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight break-words sm:text-3xl">
              {setlist.title}
            </h1>
            {setlist.description && (
              <p className="text-muted-foreground">{setlist.description}</p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <div className="text-muted-foreground bg-muted/50 flex w-fit items-center gap-1.5 rounded-md border px-2.5 py-1 text-sm font-medium">
                <Clock className="text-primary h-4 w-4" />
                <span>
                  {t("totalDuration")}: {formatDuration(setlist.total_duration)}
                </span>
              </div>
              <SetlistOfflineStatus setlistId={setlist.id} />
            </div>
          </div>
        </div>

        <SetlistActions
          setlistId={setlist.id}
          setlistTitle={setlist.title}
          shareToken={setlist.share_token}
        />
      </div>

      <SetlistSongsManager
        setlistId={setlist.id}
        setlist={setlist}
        setlistSongs={setlistSongs}
        setlistItems={setlistItems}
        allSongs={allSongs}
        artists={allArtists}
      />
    </div>
  );
}
