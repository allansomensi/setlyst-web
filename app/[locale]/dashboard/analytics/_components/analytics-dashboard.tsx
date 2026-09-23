"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  CalendarDays,
  Clock,
  Disc3,
  Gauge,
  ListMusic,
  Music,
  Zap,
  type LucideIcon,
} from "lucide-react";
import {
  Artist,
  Gig,
  MetricsResponse,
  Song,
  TimeseriesResponse,
  formatGenre,
} from "@/types/api";
import { getTimeseriesMetrics } from "@/app/[locale]/dashboard/actions";
import { ActivityChart } from "./activity-chart";
import { BreakdownBars } from "./breakdown-bars";
import { AdminMetricsCharts } from "@/app/[locale]/dashboard/_components/admin-metrics";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoadErrorNotice } from "@/components/load-error-notice";
import {
  ReportExportMenu,
  type CsvTable,
} from "@/components/content/report-export-menu";
import { useMounted } from "@/hooks/use-mounted";
import { parseWallClock, wallClockNow } from "@/lib/dates";
import { repertoireStats } from "@/lib/repertoire-stats";
import {
  ENERGY_CHART_COLORS,
  ENERGY_KEYS,
  type EnergyLevel,
} from "@/lib/song-fields";
import { cn, formatDuration } from "@/lib/utils";

const RANGE_OPTIONS = [7, 30, 90] as const;

interface AnalyticsDashboardProps {
  title: string;
  subtitle: string;
  metrics: MetricsResponse | null;
  initialTimeseries: TimeseriesResponse | null;
  initialDays: number;
  songs: Song[];
  artists: Artist[];
  setlistCount: number | null;
  gigs: Gig[];
  loadError: boolean;
  canExport: boolean;
}

/**
 * The statistics page: headline numbers, recent activity, how the
 * repertoire is spread (keys, tempos, energy, genres, artists) and how
 * complete its data is. Exportable as CSV tables, PNG or PDF.
 */
export function AnalyticsDashboard({
  title,
  subtitle,
  metrics,
  initialTimeseries,
  initialDays,
  songs,
  artists,
  setlistCount,
  gigs,
  loadError,
  canExport,
}: AnalyticsDashboardProps) {
  const t = useTranslations("analytics");
  const tEnergy = useTranslations("songs.energy");
  const reportRef = useRef<HTMLDivElement>(null);
  const mounted = useMounted();
  const [isPending, startTransition] = useTransition();
  const [days, setDays] = useState(initialDays);
  const [timeseries, setTimeseries] = useState(initialTimeseries);

  const stats = useMemo(
    () => repertoireStats(songs, new Map(artists.map((a) => [a.id, a.name]))),
    [songs, artists],
  );
  const now = mounted ? wallClockNow() : null;
  const upcomingGigs =
    now === null
      ? null
      : gigs.filter(
          (gig) =>
            gig.status === "confirmed" &&
            parseWallClock(gig.scheduled_at).getTime() >= now,
        ).length;

  const handleRangeChange = (value: number) => {
    setDays(value);
    startTransition(async () => {
      setTimeseries(await getTimeseriesMetrics(value));
    });
  };

  const energyLabel = (level: number) =>
    tEnergy(`levels.${ENERGY_KEYS[level as EnergyLevel]}`);

  const keyRows = stats.keys.slice(0, 12).map((row) => ({
    key: row.key,
    label: row.key,
    count: row.count,
  }));
  const bpmRows = stats.bpmRanges.map((row) => ({
    key: row.key,
    label: t(`bpmRanges.${row.key}`),
    count: row.count,
  }));
  const energyRows = stats.energy.map((row) => ({
    key: String(row.key),
    label: `${row.key}. ${energyLabel(row.key)}`,
    count: row.count,
    color: ENERGY_CHART_COLORS[row.key as EnergyLevel],
  }));
  const genreRows = stats.genres.slice(0, 10).map((row) => ({
    key: row.key,
    label: formatGenre(row.key),
    count: row.count,
  }));
  const artistRows = stats.artists.slice(0, 10).map((row) => ({
    key: row.key,
    label: row.key,
    count: row.count,
  }));

  const coverage = [
    ["lyrics", stats.coverage.lyrics],
    ["key", stats.coverage.key],
    ["bpm", stats.coverage.bpm],
    ["energy", stats.coverage.energy],
    ["duration", stats.coverage.duration],
    ["timeSignature", stats.coverage.timeSignature],
    ["links", stats.coverage.links],
  ] as const;

  const kpis: Array<{
    icon: LucideIcon;
    label: string;
    value: string;
    hint?: string;
  }> = [
    { icon: Music, label: t("kpi.songs"), value: String(stats.totalSongs) },
    { icon: Disc3, label: t("kpi.artists"), value: String(artists.length) },
    {
      icon: ListMusic,
      label: t("kpi.setlists"),
      value: setlistCount === null ? "—" : String(setlistCount),
    },
    {
      icon: CalendarDays,
      label: t("kpi.upcomingGigs"),
      value: upcomingGigs === null ? "…" : String(upcomingGigs),
    },
    {
      icon: Clock,
      label: t("kpi.repertoireTime"),
      value: formatHours(stats.totalDuration),
      hint: t("kpi.repertoireTimeHint"),
    },
    {
      icon: Gauge,
      label: t("kpi.averageBpm"),
      value: stats.averageBpm === null ? "—" : String(stats.averageBpm),
    },
    {
      icon: Zap,
      label: t("kpi.averageEnergy"),
      value:
        stats.averageEnergy === null
          ? "—"
          : energyLabel(Math.round(stats.averageEnergy)),
      hint:
        stats.averageEnergy === null
          ? undefined
          : t("kpi.energyValue", {
              value: stats.averageEnergy.toFixed(1).replace(".", ","),
            }),
    },
  ];

  const tables: CsvTable[] = [
    {
      id: "summary",
      label: t("csv.summary"),
      header: [t("csv.metric"), t("csv.value")],
      rows: kpis.map((kpi) => [kpi.label, kpi.value]),
    },
    {
      id: "keys",
      label: t("breakdowns.keys"),
      header: [t("csv.key"), t("csv.songs")],
      rows: stats.keys.map((row) => [row.key, row.count]),
    },
    {
      id: "bpm",
      label: t("breakdowns.bpm"),
      header: [t("csv.range"), t("csv.songs")],
      rows: bpmRows.map((row) => [row.label, row.count]),
    },
    {
      id: "energy",
      label: t("breakdowns.energy"),
      header: [t("csv.energy"), t("csv.songs")],
      rows: energyRows.map((row) => [row.label, row.count]),
    },
    {
      id: "genres",
      label: t("breakdowns.genres"),
      header: [t("csv.genre"), t("csv.songs")],
      rows: stats.genres.map((row) => [formatGenre(row.key), row.count]),
    },
    {
      id: "artists",
      label: t("breakdowns.artists"),
      header: [t("csv.artist"), t("csv.songs")],
      rows: stats.artists.map((row) => [row.key, row.count]),
    },
    {
      id: "coverage",
      label: t("coverage.title"),
      header: [t("csv.field"), t("csv.filled"), t("csv.total")],
      rows: coverage.map(([field, count]) => [
        t(`coverage.${field}`),
        count,
        stats.totalSongs,
      ]),
    },
  ];
  if (timeseries?.scope === "user") {
    tables.push({
      id: "activity",
      label: t("activity.title"),
      header: [
        t("csv.date"),
        t("activity.mySongs"),
        t("activity.mySetlists"),
        t("activity.myGigs"),
      ],
      rows: timeseries.songs_created.map((point, i) => [
        point.date,
        point.count,
        timeseries.setlists_created[i]?.count ?? 0,
        timeseries.gigs_created[i]?.count ?? 0,
      ]),
    });
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          <p className="text-muted-foreground mt-1">{subtitle}</p>
        </div>
        <ReportExportMenu
          targetRef={reportRef}
          title={title}
          tables={tables}
          allowed={canExport}
        />
      </div>

      {loadError && <LoadErrorNotice />}

      <div ref={reportRef} className="space-y-8">
        <section aria-labelledby="kpi-title" className="space-y-3">
          <h2
            id="kpi-title"
            className="text-muted-foreground text-xs font-semibold tracking-wider uppercase"
          >
            {t("kpi.title")}
          </h2>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {kpis.map(({ icon: Icon, label, value, hint }) => (
              <div key={label} className="bg-card rounded-xl border p-3">
                <dt className="text-muted-foreground flex items-center gap-1.5 text-xs">
                  <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  <span className="truncate">{label}</span>
                </dt>
                <dd className="mt-1 text-2xl font-bold tabular-nums">
                  {value}
                </dd>
                {hint && (
                  <dd className="text-muted-foreground text-xs">{hint}</dd>
                )}
              </div>
            ))}
          </dl>
        </section>

        <section aria-labelledby="activity-title" className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 id="activity-title" className="text-lg font-semibold">
                {t("activity.title")}
              </h2>
              <p className="text-muted-foreground text-sm">
                {t("activity.subtitle")}
              </p>
            </div>
            <div
              className="flex items-center gap-1 self-start rounded-md border p-1"
              role="group"
              aria-label={t("activity.rangeLabel")}
              data-export-ignore
            >
              {RANGE_OPTIONS.map((option) => (
                <Button
                  key={option}
                  size="sm"
                  variant="ghost"
                  disabled={isPending}
                  aria-pressed={days === option}
                  onClick={() => handleRangeChange(option)}
                  className={cn(
                    "h-8",
                    days === option && "bg-muted font-medium",
                  )}
                >
                  {t("activity.rangeDays", { count: option })}
                </Button>
              ))}
            </div>
          </div>

          {timeseries?.scope === "admin" && (
            <div className="grid gap-4 md:grid-cols-2">
              <ActivityChart
                title={t("activity.newUsers")}
                label={t("activity.newUsers")}
                data={timeseries.users_registered}
                color="var(--chart-1)"
              />
              <ActivityChart
                title={t("activity.newSongs")}
                label={t("activity.newSongs")}
                data={timeseries.songs_created}
                color="var(--chart-2)"
              />
              <ActivityChart
                title={t("activity.newSetlists")}
                label={t("activity.newSetlists")}
                data={timeseries.setlists_created}
                color="var(--chart-3)"
              />
              <ActivityChart
                title={t("activity.newBands")}
                label={t("activity.newBands")}
                data={timeseries.bands_created}
                color="var(--chart-4)"
              />
            </div>
          )}
          {timeseries?.scope === "user" && (
            <div className="grid gap-4 md:grid-cols-3">
              <ActivityChart
                title={t("activity.mySongs")}
                label={t("activity.mySongs")}
                data={timeseries.songs_created}
                color="var(--chart-1)"
              />
              <ActivityChart
                title={t("activity.mySetlists")}
                label={t("activity.mySetlists")}
                data={timeseries.setlists_created}
                color="var(--chart-1)"
              />
              <ActivityChart
                title={t("activity.myGigs")}
                label={t("activity.myGigs")}
                data={timeseries.gigs_created}
                color="var(--chart-1)"
              />
            </div>
          )}
        </section>

        <section aria-labelledby="repertoire-title" className="space-y-4">
          <div>
            <h2 id="repertoire-title" className="text-lg font-semibold">
              {t("breakdowns.title")}
            </h2>
            <p className="text-muted-foreground text-sm">
              {t("breakdowns.subtitle")}
            </p>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <BreakdownCard
              title={t("breakdowns.keys")}
              description={t("breakdowns.keysHint", {
                missing: stats.missing.key,
              })}
            >
              <BreakdownBars rows={keyRows} emptyText={t("breakdowns.empty")} />
            </BreakdownCard>
            <BreakdownCard
              title={t("breakdowns.bpm")}
              description={t("breakdowns.bpmHint", {
                missing: stats.missing.bpm,
              })}
            >
              <BreakdownBars rows={bpmRows} emptyText={t("breakdowns.empty")} />
            </BreakdownCard>
            <BreakdownCard
              title={t("breakdowns.energy")}
              description={t("breakdowns.energyHint", {
                missing: stats.missing.energy,
              })}
            >
              <BreakdownBars
                rows={energyRows}
                emptyText={t("breakdowns.empty")}
              />
            </BreakdownCard>
            <BreakdownCard
              title={t("breakdowns.genres")}
              description={t("breakdowns.topHint")}
            >
              <BreakdownBars
                rows={genreRows}
                emptyText={t("breakdowns.empty")}
              />
            </BreakdownCard>
            <BreakdownCard
              title={t("breakdowns.artists")}
              description={t("breakdowns.topHint")}
            >
              <BreakdownBars
                rows={artistRows}
                emptyText={t("breakdowns.empty")}
              />
            </BreakdownCard>
            <BreakdownCard
              title={t("coverage.title")}
              description={t("coverage.subtitle")}
            >
              <ul className="space-y-2.5">
                {coverage.map(([field, count]) => {
                  const percent = stats.totalSongs
                    ? Math.round((count / stats.totalSongs) * 100)
                    : 0;
                  return (
                    <li key={field} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>{t(`coverage.${field}`)}</span>
                        <span className="text-muted-foreground font-mono text-xs tabular-nums">
                          {count}/{stats.totalSongs} · {percent}%
                        </span>
                      </div>
                      <div
                        className="bg-muted h-2 overflow-hidden rounded-full"
                        role="progressbar"
                        aria-label={t(`coverage.${field}`)}
                        aria-valuenow={percent}
                        aria-valuemin={0}
                        aria-valuemax={100}
                      >
                        <div
                          className={cn(
                            "h-full rounded-full",
                            percent === 100 ? "bg-emerald-500" : "bg-primary",
                          )}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </BreakdownCard>
          </div>
        </section>

        {metrics?.scope === "admin" && (
          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold">{t("platform.title")}</h2>
              <p className="text-muted-foreground text-sm">
                {t("platform.subtitle")}
              </p>
            </div>
            <AdminMetricsCharts data={metrics} />
          </section>
        )}
      </div>
    </div>
  );
}

function BreakdownCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

/** "12 h 40 min" style total for the whole repertoire. */
function formatHours(seconds: number): string {
  if (seconds < 3600) return formatDuration(seconds);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  return `${hours}h${String(minutes).padStart(2, "0")}`;
}
