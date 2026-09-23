import { getTranslations } from "next-intl/server";
import { Coffee, GripVertical, TrendingUp, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

type Row =
  | {
      kind: "song";
      title: string;
      tone: string;
      bpm: number;
      energy: number;
      duration: string;
    }
  | { kind: "break"; minutes: number };

const ROWS: Row[] = [
  {
    kind: "song",
    title: "Céu de Agosto",
    tone: "A",
    bpm: 124,
    energy: 4,
    duration: "3:48",
  },
  {
    kind: "song",
    title: "Estrada de Terra",
    tone: "G",
    bpm: 92,
    energy: 3,
    duration: "4:12",
  },
  {
    kind: "song",
    title: "Luz do Farol",
    tone: "D",
    bpm: 108,
    energy: 3,
    duration: "3:35",
  },
  {
    kind: "song",
    title: "Maré Alta",
    tone: "E",
    bpm: 140,
    energy: 5,
    duration: "3:02",
  },
  { kind: "break", minutes: 15 },
  {
    kind: "song",
    title: "Noite Clara",
    tone: "C",
    bpm: 76,
    energy: 2,
    duration: "4:40",
  },
  {
    kind: "song",
    title: "Vento Sul",
    tone: "Am",
    bpm: 118,
    energy: 4,
    duration: "3:27",
  },
  {
    kind: "song",
    title: "Último Trem",
    tone: "B",
    bpm: 136,
    energy: 5,
    duration: "3:55",
  },
];

const SONGS = ROWS.filter((row) => row.kind === "song");

function EnergyBar({ value }: { value: number }) {
  return (
    <span className="flex items-end gap-0.5" title={`${value}/5`}>
      {[1, 2, 3, 4, 5].map((level) => (
        <span
          key={level}
          className={cn(
            "w-1 rounded-sm",
            level <= value ? "bg-primary" : "bg-muted-foreground/20",
          )}
          style={{ height: `${4 + level * 2}px` }}
        />
      ))}
    </span>
  );
}

/** Energy (solid) and BPM (dashed) curves across the setlist. */
function FlowChart({ energy, bpm }: { energy: string; bpm: string }) {
  const width = 280;
  const height = 64;
  const step = width / (SONGS.length - 1);
  const energyPoints = SONGS.map(
    (s, i) =>
      `${i * step},${height - 6 - ((s.energy - 1) / 4) * (height - 12)}`,
  ).join(" ");
  const bpmPoints = SONGS.map(
    (s, i) => `${i * step},${height - 6 - ((s.bpm - 70) / 80) * (height - 12)}`,
  ).join(" ");

  return (
    <div>
      <svg
        viewBox={`-4 0 ${width + 8} ${height}`}
        className="h-16 w-full overflow-visible"
        preserveAspectRatio="none"
      >
        <polyline
          points={bpmPoints}
          fill="none"
          stroke="var(--chart-2)"
          strokeWidth="2"
          strokeDasharray="4 4"
          vectorEffect="non-scaling-stroke"
        />
        <polyline
          points={energyPoints}
          fill="none"
          stroke="var(--chart-1)"
          strokeWidth="2.5"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="text-muted-foreground mt-2 flex gap-4 text-[11px]">
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded bg-[var(--chart-1)]" />
          {energy}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0 w-4 border-t-2 border-dashed border-[var(--chart-2)]" />
          {bpm}
        </span>
      </div>
    </div>
  );
}

/**
 * Illustration of a setlist: running order with key, BPM, energy and
 * duration, the flow chart and two generated insights. Decorative.
 */
export async function SetlistMock({ className }: { className?: string }) {
  const t = await getTranslations("landing.mock");

  return (
    <div
      aria-hidden
      className={cn(
        "bg-card overflow-hidden rounded-2xl border shadow-xl shadow-black/5 select-none dark:shadow-black/30",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <div>
          <p className="text-sm font-semibold">{t("setlistTitle")}</p>
          <p className="text-muted-foreground text-xs">{t("setlistMeta")}</p>
        </div>
        <span className="bg-primary/10 text-primary rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums">
          52 min
        </span>
      </div>

      <ol className="divide-y text-xs">
        {ROWS.map((row, index) =>
          row.kind === "break" ? (
            <li
              key={`break-${index}`}
              className="bg-muted/50 text-muted-foreground flex items-center gap-2 px-4 py-1.5"
            >
              <Coffee className="size-3.5" />
              {t("break", { minutes: row.minutes })}
            </li>
          ) : (
            <li
              key={row.title}
              className="grid grid-cols-[1rem_minmax(0,1fr)_2rem_3.25rem_2.5rem] items-center gap-2 px-4 py-2 sm:grid-cols-[1rem_minmax(0,1fr)_2rem_3.25rem_2.5rem_2.5rem]"
            >
              <GripVertical className="text-muted-foreground/50 size-3.5" />
              <span className="truncate font-medium">{row.title}</span>
              <span className="text-muted-foreground font-mono">
                {row.tone}
              </span>
              <span className="text-muted-foreground tabular-nums">
                {row.bpm} BPM
              </span>
              <EnergyBar value={row.energy} />
              <span className="text-muted-foreground hidden text-right tabular-nums sm:block">
                {row.duration}
              </span>
            </li>
          ),
        )}
      </ol>

      <div className="border-t px-4 py-4">
        <FlowChart energy={t("energy")} bpm={t("bpm")} />
        <div className="mt-4 grid gap-2 text-xs">
          <p className="flex items-start gap-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-emerald-800 dark:text-emerald-200">
            <TrendingUp className="mt-px size-3.5 shrink-0" />
            {t("insightStrength")}
          </p>
          <p className="flex items-start gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-amber-900 dark:text-amber-200">
            <TriangleAlert className="mt-px size-3.5 shrink-0" />
            {t("insightImprove")}
          </p>
        </div>
      </div>
    </div>
  );
}
