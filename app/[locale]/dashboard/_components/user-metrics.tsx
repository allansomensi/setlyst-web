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
    <div className="mt-8 flex flex-col space-y-4">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("myBands")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.total_bands}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("platformOverview.totalArtists")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.total_artists}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("platformOverview.totalSongs")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.total_songs}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("platformOverview.totalSetlists")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.total_setlists}</div>
          </CardContent>
        </Card>
      </div>

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
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="bg-muted/50 flex flex-col space-y-1 rounded-xl p-4">
            <span className="text-muted-foreground text-sm font-medium">
              {t("repertoireHealth.withLyrics")}
            </span>
            <span className="text-2xl font-bold">{data.songs_with_lyrics}</span>
          </div>
          <div className="bg-muted/50 flex flex-col space-y-1 rounded-xl p-4">
            <span className="text-muted-foreground text-sm font-medium">
              {t("repertoireHealth.withoutLyrics")}
            </span>
            <span className="text-2xl font-bold">
              {data.songs_without_lyrics}
            </span>
          </div>
          <div className="bg-muted/50 flex flex-col space-y-1 rounded-xl p-4">
            <span className="text-muted-foreground text-sm font-medium">
              {t("repertoireHealth.withTonality")}
            </span>
            <span className="text-2xl font-bold">
              {data.songs_with_tonality}
            </span>
          </div>
          <div className="bg-muted/50 flex flex-col space-y-1 rounded-xl p-4">
            <span className="text-muted-foreground text-sm font-medium">
              {t("repertoireHealth.withBpm")}
            </span>
            <span className="text-2xl font-bold">{data.songs_with_tempo}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
