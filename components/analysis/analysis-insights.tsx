"use client";

import { useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { ANNOTATION_MARK } from "@/lib/music/chordpro";
import {
  HARMONIC_FUNCTIONS,
  prettyAccidentals,
  type HarmonicFunction,
  type SheetSection,
} from "@/lib/music/analysis";
import {
  CHORD_CATEGORIES,
  ROOT_MOTIONS,
  type AnalysisStats,
  type SectionProgression,
} from "@/lib/music/analysis-insights";
import { DegreeText, FUNCTION_COLOR } from "./analysis-marks";

const NONE_COLOR = "var(--muted-foreground)";

const CATEGORY_COLOR: Record<(typeof CHORD_CATEGORIES)[number], string> = {
  diatonic: "var(--an-fn-t)",
  secondaryDominant: "var(--an-dominant)",
  substitute: "var(--an-subv)",
  relatedTwo: "var(--an-twofive)",
  borrowed: "var(--an-aem)",
  diminished: "var(--an-deceptive)",
  chromatic: "var(--an-other)",
};

/** The name of a section, as the sheet's headings print it. */
export function useSectionLabel() {
  const tSection = useTranslations("lyrics.toolbar");
  const t = useTranslations("analysis.sections");
  return (section: SheetSection) => {
    if (!section.section) {
      return (
        section.raw.split(ANNOTATION_MARK).join("").trim() || t("untitled")
      );
    }
    const parts = [tSection(section.section)];
    if (section.heading?.number) parts.push(section.heading.number);
    return parts.join(" ");
  };
}

function Block({
  title,
  hint,
  children,
  className,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-2", className)}>
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        {hint && <p className="text-muted-foreground text-xs">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

/** A labelled horizontal bar, its length relative to `max`. */
function Bar({
  label,
  value,
  max,
  color,
  suffix,
}: {
  label: React.ReactNode;
  value: number;
  max: number;
  color: string;
  suffix?: string;
}) {
  const width = max > 0 ? Math.max(value > 0 ? 3 : 0, (value / max) * 100) : 0;
  return (
    <li className="grid grid-cols-[minmax(0,7.5rem)_minmax(0,1fr)_2.25rem] items-center gap-2 text-xs">
      <span className="truncate">{label}</span>
      <span className="bg-muted h-2 overflow-hidden rounded-full">
        <span
          className="block h-full rounded-full"
          style={{ width: `${width}%`, backgroundColor: color }}
        />
      </span>
      <span className="text-muted-foreground text-right tabular-nums">
        {value}
        {suffix}
      </span>
    </li>
  );
}

/**
 * The analysis in numbers: how complex it is, how its chords split among
 * the functions and the kinds of chords, the degrees it leans on, how the
 * functions follow each other and the roots move, the progressions it
 * repeats and the keys it goes through. Chords not analysed yet are read
 * by the assistant, and that share is said up front.
 */
export function AnalysisInsights({
  stats,
  onSelect,
  layout = "column",
  className,
}: {
  stats: AnalysisStats;
  onSelect?: (index: number) => void;
  /** `grid` spreads the blocks over columns (the view mode's card). */
  layout?: "column" | "grid";
  className?: string;
}) {
  const t = useTranslations("analysis.insights");
  const tFn = useTranslations("analysis.functions");
  const total = stats.total || 1;
  const percent = (n: number) => Math.round((n / total) * 100);
  const fnOrder: (HarmonicFunction | "none")[] = [
    ...HARMONIC_FUNCTIONS,
    "none",
  ];
  const fnColor = (fn: HarmonicFunction | "none") =>
    fn === "none" ? NONE_COLOR : FUNCTION_COLOR[fn];
  const maxCategory = Math.max(...Object.values(stats.categories), 1);
  const topDegrees = stats.degrees.slice(0, 8);
  const maxDegree = topDegrees[0]?.count ?? 1;
  const motions = ROOT_MOTIONS.map((m) => ({ id: m, count: stats.motions[m] }))
    .filter((m) => m.count > 0)
    .sort((a, b) => b.count - a.count);
  const maxMotion = motions[0]?.count ?? 1;
  const maxFlow = Math.max(...Object.values(stats.transitions), 1);

  if (stats.total === 0) {
    return <p className="text-muted-foreground text-sm">{t("empty")}</p>;
  }

  return (
    <div
      className={cn(
        layout === "grid"
          ? "grid gap-x-10 gap-y-7 md:grid-cols-2 xl:grid-cols-3"
          : "space-y-6",
        className,
      )}
    >
      <Block
        title={t("complexity")}
        hint={t(`levelHints.${stats.complexity.level}`)}
      >
        <div className="flex items-center gap-3">
          <div
            className="relative size-14 shrink-0"
            role="img"
            aria-label={t("complexityValue", { score: stats.complexity.score })}
          >
            <svg viewBox="0 0 36 36" className="size-full -rotate-90">
              <circle
                cx="18"
                cy="18"
                r="15.5"
                fill="none"
                stroke="var(--muted)"
                strokeWidth="4"
              />
              <circle
                cx="18"
                cy="18"
                r="15.5"
                fill="none"
                stroke="var(--primary)"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={`${(stats.complexity.score / 100) * 97.4} 97.4`}
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-sm font-bold tabular-nums">
              {stats.complexity.score}
            </span>
          </div>
          <div className="min-w-0 space-y-0.5">
            <p className="font-semibold">
              {t(`levels.${stats.complexity.level}`)}
            </p>
            <p className="text-muted-foreground text-xs">
              {t("vocabulary", {
                chords: stats.distinctChords,
                degrees: stats.distinctDegrees,
              })}
            </p>
            <p className="text-muted-foreground text-xs">
              {t("coverage", {
                analysed: stats.analysed,
                inferred: stats.inferred,
              })}
            </p>
          </div>
        </div>
      </Block>

      <Block title={t("functions")} hint={t("functionsHint")}>
        <div className="bg-muted flex h-3 overflow-hidden rounded-full">
          {fnOrder.map((fn) =>
            stats.functions[fn] > 0 ? (
              <span
                key={fn}
                className="h-full"
                style={{
                  width: `${(stats.functions[fn] / total) * 100}%`,
                  backgroundColor: fnColor(fn),
                  opacity: fn === "none" ? 0.35 : 1,
                }}
                title={`${fn === "none" ? t("noFunction") : tFn(`${fn}.name`)}: ${stats.functions[fn]}`}
              />
            ) : null,
          )}
        </div>
        <ul className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
          {fnOrder.map((fn) => (
            <li key={fn} className="flex items-center gap-1.5">
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{
                  backgroundColor: fnColor(fn),
                  opacity: fn === "none" ? 0.35 : 1,
                }}
                aria-hidden
              />
              <span className="min-w-0 flex-1 truncate">
                {fn === "none" ? t("noFunction") : tFn(`${fn}.name`)}
              </span>
              <span className="text-muted-foreground tabular-nums">
                {percent(stats.functions[fn])}%
              </span>
            </li>
          ))}
        </ul>
      </Block>

      <Block title={t("categories")} hint={t("categoriesHint")}>
        <ul className="space-y-1.5">
          {CHORD_CATEGORIES.map((category) => (
            <Bar
              key={category}
              label={t(`categoryNames.${category}`)}
              value={stats.categories[category]}
              max={maxCategory}
              color={CATEGORY_COLOR[category]}
            />
          ))}
        </ul>
      </Block>

      {topDegrees.length > 0 && (
        <Block title={t("degrees")}>
          <ul className="space-y-1.5">
            {topDegrees.map((d) => (
              <Bar
                key={d.label}
                label={
                  <span className="font-serif font-semibold">
                    {prettyAccidentals(d.label)}
                  </span>
                }
                value={d.count}
                max={maxDegree}
                color="var(--primary)"
              />
            ))}
          </ul>
        </Block>
      )}

      <Block title={t("flow")} hint={t("flowHint")}>
        <table className="w-full table-fixed text-center text-xs">
          <thead>
            <tr>
              <th className="text-muted-foreground w-10 text-[0.65rem] font-medium">
                <span className="sr-only">{t("flowFrom")}</span>
                <ArrowRight className="mx-auto h-3 w-3" aria-hidden />
              </th>
              {HARMONIC_FUNCTIONS.map((fn) => (
                <th
                  key={fn}
                  scope="col"
                  className="pb-1 font-bold"
                  style={{ color: FUNCTION_COLOR[fn] }}
                >
                  {fn}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {HARMONIC_FUNCTIONS.map((from) => (
              <tr key={from}>
                <th
                  scope="row"
                  className="pr-1 text-right font-bold"
                  style={{ color: FUNCTION_COLOR[from] }}
                >
                  {from}
                </th>
                {HARMONIC_FUNCTIONS.map((to) => {
                  const count = stats.transitions[`${from}>${to}`] ?? 0;
                  return (
                    <td key={to} className="p-0.5">
                      <span
                        className="flex h-8 items-center justify-center rounded-md font-semibold tabular-nums"
                        style={{
                          backgroundColor: `color-mix(in oklch, ${FUNCTION_COLOR[to]} ${Math.round((count / maxFlow) * 55)}%, var(--muted))`,
                        }}
                        title={t("flowCell", { from, to, count })}
                      >
                        {count || "·"}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </Block>

      {motions.length > 0 && (
        <Block title={t("motion")} hint={t("motionHint")}>
          <ul className="space-y-1.5">
            {motions.map((m) => (
              <Bar
                key={m.id}
                label={t(`motions.${m.id}`)}
                value={m.count}
                max={maxMotion}
                color="var(--an-twofive)"
              />
            ))}
          </ul>
        </Block>
      )}

      <Block title={t("progressions")} hint={t("progressionsHint")}>
        {stats.progressions.length === 0 ? (
          <p className="text-muted-foreground text-xs">{t("noProgressions")}</p>
        ) : (
          <ul className="space-y-1">
            {stats.progressions.map((p) => {
              const content = (
                <>
                  <span className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-1.5 font-serif text-sm font-semibold">
                    {p.labels.map((label, i) => (
                      <span
                        key={i}
                        className="inline-flex items-baseline gap-1.5"
                      >
                        {i > 0 && (
                          <span className="text-muted-foreground font-sans text-xs">
                            –
                          </span>
                        )}
                        {prettyAccidentals(label)}
                      </span>
                    ))}
                  </span>
                  <span className="bg-muted rounded-full px-1.5 text-[0.65rem] font-bold tabular-nums">
                    ×{p.starts.length}
                  </span>
                </>
              );
              return (
                <li key={`${p.labels.join("-")}-${p.starts[0]}`}>
                  {onSelect ? (
                    <button
                      type="button"
                      onClick={() => onSelect(p.starts[0])}
                      className="hover:bg-muted/60 focus-visible:ring-ring/50 -mx-1.5 flex w-[calc(100%+0.75rem)] items-center gap-2 rounded-md px-1.5 py-1 text-left outline-none focus-visible:ring-3"
                    >
                      {content}
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 py-1">
                      {content}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Block>

      {stats.regions.length > 0 && (
        <Block title={t("regions")} hint={t("regionsHint")}>
          <div className="bg-muted flex h-6 overflow-hidden rounded-md">
            {stats.regions.map((region, i) => (
              <span
                key={`${region.key}-${region.from}`}
                className={cn(
                  "flex h-full min-w-0 items-center justify-center overflow-hidden px-1 text-[0.65rem] font-bold",
                  i % 2 === 0
                    ? "bg-primary/20 text-foreground"
                    : "bg-primary/45 text-foreground",
                )}
                style={{
                  width: `${((region.to - region.from + 1) / total) * 100}%`,
                }}
                title={t("regionRange", {
                  key: region.key,
                  from: region.from + 1,
                  to: region.to + 1,
                })}
              >
                <span className="truncate">
                  {prettyAccidentals(region.key)}
                </span>
              </span>
            ))}
          </div>
          <p className="text-muted-foreground text-xs">
            {t("regionCount", {
              count: new Set(stats.regions.map((r) => r.key)).size,
            })}
          </p>
        </Block>
      )}
    </div>
  );
}

/**
 * The song's progression in degrees, section by section — the "cifra em
 * graus" a chart is read from when it's transposed or taught. Degrees the
 * assistant read stand in, in italics, for chords not analysed yet.
 */
export function SectionProgressions({
  sections,
  showChords = true,
  onSelect,
  className,
}: {
  sections: readonly SectionProgression[];
  showChords?: boolean;
  onSelect?: (index: number) => void;
  className?: string;
}) {
  const t = useTranslations("analysis.sections");
  const label = useSectionLabel();
  const any = sections.some((s) => s.chords.some((c) => c.degree));
  if (!sections.length) {
    return <p className="text-muted-foreground text-sm">{t("empty")}</p>;
  }
  return (
    <div className={cn("space-y-4", className)}>
      {sections.map(({ section, chords }, i) => (
        <section key={i} className="space-y-1.5">
          <h4 className="text-muted-foreground text-[0.7rem] font-bold tracking-[0.12em] uppercase">
            {label(section)}
          </h4>
          <ol className="flex flex-wrap gap-1">
            {chords.map((chord) => {
              const color = chord.fn ? FUNCTION_COLOR[chord.fn] : undefined;
              const content = (
                <>
                  <span
                    className={cn(
                      "flex min-h-5 items-baseline text-sm",
                      chord.inferred && "italic opacity-60",
                    )}
                    style={{ color }}
                  >
                    {chord.degree ? (
                      <DegreeText degree={chord.degree} />
                    ) : (
                      <span className="text-muted-foreground">–</span>
                    )}
                  </span>
                  {showChords && (
                    <span className="text-muted-foreground font-mono text-[0.65rem] font-semibold">
                      {chord.symbol}
                    </span>
                  )}
                </>
              );
              return (
                <li key={chord.index}>
                  {onSelect ? (
                    <button
                      type="button"
                      onClick={() => onSelect(chord.index)}
                      className="hover:bg-muted focus-visible:ring-ring/50 flex flex-col items-center rounded-md border px-1.5 py-1 leading-tight outline-none focus-visible:ring-3"
                    >
                      {content}
                    </button>
                  ) : (
                    <div className="flex flex-col items-center rounded-md border px-1.5 py-1 leading-tight">
                      {content}
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        </section>
      ))}
      {any && sections.some((s) => s.chords.some((c) => c.inferred)) && (
        <p className="text-muted-foreground text-xs italic">
          {t("inferredHint")}
        </p>
      )}
    </div>
  );
}
