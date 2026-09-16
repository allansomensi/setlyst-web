import { fetchServerApi } from "@/lib/api-server";
import {
  PaginatedResponse,
  Gig,
  Setlist,
  Song,
  SetlistSong,
  SetlistItem,
  Artist,
  BandWithMembership,
  BAND_ROLE_LEVEL,
} from "@/types/api";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, Calendar, StickyNote, Guitar } from "lucide-react";
import { SetlistSongsManager } from "../../setlists/[id]/_components/setlists-songs-manager";
import { GigActions } from "./_components/gig-actions";
import { LinkSetlistPrompt } from "./_components/link-setlist-prompt";
import { BandOption } from "../_components/gigs-dialog";
import { getTranslations, getLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { ApiError } from "@/lib/api-server";

const STATUS_VARIANT: Record<
  Gig["status"],
  "default" | "destructive" | "secondary"
> = {
  confirmed: "default",
  cancelled: "destructive",
  completed: "secondary",
};

export default async function GigDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations("gigs");
  const locale = await getLocale();

  let gig: Gig;
  try {
    gig = await fetchServerApi<Gig>(`/gigs/${id}`);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  const [personalSetlistsRes, bands] = await Promise.all([
    fetchServerApi<PaginatedResponse<Setlist>>("/setlists?page=1&per_page=100"),
    fetchServerApi<BandWithMembership[]>("/bands"),
  ]);
  const personalSetlists = personalSetlistsRes.data || [];

  const bandsById: Record<string, { name: string; canManage: boolean }> = {};
  for (const band of bands) {
    const canManage =
      BAND_ROLE_LEVEL[band.my_role] >= BAND_ROLE_LEVEL.moderator ||
      (band.my_role === "member" && band.members_can_manage_setlists);
    bandsById[band.id] = { name: band.name, canManage };
  }

  const bandInfo = gig.band_id ? bandsById[gig.band_id] : undefined;
  const canManage = !gig.band_id || bandInfo?.canManage === true;

  const bandSetlistsResults = await Promise.all(
    bands
      .filter((band) => bandsById[band.id]?.canManage)
      .map((band) =>
        fetchServerApi<PaginatedResponse<Setlist>>(
          `/bands/${band.id}/setlists?page=1&per_page=100`,
        ).then((res) => ({ id: band.id, name: band.name, res })),
      ),
  );
  const manageableBands: BandOption[] = bandSetlistsResults.map((b) => ({
    id: b.id,
    name: b.name,
    setlists: b.res.data || [],
  }));

  let setlist: Setlist | null = null;
  let setlistSongs: SetlistSong[] = [];
  let setlistItems: SetlistItem[] = [];
  let allSongs: Song[] = [];
  let allArtists: Artist[] = [];

  if (gig.setlist_id) {
    const [
      setlistRes,
      setlistSongsRes,
      setlistItemsRes,
      allSongsRes,
      allArtistsRes,
    ] = await Promise.all([
      fetchServerApi<Setlist>(`/setlists/${gig.setlist_id}`),
      fetchServerApi<PaginatedResponse<SetlistSong>>(
        `/setlists/${gig.setlist_id}/songs?page=1&per_page=100`,
      ),
      fetchServerApi<SetlistItem[]>(`/setlists/${gig.setlist_id}/items`),
      fetchServerApi<PaginatedResponse<Song>>("/songs?page=1&per_page=100"),
      fetchServerApi<PaginatedResponse<Artist>>("/artists?page=1&per_page=100"),
    ]);
    setlist = setlistRes;
    setlistSongs = setlistSongsRes.data || [];
    setlistItems = setlistItemsRes || [];
    allSongs = allSongsRes.data || [];
    allArtists = allArtistsRes.data || [];
  }

  return (
    <div className="w-full space-y-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/dashboard/gigs">
              <ChevronLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight">{gig.venue}</h1>
              <Badge variant={STATUS_VARIANT[gig.status]}>
                {t(`dialog.status.${gig.status}`)}
              </Badge>
              {gig.band_id && (
                <Badge variant="outline" className="gap-1 text-xs font-normal">
                  <Guitar className="h-3 w-3" />
                  {bandInfo?.name ?? t("bandGig")}
                </Badge>
              )}
            </div>
            <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-4 text-sm">
              <div className="bg-muted/50 flex w-fit items-center gap-1.5 rounded-md border px-2.5 py-1 font-medium">
                <Calendar className="text-primary h-4 w-4" />
                <span>
                  {new Date(gig.scheduled_at).toLocaleString(locale, {
                    dateStyle: "full",
                    timeStyle: "short",
                  })}
                </span>
              </div>
            </div>
            {gig.notes && (
              <div className="text-muted-foreground mt-2 flex items-start gap-1.5 text-sm">
                <StickyNote className="mt-0.5 h-4 w-4 shrink-0" />
                <p>{gig.notes}</p>
              </div>
            )}
          </div>
        </div>

        <GigActions
          gig={gig}
          canManage={canManage}
          personalSetlists={personalSetlists}
          bands={manageableBands}
        />
      </div>

      {gig.setlist_id && setlist ? (
        <div className="space-y-2">
          <h2 className="text-muted-foreground text-sm font-medium">
            {t("setlistFor", { title: setlist.title })}
          </h2>
          <SetlistSongsManager
            setlistId={setlist.id}
            setlistSongs={setlistSongs}
            setlistItems={setlistItems}
            allSongs={allSongs}
            artists={allArtists}
          />
        </div>
      ) : (
        <div className="bg-muted/30 flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-12 text-center">
          {canManage ? (
            <LinkSetlistPrompt
              gig={gig}
              personalSetlists={personalSetlists}
              bands={manageableBands}
            />
          ) : (
            <p className="text-muted-foreground text-sm">
              {t("noSetlistLinked")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
