import { AuditStamp } from "@/components/audit-stamp";
import { entityTitle } from "@/lib/page-metadata";
import { notFound } from "next/navigation";
import {
  ApiError,
  fetchAllServerPages,
  fetchServerApi,
} from "@/lib/api-server";
import { Setlist, Song, SetlistSong, SetlistItem, Artist } from "@/types/api";
import { Link } from "@/components/nav-link";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Clock, Music } from "lucide-react";
import { SetlistSongsManager } from "./_components/setlists-songs-manager";
import { SetlistActions } from "./_components/setlist-actions";
import { SetlistOfflineStatus } from "./_components/setlist-offline-status";
import { getTranslations } from "next-intl/server";
import { PageBreadcrumbs } from "@/components/page-breadcrumbs";
import { formatDuration } from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return entityTitle<Setlist>(
    `/setlists/${id}`,
    (s) => s.title,
    "setlist",
    "setlists",
  );
}

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
      fetchAllServerPages<SetlistSong>(`/setlists/${id}/songs`),
      fetchServerApi<SetlistItem[]>(`/setlists/${id}/items`),
      fetchAllServerPages<Song>("/songs"),
      fetchAllServerPages<Artist>("/artists"),
    ]).catch((error) => {
      // A deleted setlist, or one the person can't see (anymore), is a
      // "not found" — not an unexpected error screen.
      if (
        error instanceof ApiError &&
        (error.status === 404 || error.status === 403 || error.status === 400)
      ) {
        notFound();
      }
      throw error;
    });

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
              <p className="text-muted-foreground mt-0.5">
                {setlist.description}
              </p>
            )}
            <AuditStamp
              updatedAt={setlist.updated_at}
              updatedBy={setlist.updated_by_username}
              className="mt-1"
            />
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <div className="text-muted-foreground bg-muted/50 flex w-fit items-center gap-1.5 rounded-md border px-2.5 py-1 text-sm font-medium">
                <Clock className="text-primary h-4 w-4" />
                <span>
                  {t("totalDuration")}:{" "}
                  <span className="text-foreground font-mono tabular-nums">
                    {formatDuration(setlist.total_duration)}
                  </span>
                </span>
              </div>
              <div className="text-muted-foreground bg-muted/50 flex w-fit items-center gap-1.5 rounded-md border px-2.5 py-1 text-sm font-medium">
                <Music className="text-primary h-4 w-4" />
                <span>{t("songCount", { count: setlistSongs.length })}</span>
              </div>
              <SetlistOfflineStatus setlistId={setlist.id} />
            </div>
          </div>
        </div>

        <SetlistActions
          setlistId={setlist.id}
          setlistTitle={setlist.title}
          shareToken={setlist.share_token}
          shareLock={
            setlist.share_locked_at
              ? { reason: setlist.share_lock_reason ?? null }
              : null
          }
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
