"use client";

import { useId, useMemo } from "react";
import { useTranslations } from "next-intl";
import { SetlistItem } from "@/types/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
  ReferenceLine,
  Tooltip,
  Dot,
} from "recharts";
import { Music2, Rows3, Coffee } from "lucide-react";

interface SetlistTempoChartProps {
  items: SetlistItem[];
}

interface ChartPoint {
  x: number;
  title: string;
  artist_name: string;
  tempo: number | null;
  tonality: string | null;
}

interface Marker {
  x: number;
  kind: "block" | "break";
  label: string;
}

// Energy zones — purely a visual read of "how intense does this song feel
// tempo-wise", not a musical fact. Thresholds are deliberately broad.
function energyColor(tempo: number | null): string {
  if (tempo === null) return "var(--muted-foreground)";
  if (tempo < 90) return "var(--chart-2)"; // calm / ballad
  if (tempo < 130) return "var(--chart-4)"; // mid energy
  return "var(--chart-5)"; // high energy
}

export function SetlistTempoChart({ items }: SetlistTempoChartProps) {
  const t = useTranslations("setlists.analytics");
  const gradientId = useId();

  const { points, markers, stats } = useMemo(() => {
    const points: ChartPoint[] = [];
    const markers: Marker[] = [];
    let songIndex = 0;

    for (const item of items) {
      if (item.item_type === "song") {
        songIndex += 1;
        points.push({
          x: songIndex,
          title: item.song.title,
          artist_name: item.song.artist_name,
          tempo: item.song.tempo ?? null,
          tonality: item.song.tonality ?? null,
        });
      } else if (item.item_type === "block") {
        markers.push({ x: songIndex + 0.5, kind: "block", label: item.name });
      } else {
        markers.push({
          x: songIndex + 0.5,
          kind: "break",
          label: item.label || t("breakDefaultLabel"),
        });
      }
    }

    const withTempo = points.filter((p) => p.tempo !== null) as (ChartPoint & {
      tempo: number;
    })[];

    const stats =
      withTempo.length > 0
        ? {
            avg: Math.round(
              withTempo.reduce((sum, p) => sum + p.tempo, 0) / withTempo.length,
            ),
            highest: withTempo.reduce((a, b) => (b.tempo > a.tempo ? b : a)),
            lowest: withTempo.reduce((a, b) => (b.tempo < a.tempo ? b : a)),
            missing: points.length - withTempo.length,
          }
        : null;

    return { points, markers, stats };
  }, [items, t]);

  const chartConfig = {
    tempo: {
      label: t("bpmAxisLabel"),
      color: "var(--chart-1)",
    },
  } satisfies ChartConfig;

  const titleByIndex = useMemo(() => {
    const map = new Map<number, string>();
    points.forEach((p) => map.set(p.x, p.title));
    return map;
  }, [points]);

  if (points.length === 0) {
    return (
      <Card>
        <CardContent className="text-muted-foreground py-10 text-center text-sm">
          {t("empty")}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {stats && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                {t("stats.average")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.avg} BPM</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                {t("stats.peak")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.highest.tempo} BPM
              </div>
              <p className="text-muted-foreground truncate text-xs">
                {stats.highest.title}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                {t("stats.calmest")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.lowest.tempo} BPM</div>
              <p className="text-muted-foreground truncate text-xs">
                {stats.lowest.title}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                {t("stats.missing")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.missing}</div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t("chartTitle")}</CardTitle>
          <CardDescription>{t("chartDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-96 w-full">
            <AreaChart
              accessibilityLayer
              data={points}
              margin={{ left: 0, right: 20, top: 10, bottom: 10 }}
            >
              <defs>
                <linearGradient
                  id={`fill-${gradientId}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor="var(--chart-1)"
                    stopOpacity={0.35}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--chart-1)"
                    stopOpacity={0.02}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="x"
                type="number"
                domain={[0.5, points.length + 0.5]}
                ticks={points.map((p) => p.x)}
                tickFormatter={(value: number) =>
                  titleByIndex.get(value) ? String(value) : ""
                }
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <YAxis
                dataKey="tempo"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                width={40}
                label={{
                  value: t("bpmAxisLabel"),
                  angle: -90,
                  position: "insideLeft",
                  className: "fill-muted-foreground text-xs",
                }}
              />

              {markers.map((marker, i) => (
                <ReferenceLine
                  key={i}
                  x={marker.x}
                  stroke="var(--border)"
                  strokeDasharray="4 4"
                  label={{
                    value:
                      marker.kind === "block"
                        ? `▤ ${marker.label}`
                        : `☕ ${marker.label}`,
                    position: "top",
                    className: "fill-muted-foreground text-[10px]",
                  }}
                />
              ))}

              <Tooltip
                cursor={{ stroke: "var(--border)", strokeDasharray: "3 3" }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const p = payload[0].payload as ChartPoint;
                  return (
                    <div className="bg-background rounded-lg border px-3 py-2 text-sm shadow-md">
                      <p className="font-medium">{p.title}</p>
                      <p className="text-muted-foreground text-xs">
                        {p.artist_name}
                      </p>
                      <div className="mt-1 flex items-center gap-2 text-xs">
                        {p.tempo !== null && <span>{p.tempo} BPM</span>}
                        {p.tonality && (
                          <span className="text-muted-foreground">
                            {p.tonality}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                }}
              />

              <Area
                dataKey="tempo"
                type="monotone"
                fill={`url(#fill-${gradientId})`}
                stroke="var(--chart-1)"
                strokeWidth={2}
                connectNulls={false}
                dot={(props: unknown) => {
                  const { cx, cy, payload, index } = props as {
                    cx: number;
                    cy: number;
                    payload: ChartPoint;
                    index: number;
                  };
                  if (payload.tempo === null)
                    return <g key={`empty-${index}`} />;
                  return (
                    <Dot
                      key={`dot-${index}`}
                      cx={cx}
                      cy={cy}
                      r={4}
                      fill={energyColor(payload.tempo)}
                      stroke="var(--background)"
                      strokeWidth={1}
                    />
                  );
                }}
                activeDot={{ r: 6 }}
              />
            </AreaChart>
          </ChartContainer>

          <div className="text-muted-foreground mt-4 flex flex-wrap items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: "var(--chart-2)" }}
              />
              {t("legend.calm")}
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: "var(--chart-4)" }}
              />
              {t("legend.mid")}
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: "var(--chart-5)" }}
              />
              {t("legend.high")}
            </div>
            {markers.some((m) => m.kind === "block") && (
              <div className="flex items-center gap-1.5">
                <Rows3 className="h-3.5 w-3.5" />
                {t("legend.block")}
              </div>
            )}
            {markers.some((m) => m.kind === "break") && (
              <div className="flex items-center gap-1.5">
                <Coffee className="h-3.5 w-3.5" />
                {t("legend.break")}
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <Music2 className="h-3.5 w-3.5" />
              {t("legend.hint")}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
