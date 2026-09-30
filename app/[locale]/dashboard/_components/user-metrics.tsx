import { useLocale, useTranslations } from "next-intl";
import { ChevronRight, Disc3, Guitar, ListMusic, Music } from "lucide-react";
import { Link } from "@/components/nav-link";
import { UserMetrics, formatGenre } from "@/types/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StatGrid } from "@/components/stat-grid";
import { BreakdownBars } from "../analytics/_components/breakdown-bars";

/** Rows per ranking on the home page; Statistics has the full lists. */
const TOP_ROWS = 5;

/**
 * The repertoire at a glance on the dashboard home: the headline counts,
 * the top genres and artists, and how complete the songs are.
 *
 * The rankings use the same proportional bars as Statistics (plain HTML)
 * instead of a charting library: the same data looked different on the
 * two pages, and the home had two 300px-tall charts for five rows each.
 * Being plain markup, this renders with the page (no chart bundle, no
 * placeholder that pops in), and the full breakdowns are one link away.
 */
export function UserMetricsCharts({ data }: { data: UserMetrics }) {
  const t = useTranslations("metrics");
  const tNav = useTranslations("nav");
  const tAnalytics = useTranslations("analytics");
  const locale = useLocale();

  // Genre values come from the backend as compact identifiers (e.g.
  // "ProgressiveRock") — format them for display ("Progressive Rock").
  const genreRows = data.top_genres.slice(0, TOP_ROWS).map((g) => ({
    key: g.genre,
    label: formatGenre(g.genre, locale),
    count: g.count,
  }));
  const artistRows = data.top_artists_by_songs.slice(0, TOP_ROWS).map((a) => ({
    key: a.artist_name,
    label: a.artist_name,
    count: a.song_count,
  }));

  return (
    <section aria-labelledby="overview-title" className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2
          id="overview-title"
          className="text-muted-foreground text-xs font-semibold tracking-wider uppercase"
        >
          {t("overview")}
        </h2>
        <Link
          href="/dashboard/analytics"
          className="text-primary focus-visible:ring-ring/50 -my-1 inline-flex items-center gap-0.5 rounded-sm py-1 text-sm font-medium outline-none hover:underline focus-visible:ring-3"
        >
          {t("viewAnalytics")}
          <ChevronRight className="size-4" aria-hidden />
        </Link>
      </div>
      {/* Same labels as Statistics ("Songs", not "Total songs"). */}
      <StatGrid
        items={[
          { label: tNav("songs"), value: data.total_songs, icon: Music },
          { label: tNav("artists"), value: data.total_artists, icon: Disc3 },
          {
            label: tNav("setlists"),
            value: data.total_setlists,
            icon: ListMusic,
          },
          { label: tNav("bands"), value: data.total_bands, icon: Guitar },
        ]}
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("topGenres.title")}</CardTitle>
            <CardDescription>{t("topGenres.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <BreakdownBars
              rows={genreRows}
              total={data.total_songs}
              emptyText={tAnalytics("breakdowns.empty")}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("topArtists.title")}</CardTitle>
            <CardDescription>{t("topArtists.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <BreakdownBars
              rows={artistRows}
              total={data.total_songs}
              emptyText={tAnalytics("breakdowns.empty")}
            />
          </CardContent>
        </Card>

        {/* Full width between two columns, a third column on large
            screens. */}
        <Card className="md:col-span-2 lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">
              {t("repertoireHealth.title")}
            </CardTitle>
            <CardDescription>
              {t("repertoireHealth.description")}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3 md:gap-6 lg:grid-cols-1 lg:gap-4">
            <CoverageBar
              label={t("repertoireHealth.withLyrics")}
              value={data.songs_with_lyrics}
              total={data.total_songs}
            />
            <CoverageBar
              label={t("repertoireHealth.withTonality")}
              value={data.songs_with_tonality}
              total={data.total_songs}
            />
            <CoverageBar
              label={t("repertoireHealth.withBpm")}
              value={data.songs_with_tempo}
              total={data.total_songs}
            />
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

/**
 * How much of the repertoire has a given detail filled in. A share of the
 * whole reads faster than two bare counts ("with" / "without") side by
 * side, and makes the gap to close obvious.
 */
function CoverageBar({
  label,
  value,
  total,
}: {
  label: string;
  value: number;
  total: number;
}) {
  const percent = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-muted-foreground font-mono text-xs tabular-nums">
          {value}/{total}
        </span>
      </div>
      <div
        className="bg-muted h-2 overflow-hidden rounded-full"
        role="progressbar"
        aria-label={label}
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="bg-primary h-full rounded-full transition-[width]"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
