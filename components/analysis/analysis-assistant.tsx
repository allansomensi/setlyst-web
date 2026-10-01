"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { onRadioGroupKeyDown } from "@/hooks/radio-group-keys";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  KEY_NAMES,
  degreeIsSet,
  formatDegree,
  prettyAccidentals,
  setKeyMark,
  type HarmonicAnalysis,
  type SheetSection,
} from "@/lib/music/analysis";
import {
  applySuggestions,
  detectKey,
  suggestAnalysis,
  suggestKeyChanges,
  type ApplyCounts,
  type Confidence,
} from "@/lib/music/analysis-suggest";
import type { QualityMode } from "@/lib/music/analysis-theory";
import { DegreeText } from "./analysis-marks";
import { useSectionLabel } from "./analysis-insights";

const CONFIDENCE_COLOR: Record<Confidence, string> = {
  high: "bg-emerald-500",
  medium: "bg-amber-500",
  low: "bg-muted-foreground/50",
};

function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      onKeyDown={onRadioGroupKeyDown}
      className="bg-muted grid gap-0.5 rounded-lg p-0.5"
      style={{
        gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))`,
      }}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          tabIndex={value === option.value ? 0 : -1}
          onClick={() => onChange(option.value)}
          className={cn(
            "focus-visible:ring-ring/50 rounded-md px-2 py-1.5 text-xs font-medium transition-colors outline-none focus-visible:ring-3",
            value === option.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function Group({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        {hint && <p className="text-muted-foreground text-xs">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

export interface AssistantResult {
  analysis: HarmonicAnalysis;
  counts: ApplyCounts & { keys: number };
}

/**
 * The analysis assistant: reads the chart and proposes its key, the
 * modulations, and every chord's degree, function, marks and lines —
 * previewed chord by chord before anything is written, and applied as a
 * single step that one undo takes back.
 */
export function AnalysisAssistant({
  open,
  onOpenChange,
  analysis,
  chords,
  sections,
  songKey,
  range,
  onApply,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  analysis: HarmonicAnalysis;
  chords: readonly string[];
  sections: readonly SheetSection[];
  songKey: string | null;
  /** The chords selected in the editor, if a run of them is. */
  range: [number, number] | null;
  onApply: (result: AssistantResult) => void;
}) {
  const t = useTranslations("analysis.assistant");
  const sectionLabel = useSectionLabel();

  const detected = useMemo(() => detectKey(chords, 4), [chords]);
  const startKey =
    analysis.keys.find((k) => k.at === 0)?.key ?? songKey ?? null;
  const [keyChoice, setKeyChoice] = useState<string | null>(null);
  const key = keyChoice ?? startKey ?? detected[0]?.key ?? "C";

  const [skipped, setSkipped] = useState<Set<number>>(new Set());
  const [overwrite, setOverwrite] = useState(false);
  const [onlyRange, setOnlyRange] = useState(true);
  const [fill, setFill] = useState({
    degrees: true,
    functions: true,
    marks: true,
    connections: true,
  });
  const [qualityMode, setQualityMode] = useState<QualityMode>("written");
  const [tensions, setTensions] = useState(false);

  // Each opening starts from the chart as it is now.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setKeyChoice(null);
      setSkipped(new Set());
      setOnlyRange(true);
    }
  }

  const keyChanges = useMemo(
    () =>
      suggestKeyChanges(sections, chords, key).filter(
        (change) =>
          change.at !== 0 && !analysis.keys.some((k) => k.at === change.at),
      ),
    [sections, chords, key, analysis.keys],
  );

  const plan = useMemo(() => {
    let base = analysis;
    let keys = 0;
    if (key !== startKey) {
      base = setKeyMark(base, 0, key);
      keys++;
    }
    for (const change of keyChanges) {
      if (skipped.has(change.at)) continue;
      base = setKeyMark(base, change.at, change.key);
      keys++;
    }
    const suggestions = suggestAnalysis(chords, base, songKey ?? key, {
      qualityMode,
      tensions,
    });
    const applied = applySuggestions(base, suggestions, {
      overwrite,
      ...fill,
      range: range && onlyRange ? range : null,
    });
    const byIndex = new Map(suggestions.chords.map((s) => [s.index, s]));
    const changes = chords.flatMap((symbol, index) => {
      const before = analysis.entries[String(index)];
      const after = applied.analysis.entries[String(index)];
      if (!after) return [];
      const degreeChanged =
        formatDegree(before?.degree ?? null) !==
        formatDegree(after.degree ?? null);
      const fnChanged = (before?.fn ?? null) !== after.fn;
      const marksChanged = (before?.badges.length ?? 0) !== after.badges.length;
      if (!degreeChanged && !fnChanged && !marksChanged) return [];
      const suggestion = byIndex.get(index);
      return [
        {
          index,
          symbol,
          before: before?.degree ?? null,
          after: after.degree,
          fn: after.fn,
          reason: suggestion?.reason ?? null,
          confidence: suggestion?.confidence ?? "low",
        },
      ];
    });
    return { result: applied, keys, changes };
  }, [
    analysis,
    chords,
    key,
    startKey,
    keyChanges,
    skipped,
    songKey,
    qualityMode,
    tensions,
    overwrite,
    fill,
    range,
    onlyRange,
  ]);

  const { counts } = plan.result;
  const nothing =
    counts.degrees +
      counts.functions +
      counts.marks +
      counts.connections +
      plan.keys ===
    0;
  const written = Object.values(analysis.entries).filter((e) =>
    degreeIsSet(e.degree),
  ).length;
  const low = plan.changes.filter((c) => c.confidence === "low").length;

  const apply = () => {
    onApply({
      analysis: plan.result.analysis,
      counts: { ...counts, keys: plan.keys },
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="text-primary h-5 w-5" aria-hidden />
            {t("title")}
          </DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 md:grid-cols-[minmax(0,19rem)_minmax(0,1fr)]">
          <div className="space-y-5">
            <Group
              title={t("key")}
              hint={
                startKey
                  ? t("keyHintSong", { key: startKey })
                  : t("keyHintNone")
              }
            >
              <Select value={key} onValueChange={setKeyChoice}>
                <SelectTrigger className="h-9 w-full" aria-label={t("key")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {KEY_NAMES.map((name) => (
                    <SelectItem key={name} value={name}>
                      {t("keyOption", { key: name })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="space-y-1">
                <p className="text-muted-foreground text-[0.7rem] font-semibold tracking-wide uppercase">
                  {t("detected")}
                </p>
                <ul className="space-y-1">
                  {detected.slice(0, 3).map((candidate) => (
                    <li key={candidate.key}>
                      <button
                        type="button"
                        onClick={() => setKeyChoice(candidate.key)}
                        aria-pressed={key === candidate.key}
                        className={cn(
                          "hover:bg-muted/70 focus-visible:ring-ring/50 grid w-full grid-cols-[3rem_minmax(0,1fr)_2.5rem] items-center gap-2 rounded-md px-1.5 py-1 text-left text-xs outline-none focus-visible:ring-3",
                          key === candidate.key && "bg-primary/10",
                        )}
                      >
                        <span className="font-bold">
                          {prettyAccidentals(candidate.key)}
                        </span>
                        <span className="bg-muted h-1.5 overflow-hidden rounded-full">
                          <span
                            className="bg-primary block h-full rounded-full"
                            style={{
                              width: `${Math.max(2, candidate.confidence * 100)}%`,
                            }}
                          />
                        </span>
                        <span className="text-muted-foreground text-right tabular-nums">
                          {Math.round(candidate.confidence * 100)}%
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
                {startKey &&
                  detected[0] &&
                  detected[0].key !== startKey &&
                  detected[0].confidence > 0.6 && (
                    <p className="text-xs text-amber-700 dark:text-amber-400">
                      {t("keyMismatch", {
                        key: startKey,
                        detected: detected[0].key,
                      })}
                    </p>
                  )}
                {key !== startKey && (
                  <p className="text-muted-foreground text-xs">
                    {t("keyWillMark", { key })}
                  </p>
                )}
              </div>
            </Group>

            <Group title={t("modulations")} hint={t("modulationsHint")}>
              {keyChanges.length === 0 ? (
                <p className="text-muted-foreground text-xs">
                  {t("noModulations")}
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {keyChanges.map((change) => (
                    <li key={change.at}>
                      <label className="hover:bg-muted/50 flex cursor-pointer items-start gap-2 rounded-md border px-2.5 py-2 text-xs">
                        <Checkbox
                          checked={!skipped.has(change.at)}
                          onCheckedChange={(checked) =>
                            setSkipped((previous) => {
                              const next = new Set(previous);
                              if (checked) next.delete(change.at);
                              else next.add(change.at);
                              return next;
                            })
                          }
                          className="mt-0.5"
                        />
                        <span className="min-w-0">
                          <span className="block font-semibold">
                            {sectionLabel(sections[change.section])}
                          </span>
                          <span className="text-muted-foreground inline-flex items-center gap-1">
                            {prettyAccidentals(change.from)}
                            <ArrowRight className="h-3 w-3" aria-hidden />
                            <span className="text-foreground font-bold">
                              {prettyAccidentals(change.key)}
                            </span>
                            ·{" "}
                            {t("atChord", { chord: chords[change.at] ?? "?" })}
                          </span>
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </Group>

            <Group title={t("fill")}>
              <div className="space-y-1.5">
                {(
                  ["degrees", "functions", "marks", "connections"] as const
                ).map((field) => (
                  <label
                    key={field}
                    className="hover:bg-muted/50 flex cursor-pointer items-center justify-between gap-3 rounded-lg border px-3 py-2"
                  >
                    <span className="min-w-0">
                      <span className="block text-sm">
                        {t(`fields.${field}`)}
                      </span>
                      <span className="text-muted-foreground block text-xs">
                        {t(`fieldHints.${field}`)}
                      </span>
                    </span>
                    <Switch
                      checked={fill[field]}
                      onCheckedChange={(value) =>
                        setFill((f) => ({ ...f, [field]: value }))
                      }
                    />
                  </label>
                ))}
              </div>
              <Segmented
                label={t("scope")}
                value={overwrite ? "all" : "empty"}
                onChange={(value) => setOverwrite(value === "all")}
                options={[
                  { value: "empty", label: t("scopeEmpty") },
                  { value: "all", label: t("scopeAll") },
                ]}
              />
              {overwrite && written > 0 && (
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  {t("overwriteWarning", { count: written })}
                </p>
              )}
              {range && (
                <label className="flex items-center gap-2 text-xs">
                  <Checkbox
                    checked={onlyRange}
                    onCheckedChange={(value) => setOnlyRange(!!value)}
                  />
                  {t("onlyRange", {
                    from: chords[range[0]] ?? "?",
                    to: chords[range[1]] ?? "?",
                    count: range[1] - range[0] + 1,
                  })}
                </label>
              )}
            </Group>

            <Group title={t("writing")} hint={t("writingHint")}>
              <Segmented
                label={t("writing")}
                value={qualityMode}
                onChange={setQualityMode}
                options={[
                  { value: "written", label: t("modes.written") },
                  { value: "tetrads", label: t("modes.tetrads") },
                  { value: "triads", label: t("modes.triads") },
                ]}
              />
              <label className="flex items-center justify-between gap-3 text-sm">
                {t("tensions")}
                <Switch
                  checked={tensions}
                  onCheckedChange={setTensions}
                  disabled={qualityMode === "triads"}
                />
              </label>
            </Group>
          </div>

          <div className="flex min-w-0 flex-col gap-3">
            <div className="flex flex-wrap gap-1.5" aria-live="polite">
              {(
                [
                  ["degrees", counts.degrees],
                  ["functions", counts.functions],
                  ["marks", counts.marks],
                  ["connections", counts.connections],
                  ["keys", plan.keys],
                ] as const
              ).map(([id, value]) => (
                <span
                  key={id}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-xs font-semibold tabular-nums",
                    value > 0
                      ? "bg-primary/10 border-primary/30"
                      : "text-muted-foreground",
                  )}
                >
                  {t(`counts.${id}`, { count: value })}
                </span>
              ))}
            </div>

            <div className="min-h-48 flex-1 overflow-hidden rounded-lg border">
              <div className="bg-muted/50 text-muted-foreground grid grid-cols-[0.5rem_4.5rem_minmax(0,1fr)_minmax(0,1fr)] items-center gap-2 border-b px-3 py-1.5 text-[0.65rem] font-semibold tracking-wide uppercase">
                <span />
                <span>{t("preview.chord")}</span>
                <span>{t("preview.degree")}</span>
                <span>{t("preview.reason")}</span>
              </div>
              {plan.changes.length === 0 ? (
                <p className="text-muted-foreground px-3 py-8 text-center text-sm">
                  {nothing ? t("preview.nothing") : t("preview.linesOnly")}
                </p>
              ) : (
                <ol className="max-h-[22rem] divide-y overflow-y-auto">
                  {plan.changes.map((change) => (
                    <li
                      key={change.index}
                      className="grid grid-cols-[0.5rem_4.5rem_minmax(0,1fr)_minmax(0,1fr)] items-center gap-2 px-3 py-1.5 text-sm"
                    >
                      <span
                        className={cn(
                          "size-2 rounded-full",
                          CONFIDENCE_COLOR[change.confidence],
                        )}
                        title={t(`confidence.${change.confidence}`)}
                        aria-label={t(`confidence.${change.confidence}`)}
                      />
                      <span className="truncate font-mono text-xs font-bold">
                        {change.symbol}
                      </span>
                      <span className="flex min-w-0 items-baseline gap-1.5">
                        {change.before &&
                          formatDegree(change.before) !==
                            formatDegree(change.after) && (
                            <>
                              <span className="text-muted-foreground line-through decoration-1">
                                <DegreeText degree={change.before} />
                              </span>
                              <ArrowRight
                                className="text-muted-foreground h-3 w-3 shrink-0 self-center"
                                aria-hidden
                              />
                            </>
                          )}
                        <DegreeText degree={change.after} />
                        {change.fn && (
                          <span className="text-muted-foreground text-[0.65rem] font-bold">
                            {change.fn}
                          </span>
                        )}
                      </span>
                      <span className="text-muted-foreground truncate text-xs">
                        {change.reason ? t(`reasons.${change.reason}`) : ""}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
            <ul className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-[0.68rem]">
              {(["high", "medium", "low"] as const).map((level) => (
                <li key={level} className="inline-flex items-center gap-1.5">
                  <span
                    className={cn(
                      "size-2 rounded-full",
                      CONFIDENCE_COLOR[level],
                    )}
                    aria-hidden
                  />
                  {t(`confidence.${level}`)}
                </li>
              ))}
            </ul>
            {low > 0 && (
              <p className="text-muted-foreground text-xs">
                {t("lowHint", { count: low })}
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="items-center gap-2 sm:justify-between">
          <p className="text-muted-foreground text-xs">{t("undoHint")}</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t("cancel")}
            </Button>
            <Button onClick={apply} disabled={nothing} className="gap-2">
              <Sparkles className="h-4 w-4" aria-hidden />
              {t("apply")}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
