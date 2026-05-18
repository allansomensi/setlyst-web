"use client";

import { useTranslations } from "next-intl";
import { AdminMetrics } from "@/types/api";
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

  return (
    <div className="mt-8 flex flex-col space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("platformOverview.totalUsers")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.total_users}</div>
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
                data={data.top_genres}
                layout="vertical"
                margin={{ left: 0, right: 0 }}
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
    </div>
  );
}
