import { AuditStamp } from "@/components/audit-stamp";
import { isUuid } from "@/lib/uuid";
import { entityTitle } from "@/lib/page-metadata";
import { notFound } from "next/navigation";
import {
  ApiError,
  fetchAllServerPages,
  fetchServerApi,
} from "@/lib/api-server";
import {
  Setlist,
  Song,
  SetlistSong,
  SetlistItem,
  Artist,
  BandCopyStatus,
  BandWithMembership,
  SetlistCollaborators as Collaborators,
} from "@/types/api";
import { Badge } from "@/components/ui/badge";
import { LinkButtons } from "@/components/content/link-buttons";
import {
  canExportBandPdf,
  canManageBandSetlists,
} from "@/lib/band-permissions";
import { getEntitlements, hasFeature } from "@/lib/entitlements";
import { setlistDisplayTitle } from "@/lib/repertoire";
import { Link } from "@/components/nav-link";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  Clock,
  Guitar,
  Library,
  Music,
  UsersRound,
} from "lucide-react";
import { SetlistCollaborators } from "@/components/setlists/setlist-collaborators";
import { SetlistSongsManager } from "./_components/setlists-songs-manager";
import { SetlistActions } from "./_components/setlist-actions";
import { SetlistOfflineStatus } from "./_components/setlist-offline-status";
import { getTranslations } from "next-intl/server";
import { PageBreadcrumbs } from "@/components/page-breadcrumbs";
import { formatDuration } from "@/lib/utils";
import { fetchServerApiOnce } from "@/lib/server-data";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // Route params are attacker-chosen and reach API paths: anything but a
  // UUID (`<id>?per_page=…`, `<id>#`) is not a page of this app.
  if (!isUuid(id)) notFound();
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
  // Route params are attacker-chosen and reach API paths: anything but a
  // UUID (`<id>?per_page=…`, `<id>#`) is not a page of this app.
  if (!isUuid(id)) notFound();
  const t = await getTranslations("setlists");
  const tNav = await getTranslations("nav");

  const [setlist, setlistSongsRes, setlistItems, allSongsRes, allArtistsRes] =
    await Promise.all([
      fetchServerApiOnce<Setlist>(`/setlists/${id}`),
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

  const [band, entitlements, songUpdates, collaborators] = await Promise.all([
    setlist.band_id
      ? fetchServerApi<BandWithMembership>(`/bands/${setlist.band_id}`).catch(
          () => null,
        )
      : Promise.resolve(null),
    getEntitlements(),
    // Band songs whose original (the person's own) changed since: offered
    // as a one-tap update on their rows.
    setlist.band_id
      ? fetchServerApi<BandCopyStatus[]>(
          `/bands/${setlist.band_id}/song-updates`,
        ).catch(() => [] as BandCopyStatus[])
      : Promise.resolve([] as BandCopyStatus[]),
    // Who a personal setlist is shared with. Never fatal: the page works
    // without it, only the collaborators row is missing.
    setlist.band_id
      ? Promise.resolve(null)
      : fetchServerApi<Collaborators>(`/setlists/${id}/collaborators`).catch(
          () => null,
        ),
  ]);
  // Someone else's setlist shared with this account: what they may do
  // follows their role (see CollaboratorRole in types/api.ts).
  const sharedRole = setlist.collaborator_role;
  // Owner-level: delete, share publicly.
  const canManage = sharedRole
    ? false
    : !setlist.band_id || (!!band && canManageBandSetlists(band));
  const canEditItems =
    canManage || sharedRole === "editor" || sharedRole === "manager";
  const canEditDetails = canManage || sharedRole === "manager";
  const canExport = !setlist.band_id || (!!band && canExportBandPdf(band));
  // Who added each song matters once more than one person edits it.
  const showAddedBy =
    !!setlist.band_id ||
    (collaborators?.collaborators.length ?? 0) > 0 ||
    (setlistSongsRes.data ?? []).some(
      (song) =>
        song.held || (!!song.added_by && song.added_by !== setlist.user_id),
    );
  const title = setlistDisplayTitle(setlist, t("repertoire.name"));

  const setlistSongs = setlistSongsRes.data || [];
  const allSongs = allSongsRes.data || [];
  const allArtists = allArtistsRes.data || [];

  return (
    <div className="w-full space-y-6">
      <PageBreadcrumbs
        items={[
          ...(band
            ? [
                { label: tNav("bands"), href: "/dashboard/bands" },
                { label: band.name, href: `/dashboard/bands/${band.id}` },
              ]
            : [{ label: tNav("setlists"), href: "/dashboard/setlists" }]),
          { label: title },
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
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight break-words sm:text-3xl">
                {title}
              </h1>
              {setlist.is_repertoire && (
                <Badge variant="secondary" className="gap-1">
                  <Library aria-hidden />
                  {t("repertoire.badge")}
                </Badge>
              )}
              {band && (
                <Badge variant="outline" className="gap-1 font-normal" asChild>
                  <Link href={`/dashboard/bands/${band.id}`}>
                    <Guitar aria-hidden />
                    {band.name}
                  </Link>
                </Badge>
              )}
              {sharedRole && (
                <Badge variant="outline" className="gap-1 font-normal">
                  <UsersRound aria-hidden />
                  {t("collaborators.sharedByRole", {
                    username: setlist.owner_username ?? "",
                    role: t(`collaborators.roles.${sharedRole}`),
                  })}
                </Badge>
              )}
            </div>
            {setlist.is_repertoire && (
              <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
                {t("repertoire.explanation")}
              </p>
            )}
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
            {collaborators && (
              <SetlistCollaborators
                setlistId={setlist.id}
                collaborators={collaborators}
                myRole={sharedRole}
                className="mt-2"
              />
            )}
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
          setlist={setlist}
          canEdit={canEditDetails}
          canShare={canManage}
          canExport={canExport}
          pdfInPlan={hasFeature(entitlements, "pdf_export")}
          setlistId={setlist.id}
          setlistTitle={title}
          shareToken={setlist.share_token}
          shareLock={
            setlist.share_locked_at
              ? { reason: setlist.share_lock_reason ?? null }
              : null
          }
        />
      </div>

      {setlist.links && setlist.links.length > 0 && (
        <section aria-labelledby="setlist-links" className="space-y-2">
          <h2
            id="setlist-links"
            className="text-muted-foreground text-xs font-semibold tracking-wider uppercase"
          >
            {t("linksTitle")}
          </h2>
          <LinkButtons links={setlist.links} />
        </section>
      )}

      <SetlistSongsManager
        setlistId={setlist.id}
        setlist={setlist}
        setlistSongs={setlistSongs}
        setlistItems={setlistItems}
        allSongs={allSongs}
        artists={allArtists}
        songUpdates={songUpdates}
        canEditItems={canEditItems}
        showAddedBy={showAddedBy}
        band={
          band
            ? {
                id: band.id,
                canManage,
                canSuggest: hasFeature(entitlements, "song_suggestions"),
                isRepertoire: !!setlist.is_repertoire,
              }
            : undefined
        }
      />
    </div>
  );
}
