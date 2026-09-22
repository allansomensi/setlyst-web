"use client";

import { useTranslations } from "next-intl";
import { AdminMetrics, formatGenre } from "@/types/api";
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
import {
  Pie,
  PieChart,
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import { Disc3, Guitar, ListMusic, Music, Users } from "lucide-react";
import { StatGrid } from "./stat-grid";

export function AdminMetricsCharts({ data }: { data: AdminMetrics }) {
  const t = useTranslations("metrics");

  const roleChartConfig = {} as ChartConfig;

  const roleData = data.users_by_role.map((entry, index) => {
    const roleId = `role${index}`;

    roleChartConfig[roleId] = {
      label: entry.role,
      color: `var(--chart-${(index % 5) + 1})`,
    };

    return {
      id: roleId,
      count: entry.count,
      fill: `var(--color-${roleId})`,
    };
  });

  const statusChartConfig = {
    active: {
      label: t("active"),
      color: "var(--chart-1)",
    },
    inactive: {
      label: t("inactive"),
      color: "var(--chart-2)",
    },
  } satisfies ChartConfig;

  const statusData = [
    {
      status: "active",
      value: data.active_users,
      fill: "var(--color-active)",
    },
    {
      status: "inactive",
      value: data.inactive_users,
      fill: "var(--color-inactive)",
    },
  ];

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

  return (
    <section className="flex flex-col space-y-3">
      <h2 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
        {t("platformOverview.title")}
      </h2>
      <StatGrid
        items={[
          {
            label: t("platformOverview.totalUsers"),
            value: data.total_users,
            icon: Users,
          },
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
          {
            label: t("platformOverview.totalBands"),
            value: data.total_bands,
            icon: Guitar,
          },
        ]}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="col-span-1 flex flex-col">
          <CardHeader className="items-center pb-0">
            <CardTitle>{t("userRoles.title")}</CardTitle>
            <CardDescription>{t("userRoles.description")}</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 pb-0">
            <ChartContainer
              config={roleChartConfig}
              className="mx-auto aspect-square max-h-75"
            >
              <PieChart>
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent hideLabel />}
                />
                <Pie
                  data={roleData}
                  dataKey="count"
                  nameKey="id"
                  innerRadius={60}
                  strokeWidth={5}
                />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="col-span-1 flex flex-col">
          <CardHeader className="items-center pb-0">
            <CardTitle>{t("accountStatus.title")}</CardTitle>
            <CardDescription>{t("accountStatus.description")}</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 pb-0">
            <ChartContainer
              config={statusChartConfig}
              className="mx-auto aspect-square max-h-75"
            >
              <PieChart>
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent hideLabel />}
                />
                <Pie
                  data={statusData}
                  dataKey="value"
                  nameKey="status"
                  innerRadius={60}
                  strokeWidth={5}
                />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="col-span-1 flex flex-col">
          <CardHeader>
            <CardTitle>{t("topGenres.globalTitle")}</CardTitle>
            <CardDescription>
              {t("topGenres.globalDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent>
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
      </div>
    </section>
  );
}
