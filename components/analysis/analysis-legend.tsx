"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import {
  CHORD_BADGES,
  CONNECTION_KINDS,
  HARMONIC_FUNCTIONS,
  footnotes as buildFootnotes,
  type HarmonicAnalysis,
} from "@/lib/music/analysis";
import {
  ConnectionSample,
  FunctionBadge,
  MarkBadge,
  NOTE_COLOR,
} from "./analysis-marks";

/**
 * The sample column of the legend: wide enough for the longest short
 * label ("dim. desc."), so a badge never runs into its name, and left
 * aligned so the names line up.
 */
const MARK_COLUMN = "flex min-w-[4.25rem] shrink-0 items-center text-base";

/**
 * What each line and mark means. With `usedOnly`, just the ones this
 * analysis uses — what an exported image needs; without it, everything,
 * as a reference while writing.
 */
export function AnalysisLegend({
  analysis,
  usedOnly = false,
  className,
  columns = 1,
}: {
  analysis: HarmonicAnalysis;
  usedOnly?: boolean;
  className?: string;
  columns?: 1 | 2 | 3;
}) {
  const t = useTranslations("analysis");
  const tKind = useTranslations("analysis.connections");
  const tBadge = useTranslations("analysis.badges");

  const entries = Object.values(analysis.entries);
  const kinds = CONNECTION_KINDS.filter(
    (kind) => !usedOnly || analysis.connections.some((c) => c.kind === kind),
  );
  const badges = CHORD_BADGES.filter(
    (badge) => !usedOnly || entries.some((e) => e.badges.includes(badge)),
  );
  const functions = HARMONIC_FUNCTIONS.filter(
    (fn) =>
      !usedOnly ||
      (analysis.display.showFunctions && entries.some((e) => e.fn === fn)),
  );

  if (!kinds.length && !badges.length && !functions.length) return null;

  const grid = cn(
    "grid gap-x-6 gap-y-1.5",
    columns === 2 && "sm:grid-cols-2",
    columns === 3 && "sm:grid-cols-2 md:grid-cols-3",
  );

  return (
    <div className={cn("space-y-3 text-sm", className)}>
      {kinds.length > 0 && (
        <ul className={grid}>
          {kinds.map((kind) => (
            <li key={kind} className="flex items-center gap-2.5">
              <span className={MARK_COLUMN}>
                <ConnectionSample
                  kind={kind}
                  bracket={
                    kind === "twoFive" &&
                    analysis.display.twoFiveStyle === "bracket"
                  }
                />
              </span>
              <span>
                <span className="font-medium">{tKind(`${kind}.name`)}</span>
                <span className="text-muted-foreground">
                  {" "}
                  — {tKind(`${kind}.hint`)}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
      {(functions.length > 0 || badges.length > 0) && (
        <ul className={grid}>
          {functions.map((fn) => (
            <li key={fn} className="flex items-center gap-2.5">
              <span className={MARK_COLUMN}>
                <FunctionBadge fn={fn} />
              </span>
              <span className="font-medium">{t(`functions.${fn}.name`)}</span>
            </li>
          ))}
          {badges.map((badge) => (
            <li key={badge} className="flex items-center gap-2.5">
              <span className={MARK_COLUMN}>
                <MarkBadge badge={badge} label={tBadge(`${badge}.short`)} />
              </span>
              <span className="font-medium">{tBadge(`${badge}.name`)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** The numbered notes, in song order (see `footnotes`). */
export function AnalysisFootnotes({
  analysis,
  chords,
  onSelect,
  className,
}: {
  analysis: HarmonicAnalysis;
  chords: readonly string[];
  onSelect?: (index: number) => void;
  className?: string;
}) {
  const t = useTranslations("analysis");
  const notes = buildFootnotes(analysis);
  if (!notes.length) return null;
  const colorOf = (id?: string) =>
    analysis.notes.find((n) => n.id === id)?.color ?? "amber";

  return (
    <ol className={cn("space-y-2 text-sm", className)}>
      {notes.map((note) => {
        const range =
          note.kind === "range"
            ? analysis.notes.find((n) => n.id === note.id)
            : null;
        const label = range
          ? t("footnotes.passage", {
              from: chords[range.from] ?? "?",
              to: chords[range.to] ?? "?",
            })
          : t("footnotes.chord", { chord: chords[note.at] ?? "?" });
        const content = (
          <>
            <span
              className={cn(
                "mt-0.5 inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1 text-[0.7rem] font-extrabold",
                note.kind === "chord"
                  ? "bg-foreground text-background"
                  : "text-black/80",
              )}
              style={
                note.kind === "range"
                  ? { backgroundColor: NOTE_COLOR[colorOf(note.id)] }
                  : undefined
              }
            >
              {note.number}
            </span>
            <span className="min-w-0">
              <span className="text-muted-foreground font-mono text-xs font-semibold">
                {label}
              </span>
              <span className="block whitespace-pre-wrap">
                {note.text || (
                  <span className="text-muted-foreground italic">
                    {t("footnotes.empty")}
                  </span>
                )}
              </span>
            </span>
          </>
        );
        return (
          <li key={`${note.kind}-${note.id ?? note.at}`}>
            {onSelect ? (
              <button
                type="button"
                onClick={() => onSelect(note.at)}
                className="hover:bg-muted/60 -mx-1.5 flex w-full items-start gap-2 rounded-md px-1.5 py-1 text-left"
              >
                {content}
              </button>
            ) : (
              <div className="flex items-start gap-2">{content}</div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
