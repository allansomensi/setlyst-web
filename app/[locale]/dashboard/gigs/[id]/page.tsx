import { AuditStamp } from "@/components/audit-stamp";
import { entityTitle } from "@/lib/page-metadata";
import { fetchServerApi, fetchAllServerPages } from "@/lib/api-server";
import { canManageBandSetlists } from "@/lib/band-permissions";
import {
  Gig,
  Setlist,
  Song,
  SetlistSong,
  SetlistItem,
  Artist,
  BandWithMembership,
} from "@/types/api";
import { formatWallClock } from "@/lib/dates";
import { Link } from "@/components/nav-link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  Calendar,
  StickyNote,
  Guitar,
  Play,
  MapPin,
  Route,
} from "lucide-react";
import { SetlistSongsManager } from "../../setlists/[id]/_components/setlists-songs-manager";
import { GigActions } from "./_components/gig-actions";
import { LinkSetlistPrompt } from "./_components/link-setlist-prompt";
import { BandOption, TourOption } from "../_components/gigs-dialog";
import { PinButton } from "@/components/content/pin-button";
import { getEntitlements, hasFeature } from "@/lib/entitlements";
import type { Tour } from "@/types/content";
import { getTranslations, getLocale } from "next-intl/server";
import { PageBreadcrumbs } from "@/components/page-breadcrumbs";
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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return entityTitle<Gig>(`/gigs/${id}`, (g) => g.venue, "gig", "gigs");
}

export default async function GigDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations("gigs");
  const tNav = await getTranslations("nav");
  const tSetlists = await getTranslations("setlists");
  const locale = await getLocale();

  let gig: Gig;
  try {
    gig = await fetchServerApi<Gig>(`/gigs/${id}`);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  const [personalSetlistsRes, bands, toursRes, entitlements] =
    await Promise.all([
      fetchAllServerPages<Setlist>("/setlists"),
      fetchServerApi<BandWithMembership[]>("/bands"),
      fetchAllServerPages<Tour>(
        gig.band_id
          ? `/bands/${gig.band_id}/tours?status=all`
          : "/tours?status=all",
      ).catch(() => ({ data: [] as Tour[] })),
      getEntitlements(),
    ]);
  const tours: TourOption[] = toursRes.data.map((tour) => ({
    id: tour.id,
    name: tour.name,
    band_id: tour.band_id,
  }));
  const personalSetlists = personalSetlistsRes.data || [];

  const bandsById: Record<string, { name: string; canManage: boolean }> = {};
  for (const band of bands) {
    const canManage = canManageBandSetlists(band);
    bandsById[band.id] = { name: band.name, canManage };
  }

  const bandInfo = gig.band_id ? bandsById[gig.band_id] : undefined;
  const canManage = !gig.band_id || bandInfo?.canManage === true;

  const bandSetlistsResults = await Promise.all(
    bands
      .filter((band) => bandsById[band.id]?.canManage)
      .map((band) =>
        fetchAllServerPages<Setlist>(`/bands/${band.id}/setlists`).then(
          (res) => ({ id: band.id, name: band.name, res }),
        ),
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
      fetchAllServerPages<SetlistSong>(`/setlists/${gig.setlist_id}/songs`),
      fetchServerApi<SetlistItem[]>(`/setlists/${gig.setlist_id}/items`),
      fetchAllServerPages<Song>("/songs"),
      fetchAllServerPages<Artist>("/artists"),
    ]);
    setlist = setlistRes;
    setlistSongs = setlistSongsRes.data || [];
    setlistItems = setlistItemsRes || [];
    allSongs = allSongsRes.data || [];
    allArtists = allArtistsRes.data || [];
  }

  return (
    <div className="w-full space-y-6">
      <PageBreadcrumbs
        items={[
          { label: tNav("gigs"), href: "/dashboard/gigs" },
          { label: gig.venue },
        ]}
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3 sm:items-center sm:gap-4">
          <Button variant="outline" size="icon" asChild className="shrink-0">
            <Link href="/dashboard/gigs">
              <ChevronLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight break-words sm:text-3xl">
                {gig.venue}
              </h1>
              <Badge variant={STATUS_VARIANT[gig.status]}>
                {t(`dialog.status.${gig.status}`)}
              </Badge>
              {gig.band_id && (
                <Badge variant="outline" className="gap-1 text-xs font-normal">
                  <Guitar className="h-3 w-3" />
                  {bandInfo?.name ?? t("bandGig")}
                </Badge>
              )}
              {gig.tour_id && gig.tour_name && (
                <Badge
                  variant="secondary"
                  className="gap-1 text-xs font-normal"
                  asChild
                >
                  <Link href={`/dashboard/tours/${gig.tour_id}`}>
                    <Route className="h-3 w-3" aria-hidden />
                    {gig.tour_name}
                  </Link>
                </Badge>
              )}
            </div>
            <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-4 text-sm">
              <div className="bg-muted/50 flex w-fit items-center gap-1.5 rounded-md border px-2.5 py-1 font-medium">
                <Calendar className="text-primary h-4 w-4" />
                <span>
                  {formatWallClock(gig.scheduled_at, locale, {
                    dateStyle: "full",
                    timeStyle: "short",
                  })}
                </span>
              </div>
              {gig.location && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 shrink-0" />
                  <span>{gig.location}</span>
                </div>
              )}
            </div>
            {gig.notes && (
              <div className="text-muted-foreground mt-2 flex items-start gap-1.5 text-sm">
                <StickyNote className="mt-0.5 h-4 w-4 shrink-0" />
                <p>{gig.notes}</p>
              </div>
            )}
            <AuditStamp
              updatedAt={gig.updated_at}
              updatedBy={gig.updated_by_username}
              className="mt-2"
            />
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <PinButton
            type="gig"
            id={gig.id}
            name={gig.venue}
            pinned={!!gig.is_pinned}
            variant="default"
          />
          {gig.setlist_id && setlist && (
            <Button asChild size="lg" className="gap-2">
              <Link href={`/dashboard/setlists/${setlist.id}/live`}>
                <Play className="h-4 w-4" />
                {t("liveModeBtn")}
              </Link>
            </Button>
          )}
          <GigActions
            gig={gig}
            canManage={canManage}
            personalSetlists={personalSetlists}
            bands={manageableBands}
            tours={tours}
          />
        </div>
      </div>

      {gig.setlist_id && setlist ? (
        <div className="space-y-2">
          <h2 className="text-muted-foreground text-sm font-medium">
            {t("setlistFor", {
              title: setlist.is_repertoire
                ? tSetlists("repertoire.name")
                : setlist.title,
            })}
          </h2>
          <SetlistSongsManager
            setlistId={setlist.id}
            setlist={setlist}
            setlistSongs={setlistSongs}
            setlistItems={setlistItems}
            allSongs={allSongs}
            artists={allArtists}
            band={
              gig.band_id
                ? {
                    id: gig.band_id,
                    canManage,
                    canSuggest: hasFeature(entitlements, "song_suggestions"),
                    isRepertoire: !!setlist.is_repertoire,
                  }
                : undefined
            }
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
