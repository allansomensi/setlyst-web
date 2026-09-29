import { AuditStamp } from "@/components/audit-stamp";
import { isUuid } from "@/lib/uuid";
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
  SetlistCollaborators,
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
import { toPickerSong, type PickerSong } from "@/lib/picker-song";
import { GigActions } from "./_components/gig-actions";
import { LinkSetlistPrompt } from "./_components/link-setlist-prompt";
import { BandOption, TourOption } from "../_components/gigs-dialog";
import { PinButton } from "@/components/content/pin-button";
import { SetlistCollaborators as SetlistCollaboratorsRow } from "@/components/setlists/setlist-collaborators";
import { getEntitlements, hasFeature } from "@/lib/entitlements";
import type { Tour } from "@/types/content";
import { getTranslations, getLocale } from "next-intl/server";
import { PageBreadcrumbs } from "@/components/page-breadcrumbs";
import { notFound } from "next/navigation";
import { ApiError } from "@/lib/api-server";
import { fetchServerApiOnce } from "@/lib/server-data";
import { fetchOrFailed, FETCH_FAILED } from "@/lib/fetch-or-failed";

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
  // Route params are attacker-chosen and reach API paths: anything but a
  // UUID (`<id>?per_page=…`, `<id>#`) is not a page of this app.
  if (!isUuid(id)) notFound();
  return entityTitle<Gig>(`/gigs/${id}`, (g) => g.venue, "gig", "gigs");
}

export default async function GigDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // Route params are attacker-chosen and reach API paths: anything but a
  // UUID (`<id>?per_page=…`, `<id>#`) is not a page of this app.
  if (!isUuid(id)) notFound();
  const t = await getTranslations("gigs");
  const tNav = await getTranslations("nav");
  const tSetlists = await getTranslations("setlists");
  const locale = await getLocale();

  // What the gig's own dialogs need (bands, setlists to link, the plan)
  // doesn't depend on the gig: started before it, so the page loads in
  // two rounds instead of three (bands and their setlists, this gig's
  // setlist and its collaborators all overlap the gig itself).
  //
  // None of it is the gig itself, so none of it may take the page down: a
  // failed list degrades to empty (the edit dialog offers fewer choices, a
  // band gig reads as not manageable), and a linked setlist that can't be
  // loaded (trashed, deleted, share revoked) falls back to the "link a
  // setlist" prompt below.
  const bandsPromise = fetchOrFailed(
    fetchServerApi<BandWithMembership[]>("/bands"),
  ).then((res) => (res === FETCH_FAILED ? [] : res));
  const personalSetlistsPromise = fetchOrFailed(
    fetchAllServerPages<Setlist>("/setlists"),
  );
  const bandSetlistsPromise = bandsPromise.then((all) =>
    Promise.all(
      all
        .filter((band) => canManageBandSetlists(band))
        .map((band) =>
          fetchOrFailed(
            fetchAllServerPages<Setlist>(`/bands/${band.id}/setlists`),
          ).then((res) => ({
            id: band.id,
            name: band.name,
            setlists: res === FETCH_FAILED ? [] : res.data || [],
          })),
        ),
    ),
  );
  const entitlementsPromise = getEntitlements();

  let gig: Gig;
  try {
    gig = await fetchServerApiOnce<Gig>(`/gigs/${id}`);
  } catch (err) {
    // Same as the song and setlist pages: a gig that is gone, not ours
    // (403) or not addressable (400) is a 404, not the error boundary.
    if (err instanceof ApiError && [400, 403, 404].includes(err.status)) {
      notFound();
    }
    throw err;
  }

  const [
    personalSetlistsRes,
    bands,
    toursRes,
    entitlements,
    bandSetlistsResults,
    gigSetlistRes,
  ] = await Promise.all([
    personalSetlistsPromise,
    bandsPromise,
    fetchAllServerPages<Tour>(
      gig.band_id
        ? `/bands/${gig.band_id}/tours?status=all`
        : "/tours?status=all",
    ).catch(() => ({ data: [] as Tour[] })),
    entitlementsPromise,
    bandSetlistsPromise,
    gig.setlist_id
      ? fetchOrFailed(loadGigSetlist(gig.setlist_id))
      : Promise.resolve(null),
  ]);
  const tours: TourOption[] = toursRes.data.map((tour) => ({
    id: tour.id,
    name: tour.name,
    band_id: tour.band_id,
  }));
  const personalSetlists =
    personalSetlistsRes === FETCH_FAILED ? [] : personalSetlistsRes.data || [];

  const bandsById: Record<string, { name: string; canManage: boolean }> = {};
  for (const band of bands) {
    const canManage = canManageBandSetlists(band);
    bandsById[band.id] = { name: band.name, canManage };
  }

  const bandInfo = gig.band_id ? bandsById[gig.band_id] : undefined;
  const canManage = !gig.band_id || bandInfo?.canManage === true;

  const manageableBands: BandOption[] = bandSetlistsResults;

  const gigSetlist =
    gigSetlistRes === FETCH_FAILED ? null : (gigSetlistRes ?? null);
  const setlist: Setlist | null = gigSetlist?.setlist ?? null;
  const setlistSongs: SetlistSong[] = gigSetlist?.setlistSongs ?? [];
  const setlistItems: SetlistItem[] = gigSetlist?.setlistItems ?? [];
  const allSongs: PickerSong[] = gigSetlist?.allSongs ?? [];
  const allArtists: Artist[] = gigSetlist?.allArtists ?? [];
  const collaborators: SetlistCollaborators | null =
    gigSetlist?.collaborators ?? null;

  return (
    <div className="w-full space-y-6">
      <PageBreadcrumbs
        items={[
          { label: tNav("gigs"), href: "/dashboard/gigs" },
          { label: gig.venue },
        ]}
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3 sm:items-center sm:gap-4">
          <Button
            variant="outline"
            size="icon"
            asChild
            className="hidden shrink-0 sm:inline-flex"
          >
            <Link href="/dashboard/gigs" aria-label={tNav("gigs")}>
              <ChevronLeft className="h-4 w-4" aria-hidden />
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
                  <span className="min-w-0 break-words">{gig.location}</span>
                </div>
              )}
            </div>
            {gig.notes && (
              <div className="text-muted-foreground mt-2 flex items-start gap-1.5 text-sm">
                <StickyNote className="mt-0.5 h-4 w-4 shrink-0" />
                {/* Typed in a textarea: keep its line breaks. */}
                <p className="min-w-0 break-words whitespace-pre-line">
                  {gig.notes}
                </p>
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
            <Button
              asChild
              size="lg"
              className="gap-2 px-3 sm:px-4"
              title={t("liveModeBtn")}
            >
              <Link href={`/dashboard/setlists/${setlist.id}/live`}>
                <Play className="h-4 w-4" aria-hidden />
                <span className="sr-only sm:not-sr-only">
                  {t("liveModeBtn")}
                </span>
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
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-muted-foreground text-sm font-medium">
              {t("setlistFor", {
                title: setlist.is_repertoire
                  ? tSetlists("repertoire.name")
                  : setlist.title,
              })}
            </h2>
            <AuditStamp
              updatedAt={setlist.updated_at}
              updatedBy={setlist.updated_by_username}
            />
          </div>
          {collaborators && (
            <SetlistCollaboratorsRow
              setlistId={setlist.id}
              collaborators={collaborators}
            />
          )}
          <SetlistSongsManager
            setlistId={setlist.id}
            setlist={setlist}
            setlistSongs={setlistSongs}
            setlistItems={setlistItems}
            allSongs={allSongs}
            artists={allArtists}
            showAddedBy={
              !!setlist.band_id ||
              (collaborators?.collaborators.length ?? 0) > 0 ||
              setlistSongs.some(
                (song) =>
                  song.held ||
                  (!!song.added_by && song.added_by !== setlist.user_id),
              )
            }
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

/** The gig's setlist with what its running-order editor needs. */
async function loadGigSetlist(setlistId: string) {
  const setlistPromise = fetchServerApi<Setlist>(`/setlists/${setlistId}`);
  const [
    setlist,
    setlistSongsRes,
    setlistItems,
    allSongsRes,
    allArtistsRes,
    collaborators,
  ] = await Promise.all([
    setlistPromise,
    fetchAllServerPages<SetlistSong>(`/setlists/${setlistId}/songs`),
    fetchServerApi<SetlistItem[]>(`/setlists/${setlistId}/items`),
    // The library only feeds the "add song" picker: an empty one beats
    // losing the whole setlist over it, and it is projected down to what
    // the picker shows (no lyrics in the payload).
    fetchAllServerPages<Song>("/songs").catch(() => ({ data: [] as Song[] })),
    fetchAllServerPages<Artist>("/artists").catch(() => ({
      data: [] as Artist[],
    })),
    // A personal show's setlist can be shared with the other musicians
    // playing it (a guest singer...), right from here. Never fatal.
    setlistPromise.then((loaded) =>
      loaded.band_id
        ? null
        : fetchServerApi<SetlistCollaborators>(
            `/setlists/${loaded.id}/collaborators`,
          ).catch(() => null),
    ),
  ]);
  return {
    setlist,
    setlistSongs: setlistSongsRes.data || [],
    setlistItems: setlistItems || [],
    allSongs: (allSongsRes.data || []).map(toPickerSong),
    allArtists: allArtistsRes.data || [],
    collaborators,
  };
}
