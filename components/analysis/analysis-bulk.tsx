"use client";

import { useTranslations } from "next-intl";
import {
  ClipboardCopy,
  Eraser,
  Highlighter,
  Sparkles,
  Wand2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  CHORD_BADGES,
  HARMONIC_FUNCTIONS,
  type ChordBadge,
  type HarmonicAnalysis,
  type HarmonicFunction,
} from "@/lib/music/analysis";
import type { ChordSuggestion } from "@/lib/music/analysis-suggest";
import { DegreeText, FUNCTION_COLOR } from "./analysis-marks";

export interface BulkActions {
  setFunction: (fn: HarmonicFunction | null) => void;
  setBadge: (badge: ChordBadge, on: boolean) => void;
  fillSuggestions: () => void;
  openAssistant: () => void;
  annotate: () => void;
  clear: () => void;
  copyDegrees: () => void;
  select: (index: number) => void;
  close: () => void;
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2 border-t px-4 py-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      {children}
    </section>
  );
}

/**
 * A run of chords selected at once (Shift + click, Shift + arrows): what
 * they read as, and what can be done to all of them in one step — a
 * function, a mark, the assistant's degrees, a passage note, clearing.
 */
export function BulkInspector({
  analysis,
  chords,
  range,
  suggestions,
  actions,
}: {
  analysis: HarmonicAnalysis;
  chords: readonly string[];
  range: [number, number];
  suggestions: ReadonlyMap<number, ChordSuggestion>;
  actions: BulkActions;
}) {
  const t = useTranslations("analysis.bulk");
  const tFn = useTranslations("analysis.functions");
  const tBadge = useTranslations("analysis.badges");
  const [from, to] = range;
  const indexes = Array.from({ length: to - from + 1 }, (_, i) => from + i);
  const entries = indexes.map((i) => analysis.entries[String(i)]);
  const allHave = (badge: ChordBadge) =>
    entries.every((e) => e?.badges.includes(badge));
  const fnOf = (fn: HarmonicFunction) => entries.every((e) => e?.fn === fn);
  const pending = indexes.filter(
    (i) => !analysis.entries[String(i)]?.degree && suggestions.has(i),
  ).length;

  return (
    <div className="flex flex-col">
      <div className="bg-popover/95 supports-[backdrop-filter]:bg-popover/80 sticky top-0 z-10 flex items-center gap-2 border-b px-4 py-3 backdrop-blur">
        <div className="min-w-0 flex-1">
          <p className="text-lg font-bold">
            {t("title", { count: indexes.length })}
          </p>
          <p className="text-muted-foreground truncate font-mono text-xs font-semibold">
            {chords[from]} → {chords[to]}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={actions.close}
          aria-label={t("close")}
        >
          <X className="h-4 w-4" aria-hidden />
        </Button>
      </div>

      <div className="px-4 py-3">
        <ol className="flex flex-wrap gap-1">
          {indexes.map((i) => {
            const entry = analysis.entries[String(i)];
            const suggestion = suggestions.get(i);
            const degree = entry?.degree ?? suggestion?.degree ?? null;
            return (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => actions.select(i)}
                  className="hover:bg-muted focus-visible:ring-ring/50 flex flex-col items-center rounded-md border px-1.5 py-1 leading-tight outline-none focus-visible:ring-3"
                >
                  <span
                    className={cn(
                      "flex min-h-5 items-baseline text-sm",
                      !entry?.degree && "italic opacity-55",
                    )}
                    style={{
                      color: entry?.fn ? FUNCTION_COLOR[entry.fn] : undefined,
                    }}
                  >
                    {degree ? <DegreeText degree={degree} /> : "–"}
                  </span>
                  <span className="text-muted-foreground font-mono text-[0.65rem] font-semibold">
                    {chords[i]}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
        <p className="text-muted-foreground mt-2 text-xs">{t("hint")}</p>
      </div>

      <Section title={t("assistant")}>
        <div className="grid gap-1.5">
          <Button
            variant="secondary"
            size="sm"
            className="justify-start gap-2"
            onClick={actions.fillSuggestions}
            disabled={pending === 0}
          >
            <Wand2 className="h-4 w-4" aria-hidden />
            {pending > 0 ? t("fill", { count: pending }) : t("filled")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="justify-start gap-2"
            onClick={actions.openAssistant}
          >
            <Sparkles className="h-4 w-4" aria-hidden />
            {t("openAssistant")}
          </Button>
        </div>
      </Section>

      <Section title={t("function")}>
        <div className="flex flex-wrap gap-1.5">
          {HARMONIC_FUNCTIONS.map((fn) => {
            const active = fnOf(fn);
            return (
              <button
                key={fn}
                type="button"
                aria-pressed={active}
                onClick={() => actions.setFunction(active ? null : fn)}
                style={{ color: FUNCTION_COLOR[fn] }}
                className={cn(
                  "focus-visible:ring-ring inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold outline-none focus-visible:ring-2",
                  active ? "border-current bg-current/10" : "hover:bg-muted",
                )}
              >
                <span className="font-bold">{fn}</span>
                <span className="text-foreground/80 font-medium">
                  {tFn(`${fn}.name`)}
                </span>
              </button>
            );
          })}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs"
            onClick={() => actions.setFunction(null)}
          >
            {t("noFunction")}
          </Button>
        </div>
      </Section>

      <Section title={t("marks")}>
        <div className="flex flex-wrap gap-1.5">
          {CHORD_BADGES.map((badge) => {
            const active = allHave(badge);
            return (
              <button
                key={badge}
                type="button"
                aria-pressed={active}
                title={tBadge(`${badge}.name`)}
                onClick={() => actions.setBadge(badge, !active)}
                className={cn(
                  "focus-visible:ring-ring inline-flex h-8 items-center rounded-full border px-3 text-xs font-semibold outline-none focus-visible:ring-2",
                  active
                    ? "border-primary bg-primary/10 text-primary"
                    : "text-foreground/80 hover:bg-muted",
                )}
              >
                {tBadge(`${badge}.short`)}
              </button>
            );
          })}
        </div>
      </Section>

      <Section title={t("more")}>
        <div className="grid gap-1.5">
          <Button
            variant="outline"
            size="sm"
            className="justify-start gap-2"
            onClick={actions.annotate}
          >
            <Highlighter className="h-4 w-4" aria-hidden />
            {t("annotate")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="justify-start gap-2"
            onClick={actions.copyDegrees}
          >
            <ClipboardCopy className="h-4 w-4" aria-hidden />
            {t("copy")}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive justify-start gap-2"
            onClick={actions.clear}
          >
            <Eraser className="h-4 w-4" aria-hidden />
            {t("clear")}
          </Button>
        </div>
      </Section>
    </div>
  );
}
