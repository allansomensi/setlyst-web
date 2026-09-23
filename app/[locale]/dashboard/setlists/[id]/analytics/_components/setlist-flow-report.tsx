"use client";

import { useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  CircleCheck,
  Clock,
  Coffee,
  Gauge,
  Lightbulb,
  ListMusic,
  Rows3,
  Table2,
  TriangleAlert,
  Zap,
} from "lucide-react";
import { Link } from "@/components/nav-link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ReportExportMenu } from "@/components/content/report-export-menu";
import {
  analyzeSetlist,
  blockDurations,
  dataCoverage,
  entriesFromItems,
  keyChanges,
  songsOf,
  type FlowEntry,
  type Insight,
} from "@/lib/setlist-insights";
import {
  ENERGY_CHART_COLORS,
  ENERGY_KEYS,
  isEnergyLevel,
} from "@/lib/song-fields";
import { cn, formatDuration } from "@/lib/utils";
import type { SetlistItem } from "@/types/api";
import { insightText } from "./insight-text";

interface SetlistFlowReportProps {
  setlistId: string;
  title: string;
  items: SetlistItem[];
  canExport: boolean;
}

interface Marker {
  /** Between song `x - 0.5` and `x + 0.5`. */
  x: number;
  kind: "block" | "break";
  label: string;
}

interface Point {
  x: number;
  title: string;
  tempo: number | null;
  energy: number | null;
  tonality: string | null;
}

function markersOf(entries: FlowEntry[], breakLabel: string): Marker[] {
  const markers: Marker[] = [];
  let songs = 0;
  for (const entry of entries) {
    if (entry.kind === "song") songs += 1;
    else if (entry.kind === "block") {
      markers.push({ x: songs + 0.5, kind: "block", label: entry.name });
    } else {
      markers.push({
        x: songs + 0.5,
        kind: "break",
        label: entry.label || breakLabel,
      });
    }
  }
  return markers;
}

/**
 * The flow of a setlist: tempo and energy song by song (two charts on
 * the same song axis, never one chart with two scales), key changes,
 * music time per block, how complete the data is, and the strengths and
 * points to improve from lib/setlist-insights.ts.
 */
export function SetlistFlowReport({
  setlistId,
  title,
  items,
  canExport,
}: SetlistFlowReportProps) {
  const t = useTranslations("setlists.analytics");
  const tInsights = useTranslations("insights");
  const tEnergy = useTranslations("songs.energy");
  const reportRef = useRef<HTMLDivElement>(null);
  const [showTable, setShowTable] = useState(false);

  const entries = useMemo(() => entriesFromItems(items), [items]);
  const songs = useMemo(() => songsOf(entries), [entries]);
  const insights = useMemo(() => analyzeSetlist(entries), [entries]);
  const coverage = useMemo(() => dataCoverage(entries), [entries]);
  const blocks = useMemo(() => blockDurations(entries), [entries]);
  const changes = useMemo(() => keyChanges(entries), [entries]);
  const markers = useMemo(
    () => markersOf(entries, t("breakDefaultLabel")),
    [entries, t],
  );

  const points: Point[] = songs.map((song, index) => ({
    x: index + 1,
    title: song.title,
    tempo: song.tempo,
    energy: song.energy,
    tonality: song.tonality,
  }));

  const breakMinutes = entries.reduce(
    (sum, e) =>
      e.kind === "break" && e.durationMinutes ? sum + e.durationMinutes : sum,
    0,
  );
  const musicSeconds = songs.reduce((sum, s) => sum + (s.duration ?? 0), 0);
  const tempos = songs
    .map((s) => s.tempo)
    .filter((v): v is number => v != null);
  const energies = songs
    .map((s) => s.energy)
    .filter((v): v is number => v != null);
  const avg = (values: number[]) =>
    values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
  const avgTempo = avg(tempos);
  const avgEnergy = avg(energies);

  const strengths = insights.filter((i) => i.kind === "strength");
  const improvements = insights.filter((i) => i.kind === "improvement");

  const energyLabel = (energy: number | null) =>
    isEnergyLevel(energy) ? tEnergy(`levels.${ENERGY_KEYS[energy]}`) : "—";

  const csvTables = [
    {
      id: "order",
      label: t("csv.order"),
      header: [
        "#",
        t("table.title"),
        t("table.key"),
        t("table.bpm"),
        t("table.energy"),
        t("table.timeSignature"),
        t("table.duration"),
      ],
      rows: entries.flatMap((entry, index) => {
        if (entry.kind === "song") {
          const n = songs.indexOf(entry) + 1;
          return [
            [
              n,
              entry.title,
              entry.tonality,
              entry.tempo,
              entry.energy,
              items[index]?.item_type === "song"
                ? (items[index] as Extract<SetlistItem, { item_type: "song" }>)
                    .song.time_signature
                : null,
              entry.duration ? formatDuration(entry.duration) : null,
            ],
          ];
        }
        return [
          [
            "",
            entry.kind === "block"
              ? `[${t("legend.block")}] ${entry.name}`
              : `[${t("legend.break")}] ${entry.label ?? ""}`.trim(),
            null,
            null,
            null,
            null,
            entry.kind === "break" && entry.durationMinutes
              ? `${entry.durationMinutes} min`
              : null,
          ],
        ];
      }),
    },
    {
      id: "insights",
      label: t("csv.insights"),
      header: [t("csv.kind"), t("csv.message")],
      rows: insights.map((insight) => [
        insight.kind === "strength"
          ? tInsights("strengths")
          : tInsights("improvements"),
        insightText(insight, songs, tInsights),
      ]),
    },
  ];

  if (songs.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <ListMusic className="text-muted-foreground h-8 w-8" aria-hidden />
          <p className="text-muted-foreground text-sm">{t("emptyReport")}</p>
          <Button asChild variant="outline" size="sm">
            <Link href={`/dashboard/setlists/${setlistId}`}>
              {t("addSongs")}
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const tempoConfig = {
    tempo: { label: t("bpmAxisLabel"), color: "var(--chart-1)" },
  } satisfies ChartConfig;
  const energyConfig = {
    energy: { label: t("energyAxisLabel"), color: "var(--chart-2)" },
  } satisfies ChartConfig;
  const domain: [number, number] = [0.5, songs.length + 0.5];
  const ticks = points.map((p) => p.x);

  const markerLines = (withLabels: boolean) =>
    markers.map((marker, i) => (
      <ReferenceLine
        key={`${marker.kind}-${i}`}
        x={marker.x}
        stroke={
          marker.kind === "break" ? "var(--muted-foreground)" : "var(--border)"
        }
        strokeDasharray={marker.kind === "break" ? "4 4" : undefined}
        strokeWidth={marker.kind === "break" ? 1.5 : 1}
        label={
          withLabels
            ? {
                value: marker.label,
                position: "insideTopLeft",
                className: "fill-muted-foreground text-[10px]",
              }
            : undefined
        }
      />
    ));

  const tooltip = (
    <Tooltip
      cursor={{ stroke: "var(--border)", strokeDasharray: "3 3" }}
      content={({ active, payload }) => {
        if (!active || !payload?.length) return null;
        const p = payload[0].payload as Point;
        return (
          <div className="bg-popover text-popover-foreground rounded-lg border px-3 py-2 text-sm shadow-md">
            <p className="font-medium">
              {p.x}. {p.title}
            </p>
            <p className="text-muted-foreground text-xs">
              {[
                p.tempo != null ? `${p.tempo} BPM` : t("noBpm"),
                `${t("energyAxisLabel")}: ${energyLabel(p.energy)}`,
                p.tonality,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
        );
      }}
    />
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-end" data-export-ignore>
        <ReportExportMenu
          targetRef={reportRef}
          title={`${t("title")} ${title}`}
          tables={csvTables}
          allowed={canExport}
        />
      </div>

      <div ref={reportRef} className="space-y-6">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi
            icon={ListMusic}
            label={t("kpi.songs")}
            value={String(songs.length)}
            hint={
              blocks.filter((b) => b.name).length > 0
                ? t("kpi.blocks", {
                    count: blocks.filter((b) => b.name).length,
                  })
                : undefined
            }
          />
          <Kpi
            icon={Clock}
            label={t("kpi.duration")}
            value={formatDuration(musicSeconds + breakMinutes * 60)}
            hint={
              breakMinutes > 0
                ? t("kpi.breaks", { minutes: breakMinutes })
                : undefined
            }
          />
          <Kpi
            icon={Gauge}
            label={t("stats.average")}
            value={avgTempo != null ? `${Math.round(avgTempo)} BPM` : "—"}
          />
          <Kpi
            icon={Zap}
            label={t("kpi.energy")}
            value={avgEnergy != null ? energyLabel(Math.round(avgEnergy)) : "—"}
            hint={
              avgEnergy != null
                ? t("kpi.energyValue", {
                    value: avgEnergy.toFixed(1).replace(".", ","),
                  })
                : undefined
            }
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <InsightList
            kind="improvement"
            title={tInsights("improvements")}
            empty={tInsights("noImprovements")}
            insights={improvements}
            render={(insight) => insightText(insight, songs, tInsights)}
          />
          <InsightList
            kind="strength"
            title={tInsights("strengths")}
            empty={tInsights("noStrengths")}
            insights={strengths}
            render={(insight) => insightText(insight, songs, tInsights)}
          />
        </div>

        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div>
              <CardTitle>{t("flowTitle")}</CardTitle>
              <CardDescription>{t("flowDescription")}</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTable((v) => !v)}
              aria-pressed={showTable}
              data-export-ignore
            >
              <Table2 className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              {showTable ? t("showCharts") : t("showTable")}
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            {showTable ? (
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <caption className="sr-only">{t("tableCaption")}</caption>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">#</TableHead>
                      <TableHead>{t("table.title")}</TableHead>
                      <TableHead>{t("table.key")}</TableHead>
                      <TableHead>{t("table.bpm")}</TableHead>
                      <TableHead>{t("table.energy")}</TableHead>
                      <TableHead>{t("table.duration")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {songs.map((song, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-mono text-xs">
                          {i + 1}
                        </TableCell>
                        <TableCell className="font-medium">
                          {song.title}
                        </TableCell>
                        <TableCell className="font-mono">
                          {song.tonality ?? "—"}
                        </TableCell>
                        <TableCell className="font-mono">
                          {song.tempo ?? "—"}
                        </TableCell>
                        <TableCell>{energyLabel(song.energy)}</TableCell>
                        <TableCell className="font-mono">
                          {song.duration ? formatDuration(song.duration) : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <>
                <figure className="space-y-1">
                  <figcaption className="text-sm font-medium">
                    {t("bpmChartTitle")}
                  </figcaption>
                  <ChartContainer
                    config={tempoConfig}
                    className="h-56 w-full"
                    role="img"
                    aria-label={t("bpmChartAria", {
                      count: songs.length,
                      min: tempos.length ? Math.min(...tempos) : 0,
                      max: tempos.length ? Math.max(...tempos) : 0,
                    })}
                  >
                    <LineChart
                      data={points}
                      margin={{ left: 0, right: 16, top: 16, bottom: 0 }}
                    >
                      <CartesianGrid
                        vertical={false}
                        strokeDasharray="3 3"
                        className="stroke-muted"
                      />
                      <XAxis
                        dataKey="x"
                        type="number"
                        domain={domain}
                        ticks={ticks}
                        tickLine={false}
                        axisLine={false}
                        tickMargin={6}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        dataKey="tempo"
                        tickLine={false}
                        axisLine={false}
                        width={36}
                        domain={["dataMin - 10", "dataMax + 10"]}
                        allowDecimals={false}
                      />
                      {markerLines(true)}
                      {tooltip}
                      <Line
                        dataKey="tempo"
                        type="monotone"
                        stroke="var(--color-tempo)"
                        strokeWidth={2}
                        connectNulls={false}
                        dot={{ r: 4, strokeWidth: 2, fill: "var(--card)" }}
                        activeDot={{ r: 6 }}
                        isAnimationActive={false}
                      />
                    </LineChart>
                  </ChartContainer>
                </figure>

                <figure className="space-y-1">
                  <figcaption className="text-sm font-medium">
                    {t("energyChartTitle")}
                  </figcaption>
                  <ChartContainer
                    config={energyConfig}
                    className="h-40 w-full"
                    role="img"
                    aria-label={t("energyChartAria", { count: songs.length })}
                  >
                    <BarChart
                      data={points}
                      margin={{ left: 0, right: 16, top: 8, bottom: 0 }}
                      barCategoryGap={2}
                    >
                      <CartesianGrid
                        vertical={false}
                        strokeDasharray="3 3"
                        className="stroke-muted"
                      />
                      <XAxis
                        dataKey="x"
                        type="number"
                        domain={domain}
                        ticks={ticks}
                        tickLine={false}
                        axisLine={false}
                        tickMargin={6}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        domain={[0, 5]}
                        ticks={[1, 2, 3, 4, 5]}
                        tickLine={false}
                        axisLine={false}
                        width={36}
                      />
                      {markerLines(false)}
                      {tooltip}
                      <Bar
                        dataKey="energy"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={28}
                        isAnimationActive={false}
                      >
                        {points.map((p) => (
                          <Cell
                            key={p.x}
                            fill={
                              isEnergyLevel(p.energy)
                                ? ENERGY_CHART_COLORS[p.energy]
                                : "var(--muted)"
                            }
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ChartContainer>
                  <ul className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 pl-9 text-xs">
                    {([1, 2, 3, 4, 5] as const).map((level) => (
                      <li key={level} className="flex items-center gap-1.5">
                        <span
                          className="h-2.5 w-2.5 rounded-sm"
                          style={{ background: ENERGY_CHART_COLORS[level] }}
                          aria-hidden
                        />
                        {level}. {tEnergy(`levels.${ENERGY_KEYS[level]}`)}
                      </li>
                    ))}
                    {markers.some((m) => m.kind === "block") && (
                      <li className="flex items-center gap-1.5">
                        <Rows3 className="h-3.5 w-3.5" aria-hidden />
                        {t("legend.blockLine")}
                      </li>
                    )}
                    {markers.some((m) => m.kind === "break") && (
                      <li className="flex items-center gap-1.5">
                        <Coffee className="h-3.5 w-3.5" aria-hidden />
                        {t("legend.breakLine")}
                      </li>
                    )}
                  </ul>
                </figure>
              </>
            )}

            <section aria-labelledby="key-strip" className="space-y-2">
              <h3 id="key-strip" className="text-sm font-medium">
                {t("keysTitle")}
              </h3>
              <p className="text-muted-foreground text-xs">
                {changes.length === 0
                  ? t("keysNone")
                  : t("keysSummary", {
                      changes: Math.max(0, changes.length - 1),
                      keys: new Set(changes.map((c) => c.key)).size,
                    })}
              </p>
              <ol className="flex flex-wrap gap-1">
                {songs.map((song, i) => {
                  const change = changes.find((c) => c.index === i);
                  return (
                    <li
                      key={i}
                      title={`${i + 1}. ${song.title}`}
                      className={cn(
                        "flex h-9 min-w-9 flex-col items-center justify-center rounded-md border px-1.5 font-mono text-xs leading-none",
                        change
                          ? "border-primary/60 bg-primary/10 text-foreground font-semibold"
                          : "bg-muted/40 text-muted-foreground",
                      )}
                    >
                      <span className="text-[9px] font-normal opacity-70">
                        {i + 1}
                      </span>
                      <span>{song.tonality ?? "·"}</span>
                    </li>
                  );
                })}
              </ol>
            </section>
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("blocksTitle")}</CardTitle>
              <CardDescription>{t("blocksDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {blocks.map((block, i) => {
                  const max = Math.max(...blocks.map((b) => b.seconds), 1);
                  return (
                    <li key={i} className="space-y-1">
                      <div className="flex items-baseline justify-between gap-2 text-sm">
                        <span className="truncate font-medium">
                          {block.name ?? t("blocksUnnamed")}
                        </span>
                        <span className="text-muted-foreground shrink-0 font-mono text-xs tabular-nums">
                          {formatDuration(block.seconds)} ·{" "}
                          {t("songCount", { count: block.songCount })}
                        </span>
                      </div>
                      <div className="bg-muted h-2 overflow-hidden rounded-full">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${(block.seconds / max) * 100}%`,
                            background: "var(--chart-3)",
                          }}
                        />
                      </div>
                      {block.missing > 0 && (
                        <p className="text-muted-foreground text-xs">
                          {t("blocksMissing", { count: block.missing })}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("coverageTitle")}</CardTitle>
              <CardDescription>{t("coverageDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {(
                [
                  ["energy", coverage.energy],
                  ["tempo", coverage.tempo],
                  ["key", coverage.key],
                  ["duration", coverage.duration],
                ] as const
              ).map(([field, count]) => {
                const percent = Math.round((count / coverage.total) * 100);
                return (
                  <div key={field} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{t(`coverage.${field}`)}</span>
                      <span className="text-muted-foreground font-mono text-xs tabular-nums">
                        {count}/{coverage.total}
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
                  </div>
                );
              })}
              {(coverage.energy < coverage.total ||
                coverage.tempo < coverage.total) && (
                <Button asChild variant="outline" size="sm" data-export-ignore>
                  <Link href={`/dashboard/setlists/${setlistId}`}>
                    {t("coverageFix")}
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="bg-card rounded-xl border p-4">
      <p className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
        <Icon className="h-3.5 w-3.5" aria-hidden />
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
      {hint && <p className="text-muted-foreground text-xs">{hint}</p>}
    </div>
  );
}

function InsightList({
  kind,
  title,
  empty,
  insights,
  render,
}: {
  kind: Insight["kind"];
  title: string;
  empty: string;
  insights: Insight[];
  render: (insight: Insight) => string;
}) {
  const Icon = kind === "strength" ? CircleCheck : Lightbulb;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon
            className={cn(
              "h-4 w-4",
              kind === "strength"
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-amber-600 dark:text-amber-400",
            )}
            aria-hidden
          />
          {title}
          <span className="text-muted-foreground text-sm font-normal tabular-nums">
            ({insights.length})
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {insights.length === 0 ? (
          <p className="text-muted-foreground text-sm">{empty}</p>
        ) : (
          <ul className="space-y-3">
            {insights.map((insight, i) => (
              <li key={i} className="flex gap-2.5 text-sm leading-relaxed">
                {kind === "improvement" ? (
                  <TriangleAlert
                    className={cn(
                      "mt-0.5 h-4 w-4 shrink-0",
                      insight.severity === "high"
                        ? "text-destructive"
                        : insight.severity === "medium"
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-muted-foreground",
                    )}
                    aria-hidden
                  />
                ) : (
                  <CircleCheck
                    className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400"
                    aria-hidden
                  />
                )}
                <span>{render(insight)}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
