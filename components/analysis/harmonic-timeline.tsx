"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import {
  formatDegree,
  prettyAccidentals,
  type SheetSection,
} from "@/lib/music/analysis";
import type { ChordReading, KeyRegion } from "@/lib/music/analysis-insights";
import { FUNCTION_COLOR } from "./analysis-marks";
import { useSectionLabel } from "./analysis-insights";

/**
 * The whole song at a glance: one cell per chord, coloured by its
 * function (pale where only the assistant read it), under its section,
 * over the keys it goes through. Tension and rest, section by section —
 * and a way to jump to any chord.
 */
export function HarmonicTimeline({
  readings,
  sections,
  regions,
  selected = null,
  range = null,
  onSelect,
  className,
}: {
  readings: readonly ChordReading[];
  sections: readonly SheetSection[];
  regions: readonly KeyRegion[];
  selected?: number | null;
  range?: [number, number] | null;
  onSelect?: (index: number, extend: boolean) => void;
  className?: string;
}) {
  const t = useTranslations("analysis.timeline");
  const tFn = useTranslations("analysis.functions");
  const sectionLabel = useSectionLabel();
  const count = readings.length;
  if (!count) return null;

  const columns = `repeat(${count}, minmax(0.45rem, 1fr))`;
  const inRange = (i: number) => !!range && i >= range[0] && i <= range[1];

  return (
    <div className={cn("space-y-2", className)}>
      <div className="overflow-x-auto pb-1">
        <div
          className="grid gap-x-px gap-y-1"
          style={{
            gridTemplateColumns: columns,
            minWidth: `${Math.min(count * 0.55, 200)}rem`,
          }}
        >
          {sections.map((section, i) => {
            const first = section.chords[0];
            const last = section.chords[section.chords.length - 1];
            return (
              <span
                key={`s${i}`}
                className="text-muted-foreground truncate border-l pl-1 text-[0.62rem] font-bold tracking-[0.1em] uppercase first:border-l-0"
                style={{
                  gridColumn: `${first + 1} / ${last + 2}`,
                  gridRow: 1,
                }}
                title={sectionLabel(section)}
              >
                {sectionLabel(section)}
              </span>
            );
          })}

          {readings.map((reading) => {
            const color = reading.fn ? FUNCTION_COLOR[reading.fn] : undefined;
            const degree = reading.degree ? formatDegree(reading.degree) : "";
            const label = [
              reading.symbol,
              degree && prettyAccidentals(degree),
              reading.fn && tFn(`${reading.fn}.name`),
              reading.inferred && t("inferred"),
            ]
              .filter(Boolean)
              .join(" · ");
            const isSelected = selected === reading.index;
            return (
              <button
                key={reading.index}
                type="button"
                tabIndex={-1}
                onClick={(event) => onSelect?.(reading.index, event.shiftKey)}
                disabled={!onSelect}
                title={label}
                aria-label={label}
                className={cn(
                  "relative h-7 rounded-[3px] transition-transform outline-none hover:scale-y-110 disabled:cursor-default",
                  !color && "bg-muted",
                  isSelected &&
                    "ring-foreground ring-offset-background z-10 ring-2 ring-offset-1",
                  inRange(reading.index) &&
                    !isSelected &&
                    "ring-primary ring-2",
                )}
                style={{
                  gridRow: 2,
                  gridColumn: reading.index + 1,
                  backgroundColor: color,
                  opacity:
                    color && (reading.fnInferred || reading.inferred) ? 0.4 : 1,
                }}
              />
            );
          })}

          {regions.map((region, i) => (
            <span
              key={`r${region.from}`}
              className={cn(
                "flex h-4 items-center overflow-hidden rounded-[3px] px-1 text-[0.6rem] font-bold",
                i % 2 === 0 ? "bg-primary/15" : "bg-primary/35",
              )}
              style={{
                gridRow: 3,
                gridColumn: `${region.from + 1} / ${region.to + 2}`,
              }}
              title={t("region", { key: region.key })}
            >
              <span className="truncate">{prettyAccidentals(region.key)}</span>
            </span>
          ))}
        </div>
      </div>
      <ul className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.68rem]">
        {(["T", "SD", "D"] as const).map((fn) => (
          <li key={fn} className="inline-flex items-center gap-1.5">
            <span
              className="size-2.5 rounded-sm"
              style={{ backgroundColor: FUNCTION_COLOR[fn] }}
              aria-hidden
            />
            {tFn(`${fn}.name`)}
          </li>
        ))}
        <li className="inline-flex items-center gap-1.5">
          <span className="bg-muted size-2.5 rounded-sm border" aria-hidden />
          {t("none")}
        </li>
        <li className="inline-flex items-center gap-1.5">
          <span
            className="size-2.5 rounded-sm opacity-40"
            style={{ backgroundColor: FUNCTION_COLOR.T }}
            aria-hidden
          />
          {t("inferredLegend")}
        </li>
      </ul>
    </div>
  );
}
