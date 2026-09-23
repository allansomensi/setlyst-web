import { entityTitle } from "@/lib/page-metadata";
import {
  fetchAllServerPages,
  fetchServerApi,
  ApiError,
} from "@/lib/api-server";
import {
  BandWithMembership,
  BandMember,
  BandInvite,
  BandRolePermission,
  Gig,
  Setlist,
  SetlistSong,
  Song,
  Artist,
} from "@/types/api";
import type { BandNote, Suggestion, Tour } from "@/types/content";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PageBreadcrumbs } from "@/components/page-breadcrumbs";
import { fetchOrFailed, FETCH_FAILED } from "@/lib/fetch-or-failed";
import { getEntitlements, hasFeature } from "@/lib/entitlements";
import {
  canAdministerBand,
  canManageBandSetlists,
  canModerateBand,
} from "@/lib/band-permissions";
import { repertoireFirst } from "@/lib/repertoire";
import { BandHeader } from "./_components/band-header";
import { BandMembersSection } from "./_components/band-members-section";
import { BandInvitesSection } from "./_components/band-invites-section";
import { BandPermissionsSection } from "./_components/band-permissions-section";
import { BandDangerZone } from "./_components/band-danger-zone";
import { BandTabs } from "./_components/band-tabs";
import { BandSuggestions } from "./_components/band-suggestions";
import { BandNotes } from "./_components/band-notes";
import {
  BandGigsSection,
  BandSetlistsSection,
  BandToursSection,
  RepertoireCard,
  SuggestionSettings,
} from "./_components/band-sections";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return entityTitle<BandWithMembership>(
    `/bands/${id}`,
    (b) => b.name,
    "band",
    "bands",
  );
}

const orEmpty = <T,>(value: T[] | typeof FETCH_FAILED): T[] =>
  value === FETCH_FAILED ? [] : value;

export default async function BandDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const { tab } = await searchParams;

  let band: BandWithMembership;
  try {
    band = await fetchServerApi<BandWithMembership>(`/bands/${id}`);
  } catch (err) {
    // A stale or inaccessible band id (e.g. from an old notification for a
    // band the user is no longer part of, or a malformed id) shouldn't
    // crash the page — degrade to the standard 404 instead.
    if (err instanceof ApiError && (err.status === 404 || err.status === 400)) {
      notFound();
    }
    throw err;
  }

  const isAdmin = canAdministerBand(band);
  const canManage = canManageBandSetlists(band);

  const [
    members,
    invites,
    permissions,
    session,
    setlistsRes,
    gigsRes,
    toursRes,
    suggestionsRes,
    notesRes,
    mySongsRes,
    myArtistsRes,
    repertoireRes,
    entitlements,
  ] = await Promise.all([
    fetchServerApi<BandMember[]>(`/bands/${id}/members`),
    isAdmin
      ? fetchServerApi<BandInvite[]>(`/bands/${id}/invites`)
      : Promise.resolve<BandInvite[]>([]),
    isAdmin
      ? fetchServerApi<BandRolePermission[]>(`/bands/${id}/permissions`)
      : Promise.resolve<BandRolePermission[]>([]),
    getServerSession(authOptions),
    fetchOrFailed(fetchAllServerPages<Setlist>(`/bands/${id}/setlists`)),
    fetchOrFailed(fetchAllServerPages<Gig>(`/bands/${id}/gigs`)),
    fetchOrFailed(fetchAllServerPages<Tour>(`/bands/${id}/tours?status=all`)),
    fetchOrFailed(
      fetchServerApi<{ data: Suggestion[] }>(
        `/bands/${id}/suggestions?status=open&per_page=50`,
      ),
    ),
    fetchOrFailed(fetchServerApi<BandNote[]>(`/bands/${id}/notes`)),
    fetchOrFailed(fetchAllServerPages<Song>("/songs")),
    fetchOrFailed(fetchAllServerPages<Artist>("/artists")),
    fetchOrFailed(fetchAllServerPages<SetlistSong>(`/bands/${id}/repertoire`)),
    getEntitlements(),
  ]);

  const currentUserId = session?.user?.id ?? "";
  const t = await getTranslations("bands.page");
  const tNav = await getTranslations("nav");
  const tTours = await getTranslations("tours");

  const setlists = repertoireFirst(
    orEmpty(setlistsRes === FETCH_FAILED ? FETCH_FAILED : setlistsRes.data),
  );
  const repertoire = setlists.find((s) => s.is_repertoire) ?? null;
  const gigs = gigsRes === FETCH_FAILED ? [] : gigsRes.data;
  const tours = toursRes === FETCH_FAILED ? [] : toursRes.data;
  const suggestions =
    suggestionsRes === FETCH_FAILED ? [] : suggestionsRes.data;
  const notes = orEmpty(notesRes);
  const artistNames = new Map(
    (myArtistsRes === FETCH_FAILED ? [] : myArtistsRes.data).map((a) => [
      a.id,
      a.name,
    ]),
  );
  const mySongs = (mySongsRes === FETCH_FAILED ? [] : mySongsRes.data)
    .map((song) => ({
      id: song.id,
      title: song.title,
      artist_name: artistNames.get(song.artist_id) ?? "",
    }))
    .sort((a, b) => a.title.localeCompare(b.title));
  const bandSongs = (repertoireRes === FETCH_FAILED ? [] : repertoireRes.data)
    .map((song) => ({
      id: song.id,
      title: song.title,
      artist_name: song.artist_name,
    }))
    .sort((a, b) => a.title.localeCompare(b.title));

  const openSuggestions = band.open_suggestions ?? suggestions.length;
  const upcomingCount = gigs.filter((g) => g.status === "confirmed").length;

  const suggestionsBlock = (
    <BandSuggestions
      bandId={id}
      currentUserId={currentUserId}
      initial={suggestions}
      canManage={canManage}
      canSuggest={hasFeature(entitlements, "song_suggestions")}
      autoAcceptVotes={band.suggestion_auto_accept_votes ?? null}
      setlists={setlists.map((s) => ({
        id: s.id,
        title: s.title,
        is_repertoire: !!s.is_repertoire,
      }))}
      mySongs={mySongs}
      bandSongs={bandSongs}
    />
  );

  const stats = [
    { label: t("stats.members"), value: band.member_count },
    { label: t("stats.repertoire"), value: repertoire?.song_count ?? 0 },
    {
      label: t("stats.setlists"),
      value: setlists.filter((s) => !s.is_repertoire).length,
    },
    { label: t("stats.gigs"), value: upcomingCount },
    { label: t("stats.suggestions"), value: openSuggestions },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-10">
      <div className="space-y-6">
        <PageBreadcrumbs
          items={[
            { label: tNav("bands"), href: "/dashboard/bands" },
            { label: band.name },
          ]}
        />
        <BandHeader band={band} />
      </div>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-card rounded-xl border p-3">
            <dt className="text-muted-foreground text-xs">{stat.label}</dt>
            <dd className="mt-1 text-2xl font-bold tabular-nums">
              {stat.value}
            </dd>
          </div>
        ))}
      </dl>

      <BandTabs
        label={t("tabsLabel")}
        initial={typeof tab === "string" ? tab : "overview"}
        tabs={[
          {
            value: "overview",
            label: t("tabs.overview"),
            content: (
              <>
                <div className="grid gap-6 lg:grid-cols-2">
                  <RepertoireCard repertoire={repertoire} />
                  <BandGigsSection bandId={id} gigs={gigs} limit={3} compact />
                </div>
                {suggestionsBlock}
                <BandNotes
                  bandId={id}
                  notes={notes}
                  canPin={canModerateBand(band)}
                />
              </>
            ),
          },
          {
            value: "setlists",
            label: t("tabs.setlists"),
            content: <BandSetlistsSection bandId={id} setlists={setlists} />,
          },
          {
            value: "suggestions",
            label: t("tabs.suggestions"),
            count: openSuggestions,
            content: suggestionsBlock,
          },
          {
            value: "gigs",
            label: t("tabs.gigs"),
            content: <BandGigsSection bandId={id} gigs={gigs} />,
          },
          {
            value: "tours",
            label: tTours("title"),
            content: (
              <BandToursSection
                bandId={id}
                tours={tours}
                canManage={canManage}
                canCreate={hasFeature(entitlements, "tours")}
              />
            ),
          },
          {
            value: "members",
            label: t("tabs.members"),
            count: band.member_count,
            content: (
              <BandMembersSection
                band={band}
                members={members}
                currentUserId={currentUserId}
              />
            ),
          },
          {
            value: "settings",
            label: t("tabs.settings"),
            content: (
              <>
                {isAdmin && (
                  <>
                    <SuggestionSettings
                      bandId={id}
                      value={band.suggestion_auto_accept_votes ?? null}
                    />
                    <BandInvitesSection bandId={band.id} invites={invites} />
                    <BandPermissionsSection
                      bandId={band.id}
                      permissions={permissions}
                    />
                  </>
                )}
                <BandDangerZone
                  band={band}
                  members={members}
                  currentUserId={currentUserId}
                />
              </>
            ),
          },
        ]}
      />
    </div>
  );
}
