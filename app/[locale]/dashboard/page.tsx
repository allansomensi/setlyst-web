import { Suspense } from "react";
import { staticTitle } from "@/lib/page-metadata";
import { getTranslations } from "next-intl/server";
import {
  Disc3,
  Users,
  Guitar,
  BarChart3,
  ChevronRight,
  Route,
} from "lucide-react";
import { Link } from "@/components/nav-link";
import { PageHeader } from "@/components/page-header";
import { getDashboardMetrics } from "./actions";
import { LazyAdminMetricsCharts } from "./_components/lazy-charts";
import { UserMetricsCharts } from "./_components/user-metrics";
import { PinnedItems } from "./_components/pins/pinned-items";
import {
  NextGigCard,
  type NextGigCandidate,
} from "./_components/next-gig-card";
import { OnboardingChecklist } from "./_components/onboarding-checklist";
import { fetchAllServerPages, fetchServerApi } from "@/lib/api-server";
import { parseWallClock } from "@/lib/dates";
import { setlistDisplayTitle } from "@/lib/repertoire";
import type { BandWithMembership, Gig, Setlist } from "@/types/api";
import type { PinnedItem } from "@/types/content";
import { getSession } from "@/lib/server/session";
import { getMe } from "@/lib/server-data";

/**
 * At most this many shows go to the "next show" card (each costs a setlist
 * fetch). Only a safety cap: see `upcomingGigs` for how many it needs.
 */
const MAX_NEXT_GIG_CANDIDATES = 10;

/**
 * A show this far past the server's clock is still ahead for every viewer:
 * wall-clock "now" is at most UTC+14h, and the card still counts a show
 * that started up to 6h ago (see next-gig-card.tsx).
 */
const SURELY_UPCOMING_MS = 14 * 60 * 60 * 1000;

/**
 * The next few shows (personal and every band's), soonest first, for the
 * "next show" card. The server's clock isn't the viewer's, so this keeps
 * anything from a day and a half back and the card picks after mount.
 * Never fatal: the home page works without it.
 */
async function upcomingGigs(
  repertoireName: string,
): Promise<NextGigCandidate[]> {
  try {
    const [personal, bands] = await Promise.all([
      fetchAllServerPages<Gig>("/gigs").catch(() => null),
      fetchServerApi<BandWithMembership[]>("/bands").catch(() => []),
    ]);
    const bandGigs = await Promise.all(
      bands.map((band) =>
        fetchAllServerPages<Gig>(`/bands/${band.id}/gigs`).catch(() => null),
      ),
    );
    const bandNames = new Map(bands.map((band) => [band.id, band.name]));
    const cutoff = Date.now() - 36 * 60 * 60 * 1000;
    const at = (gig: Gig) => parseWallClock(gig.scheduled_at).getTime();
    const sorted = [
      ...(personal?.data ?? []),
      ...bandGigs.flatMap((res) => res?.data ?? []),
    ]
      .filter((gig) => gig.status !== "cancelled" && at(gig) >= cutoff)
      .sort((a, b) => at(a) - at(b));
    // Everything up to and including the first show that is upcoming
    // whatever the viewer's clock: the card drops the ones already over,
    // and a fixed "first 3" used to be all recent shows after a busy
    // weekend, hiding the real next one.
    const firstSurelyUpcoming = sorted.findIndex(
      (gig) => at(gig) >= Date.now() + SURELY_UPCOMING_MS,
    );
    const gigs = sorted.slice(
      0,
      Math.min(
        firstSurelyUpcoming === -1 ? sorted.length : firstSurelyUpcoming + 1,
        MAX_NEXT_GIG_CANDIDATES,
      ),
    );

    return await Promise.all(
      gigs.map(async (gig) => {
        const setlist = gig.setlist_id
          ? await fetchServerApi<Setlist>(`/setlists/${gig.setlist_id}`).catch(
              () => null,
            )
          : null;
        return {
          gig,
          setlistTitle: setlist
            ? setlistDisplayTitle(setlist, repertoireName)
            : null,
          bandName: gig.band_id ? (bandNames.get(gig.band_id) ?? null) : null,
        };
      }),
    );
  } catch {
    return [];
  }
}

export async function generateMetadata() {
  return staticTitle("dashboard");
}

/**
 * The "next show" card, streamed in on its own: finding it takes a chain
 * of requests (bands, then each band's shows, then their setlists) that
 * the rest of the page shouldn't wait for.
 */
async function NextGigSection() {
  const tSetlists = await getTranslations("setlists");
  const nextGigs = await upcomingGigs(tSetlists("repertoire.name"));
  return nextGigs.length > 0 ? <NextGigCard candidates={nextGigs} /> : null;
}

export default async function DashboardPage() {
  const [session, t, tNav, tTours] = await Promise.all([
    getSession(),
    getTranslations("dashboard"),
    getTranslations("nav"),
    getTranslations("tours"),
  ]);

  const userRole = session?.user?.role;

  const [metrics, pins, me] = await Promise.all([
    getDashboardMetrics(),
    fetchServerApi<PinnedItem[]>("/users/me/pins").catch(() => null),
    // Already fetched (and cached) by the dashboard layout.
    getMe().catch(() => null),
  ]);
  // "Olá, Allan" rather than "Olá, allan": the first name when the
  // profile has one, the username otherwise.
  const greetingName = me?.first_name?.trim() || session?.user?.name || "";

  // Shortcuts are for phones only, and only to the sections the bottom tab
  // bar doesn't have (it holds Home, Songs, Setlists and Shows; the rest
  // sits behind "More"). On larger screens the sidebar is always on
  // screen with every section, and a grid repeating it item for item
  // only pushed the overview down.
  const quickLinks = [
    {
      href: "/dashboard/analytics",
      icon: BarChart3,
      label: tNav("analytics"),
      description: t("analytics.description"),
    },
    {
      href: "/dashboard/artists",
      icon: Disc3,
      label: tNav("artists"),
      description: t("artists.description"),
    },
    {
      href: "/dashboard/tours",
      icon: Route,
      label: tTours("title"),
      description: t("tours.description"),
    },
    {
      href: "/dashboard/bands",
      icon: Guitar,
      label: tNav("bands"),
      description: t("bands.description"),
    },
  ];

  if (userRole === "admin" || userRole === "moderator") {
    quickLinks.push({
      href: "/dashboard/users",
      icon: Users,
      label: tNav("users"),
      description: t("users.description"),
    });
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-10 pb-10">
      <PageHeader
        title={t("title")}
        description={t("welcome", { name: greetingName })}
      />

      {metrics && metrics.scope === "user" && (
        <OnboardingChecklist
          counts={{
            songs: metrics.total_songs,
            songsWithLyrics: metrics.songs_with_lyrics,
            setlists: metrics.total_setlists,
          }}
        />
      )}

      <Suspense fallback={null}>
        <NextGigSection />
      </Suspense>

      {pins && <PinnedItems initial={pins} />}

      <section className="space-y-3 md:hidden">
        <h2 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
          {t("shortcuts")}
        </h2>
        <div className="grid grid-cols-2 gap-2">
          {quickLinks.map(({ href, icon: Icon, label, description }) => (
            <Link
              key={href}
              href={href}
              className="group bg-card hover:border-primary/40 hover:bg-accent/40 focus-visible:ring-ring/50 flex items-center gap-3 rounded-xl border p-3 transition-colors outline-none focus-visible:ring-3"
            >
              <span className="bg-primary/10 text-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-lg sm:h-10 sm:w-10">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">
                  {label}
                </span>
                {/* Names only on a narrow phone; a line of context from `sm`. */}
                <span className="text-muted-foreground hidden truncate text-xs sm:block">
                  {description}
                </span>
              </span>
              <ChevronRight
                className="text-muted-foreground/60 group-hover:text-foreground hidden h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5 sm:block"
                aria-hidden
              />
            </Link>
          ))}
        </div>
      </section>

      {metrics && metrics.scope === "admin" && (
        <LazyAdminMetricsCharts data={metrics} />
      )}

      {metrics && metrics.scope === "user" && (
        <UserMetricsCharts data={metrics} />
      )}
    </div>
  );
}
