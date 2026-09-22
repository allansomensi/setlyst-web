"use client";

import { useTranslations } from "next-intl";
import { UserMetrics, formatGenre } from "@/types/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Disc3, Guitar, ListMusic, Music } from "lucide-react";
import { StatGrid } from "./stat-grid";

export function UserMetricsCharts({ data }: { data: UserMetrics }) {
  const t = useTranslations("metrics");

  const genresChartConfig = {
    count: {
      label: t("quantity"),
      color: "var(--chart-1)",
    },
  } satisfies ChartConfig;

  // Genre values come from the backend as compact identifiers (e.g.
  // "ProgressiveRock") — format them for display ("Progressive Rock").
  const genresData = data.top_genres.map((g) => ({
    ...g,
    genre: formatGenre(g.genre),
  }));

  const artistsChartConfig = {
    song_count: {
      label: t("quantity"),
      color: "var(--chart-2)",
    },
  } satisfies ChartConfig;

  return (
    <section className="flex flex-col space-y-3">
      <h2 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
        {t("overview")}
      </h2>
      <StatGrid
        items={[
          { label: t("myBands"), value: data.total_bands, icon: Guitar },
          {
            label: t("platformOverview.totalArtists"),
            value: data.total_artists,
            icon: Disc3,
          },
          {
            label: t("platformOverview.totalSongs"),
            value: data.total_songs,
            icon: Music,
          },
          {
            label: t("platformOverview.totalSetlists"),
            value: data.total_setlists,
            icon: ListMusic,
          },
        ]}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>{t("topGenres.title")}</CardTitle>
            <CardDescription>{t("topGenres.description")}</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 pb-4">
            <ChartContainer config={genresChartConfig} className="h-75 w-full">
              <BarChart
                accessibilityLayer
                data={genresData}
                layout="vertical"
                margin={{ left: 0, right: 12 }}
              >
                <CartesianGrid
                  horizontal={false}
                  strokeDasharray="3 3"
                  className="stroke-muted"
                />
                <XAxis type="number" hide />
                <YAxis
                  dataKey="genre"
                  type="category"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={10}
                  width={130}
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent hideLabel />}
                />
                <Bar
                  dataKey="count"
                  fill="var(--color-count)"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>{t("topArtists.title")}</CardTitle>
            <CardDescription>{t("topArtists.description")}</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 pb-4">
            <ChartContainer config={artistsChartConfig} className="h-75 w-full">
              <BarChart
                accessibilityLayer
                data={data.top_artists_by_songs}
                margin={{ left: -20, right: 12 }}
                layout="vertical"
              >
                <CartesianGrid
                  horizontal={false}
                  strokeDasharray="3 3"
                  className="stroke-muted"
                />
                <XAxis type="number" hide />
                <YAxis
                  dataKey="artist_name"
                  type="category"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={10}
                  width={100}
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent hideLabel />}
                />
                <Bar
                  dataKey="song_count"
                  fill="var(--color-song_count)"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("repertoireHealth.title")}</CardTitle>
          <CardDescription>{t("repertoireHealth.description")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-3">
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
