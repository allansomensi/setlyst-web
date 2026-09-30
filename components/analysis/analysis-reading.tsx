"use client";

import { useTranslations } from "next-intl";
import { ArrowRight, BookOpen, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  isMinorKey,
  keyAt,
  prettyAccidentals,
  type HarmonicAnalysis,
  type HarmonicFunction,
} from "@/lib/music/analysis";
import {
  describeDegree,
  roleInPatterns,
  type Concept,
  type Pattern,
} from "@/lib/music/analysis-concepts";
import { FUNCTION_COLOR } from "./analysis-marks";

/** A concept's name and explanation, with its target written as a numeral. */
function useConceptText() {
  const t = useTranslations("analysis.concepts");
  return (concept: Concept) => {
    const values = { target: prettyAccidentals(concept.target ?? "") };
    return {
      name: t(`${concept.id}.name`, values),
      hint: t(`${concept.id}.hint`, values),
    };
  };
}

function usePatternName() {
  const t = useTranslations("analysis.patterns");
  return (pattern: Pattern) => {
    const values = { target: prettyAccidentals(pattern.target ?? "") };
    const hasResolved =
      pattern.id === "twoFive" ||
      pattern.id === "twoFiveSecondary" ||
      pattern.id === "twoSubV";
    return {
      name: t(
        `${pattern.id}.${hasResolved && pattern.resolved ? "nameResolved" : "name"}`,
        values,
      ),
      hint: t(`${pattern.id}.hint`, values),
    };
  };
}

/**
 * What the chord's degree is called and what it does, read from the
 * degree and from the passage around it (a Gm7 → C7 → F in C makes the
 * Gm7 the "II relativo do V7/IV", whatever it was written as). Offers the
 * function the name implies, never setting it on its own.
 */
export function ChordReading({
  analysis,
  index,
  songKey,
  patterns,
  onUseFunction,
  onSelect,
  className,
}: {
  analysis: HarmonicAnalysis;
  index: number;
  songKey: string | null;
  patterns: readonly Pattern[];
  onUseFunction?: (fn: HarmonicFunction) => void;
  onSelect?: (index: number) => void;
  className?: string;
}) {
  const t = useTranslations("analysis.reading");
  const conceptText = useConceptText();
  const patternName = usePatternName();
  const entry = analysis.entries[String(index)];
  const minor = isMinorKey(keyAt(analysis, index, songKey));
  const own = describeDegree(entry?.degree ?? null, minor);
  const role = roleInPatterns(patterns, index);
  const primary = role ?? own;
  const secondary =
    role && own && own.id !== role.id && own.id !== "chromatic" ? own : null;
  const memberOf = patterns.filter((p) => p.chords.includes(index));

  if (!primary) {
    return (
      <p className={cn("text-muted-foreground text-xs", className)}>
        {t("empty")}
      </p>
    );
  }

  const text = conceptText(primary);
  const suggested = primary.fn ?? null;

  return (
    <div
      className={cn(
        "bg-primary/[0.04] border-primary/20 space-y-2 rounded-lg border px-3 py-2.5",
        className,
      )}
    >
      <div className="flex items-start gap-2">
        <BookOpen
          className="text-primary mt-0.5 h-3.5 w-3.5 shrink-0"
          aria-hidden
        />
        <div className="min-w-0 space-y-0.5">
          <p className="text-muted-foreground text-[0.7rem] font-semibold tracking-wide uppercase">
            {t("title")}
          </p>
          <p className="text-sm leading-snug font-semibold">{text.name}</p>
          {secondary && (
            <p className="text-muted-foreground text-xs">
              {conceptText(secondary).name}
            </p>
          )}
          <p className="text-muted-foreground text-xs leading-relaxed">
            {text.hint}
          </p>
        </div>
      </div>

      {memberOf.length > 0 && (
        <div className="space-y-1 pl-5.5">
          <p className="text-muted-foreground text-[0.7rem] font-semibold tracking-wide uppercase">
            {t("partOf")}
          </p>
          <ul className="flex flex-wrap gap-1">
            {memberOf.map((pattern) => (
              <li key={`${pattern.id}-${pattern.chords.join("-")}`}>
                <button
                  type="button"
                  onClick={() => onSelect?.(pattern.chords[0])}
                  title={patternName(pattern).hint}
                  className="bg-background hover:bg-muted focus-visible:ring-ring/50 inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium outline-none focus-visible:ring-3"
                >
                  {patternName(pattern).name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {suggested && onUseFunction && entry?.fn !== suggested && (
        <button
          type="button"
          onClick={() => onUseFunction(suggested)}
          className="hover:bg-background focus-visible:ring-ring/50 ml-5.5 inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 text-xs font-medium outline-none focus-visible:ring-3"
        >
          <Wand2 className="h-3.5 w-3.5" aria-hidden />
          {t("useFunction", { fn: suggested })}
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: FUNCTION_COLOR[suggested] }}
            aria-hidden
          />
        </button>
      )}
    </div>
  );
}

/**
 * The cadences and progressions the written degrees form, in song order,
 * each with the chords it spans ("Gm7 → C7 → F7M"); a click selects the
 * first one.
 */
export function AnalysisPatterns({
  chords,
  patterns,
  onSelect,
  className,
}: {
  chords: readonly string[];
  patterns: readonly Pattern[];
  onSelect?: (index: number) => void;
  className?: string;
}) {
  const t = useTranslations("analysis.reading");
  const patternName = usePatternName();

  if (patterns.length === 0) {
    return (
      <p className={cn("text-muted-foreground text-sm", className)}>
        {t("noPatterns")}
      </p>
    );
  }

  return (
    <ol className={cn("space-y-1.5 text-sm", className)}>
      {patterns.map((pattern) => {
        const { name, hint } = patternName(pattern);
        const content = (
          <>
            <span className="block font-medium">{name}</span>
            <span className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-1 font-mono text-xs font-semibold">
              {pattern.chords.map((chord, i) => (
                <span key={chord} className="inline-flex items-center gap-1">
                  {i > 0 && (
                    <ArrowRight className="h-3 w-3 opacity-60" aria-hidden />
                  )}
                  {chords[chord] ?? "?"}
                </span>
              ))}
            </span>
            <span className="text-muted-foreground mt-0.5 block text-xs">
              {hint}
            </span>
          </>
        );
        return (
          <li key={`${pattern.id}-${pattern.chords.join("-")}`}>
            {onSelect ? (
              <button
                type="button"
                onClick={() => onSelect(pattern.chords[0])}
                className="hover:bg-muted/60 focus-visible:ring-ring/50 -mx-1.5 block w-[calc(100%+0.75rem)] rounded-md px-1.5 py-1 text-left outline-none focus-visible:ring-3"
              >
                {content}
              </button>
            ) : (
              <div className="py-1">{content}</div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
