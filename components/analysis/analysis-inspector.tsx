"use client";

import { useTranslations } from "next-intl";
import {
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  CopyCheck,
  Eraser,
  Highlighter,
  KeyRound,
  Music2,
  Plus,
  Sparkles,
  Table2,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChordDiagramCard } from "@/components/chords/chord-diagram-popover";
import {
  CHORD_BADGES,
  CONNECTION_KINDS,
  HARMONIC_FUNCTIONS,
  KEY_NAMES,
  LIMITS,
  NOTE_COLORS,
  emptyEntry,
  formatDegree,
  isAnalysableChord,
  isMinorKey,
  keyAt,
  type ChordEntry,
  type Degree,
  type ConnectionKind,
  type HarmonicAnalysis,
  type NoteColor,
  type RangeNote,
} from "@/lib/music/analysis";
import type { Pattern } from "@/lib/music/analysis-concepts";
import type { ChordSuggestion } from "@/lib/music/analysis-suggest";
import type { Issue } from "@/lib/music/analysis-insights";
import { DegreeBuilder } from "./degree-builder";
import { ChordReading } from "./analysis-reading";
import { ChordFacts } from "./chord-scale";
import { HarmonicField } from "./harmonic-field";
import {
  ConnectionSample,
  DegreeText,
  FUNCTION_COLOR,
  NOTE_COLOR,
} from "./analysis-marks";

export interface InspectorActions {
  setEntry: (patch: Partial<ChordEntry>, group?: string) => void;
  clear: () => void;
  setKey: (key: string | null) => void;
  startConnection: (kind: ConnectionKind) => void;
  removeConnection: (id: string) => void;
  setConnectionKind: (id: string, kind: ConnectionKind) => void;
  startRange: () => void;
  updateNote: (
    id: string,
    patch: Partial<Omit<RangeNote, "id">>,
    group?: string,
  ) => void;
  removeNote: (id: string) => void;
  copyToSame: () => void;
  /** Writes the assistant's reading of this chord. */
  acceptSuggestion: () => void;
  select: (index: number) => void;
  highlight: (connectionId: string | null) => void;
  close: () => void;
}

function Section({
  title,
  hint,
  children,
  action,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="space-y-2.5 border-t px-4 py-4 first:border-t-0">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          {hint && <p className="text-muted-foreground text-xs">{hint}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Toggle({
  active,
  onClick,
  children,
  style,
  title,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  style?: React.CSSProperties;
  title?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      title={title}
      style={style}
      className={cn(
        "focus-visible:ring-ring inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-colors outline-none focus-visible:ring-2",
        active
          ? "border-current bg-current/10"
          : "text-muted-foreground hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}

/**
 * Everything written about one chord: its degree, function, marks, the
 * lines leaving and reaching it, a key change, a note, and the passages
 * it belongs to.
 */
export function AnalysisInspector({
  analysis,
  chords,
  index,
  songKey,
  sameCount,
  patterns,
  actions,
  suggestion = null,
  issues = [],
  focusNote = null,
  className,
}: {
  analysis: HarmonicAnalysis;
  /** The chart's chord symbols, by index. */
  chords: readonly string[];
  index: number;
  /** The song's key, or the one the assistant detected for it. */
  songKey: string | null;
  /** The assistant's reading of this chord. */
  suggestion?: ChordSuggestion | null;
  /** What the review found on this chord. */
  issues?: readonly Issue[];
  /** How many identical chords "copy degree" would fill. */
  sameCount: number;
  /** The cadences the analysis forms (see `findPatterns`). */
  patterns: readonly Pattern[];
  actions: InspectorActions;
  /** A passage just created: its text field takes the focus. */
  focusNote?: string | null;
  className?: string;
}) {
  const t = useTranslations("analysis");
  const tBadge = useTranslations("analysis.badges");
  const tKind = useTranslations("analysis.connections");
  const tReview = useTranslations("analysis.review");
  const tAssistant = useTranslations("analysis.assistant");
  const symbol = chords[index] ?? "";
  const entry = analysis.entries[String(index)] ?? emptyEntry();
  const keyHere = keyAt(analysis, index, songKey);
  const keyMark = analysis.keys.find((k) => k.at === index) ?? null;
  const outgoing = analysis.connections.filter((c) => c.from === index);
  const incoming = analysis.connections.filter((c) => c.to === index);
  const passages = analysis.notes.filter(
    (n) => n.from <= index && n.to >= index,
  );
  const analysable = isAnalysableChord(symbol);

  const describe = (i: number) =>
    t("inspector.chordAt", { chord: chords[i] ?? "?", position: i + 1 });

  return (
    <div className={cn("flex flex-col", className)}>
      {/* Header */}
      <div className="bg-popover/95 supports-[backdrop-filter]:bg-popover/80 sticky top-0 z-10 flex items-center gap-2 border-b px-4 py-3 backdrop-blur">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-primary truncate font-mono text-2xl font-bold">
              {symbol}
            </p>
            {analysable && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    aria-label={t("inspector.diagram")}
                    title={t("inspector.diagram")}
                  >
                    <Music2 className="h-4 w-4" aria-hidden />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[17.5rem] p-3" align="start">
                  <ChordDiagramCard symbol={symbol} />
                </PopoverContent>
              </Popover>
            )}
          </div>
          <p className="text-muted-foreground text-xs">
            {t("inspector.position", {
              position: index + 1,
              total: chords.length,
            })}
            {keyHere && <> · {t("inspector.inKey", { key: keyHere })}</>}
          </p>
        </div>
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            disabled={index <= 0}
            onClick={() => actions.select(index - 1)}
            aria-label={t("inspector.previous")}
            title={t("inspector.previousShortcut")}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            disabled={index >= chords.length - 1}
            onClick={() => actions.select(index + 1)}
            aria-label={t("inspector.next")}
            title={t("inspector.nextShortcut")}
          >
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={actions.close}
            aria-label={t("inspector.close")}
          >
            <X className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      </div>

      {!analysable && (
        <p className="text-muted-foreground border-b px-4 py-3 text-xs">
          {t("inspector.noChord")}
        </p>
      )}

      {issues.length > 0 && (
        <div className="border-b px-4 py-3">
          <ul className="space-y-1">
            {issues.map((issue, i) => (
              <li
                key={`${issue.id}-${i}`}
                className={cn(
                  "text-xs",
                  issue.severity === "warning"
                    ? "text-destructive"
                    : "text-muted-foreground",
                )}
              >
                {tReview(`items.${issue.id}.title`, {
                  chord: symbol,
                  position: index + 1,
                  expected: issue.expected ?? "",
                })}
              </li>
            ))}
          </ul>
        </div>
      )}

      <Section
        title={t("inspector.degree")}
        hint={t("inspector.degreeHint")}
        action={
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5"
                title={t("inspector.fieldHint")}
              >
                <Table2 className="h-3.5 w-3.5" aria-hidden />
                {t("inspector.field")}
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="max-h-[70dvh] w-[22rem] overflow-y-auto p-3"
              align="end"
            >
              <HarmonicField
                defaultKey={keyHere}
                songChords={chords}
                current={symbol}
                onPick={(degree: Degree) => actions.setEntry({ degree })}
              />
            </PopoverContent>
          </Popover>
        }
      >
        {suggestion &&
          formatDegree(suggestion.degree) !== formatDegree(entry.degree) && (
            <div className="border-primary/30 bg-primary/[0.04] flex items-center gap-2.5 rounded-lg border border-dashed px-3 py-2">
              <Sparkles className="text-primary h-4 w-4 shrink-0" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-muted-foreground text-[0.65rem] font-semibold tracking-wide uppercase">
                  {t("inspector.suggestion")}
                </p>
                <p className="flex flex-wrap items-baseline gap-x-2 text-base">
                  <DegreeText degree={suggestion.degree} />
                  <span className="text-muted-foreground text-xs">
                    {tAssistant(`reasons.${suggestion.reason}`)}
                  </span>
                </p>
              </div>
              <Button
                size="sm"
                className="h-8 shrink-0 gap-1.5"
                onClick={actions.acceptSuggestion}
                title={t("inspector.acceptShortcut")}
              >
                <Check className="h-3.5 w-3.5" aria-hidden />
                {t("inspector.accept")}
              </Button>
            </div>
          )}
        <DegreeBuilder
          value={entry.degree}
          minor={isMinorKey(keyHere)}
          onChange={(degree) => actions.setEntry({ degree })}
        />
        {entry.degree && (
          <ChordReading
            analysis={analysis}
            index={index}
            songKey={songKey}
            patterns={patterns}
            onUseFunction={(fn) => actions.setEntry({ fn })}
            onSelect={actions.select}
          />
        )}
        {sameCount > 0 && entry.degree && (
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2"
            onClick={actions.copyToSame}
          >
            <CopyCheck className="h-4 w-4" aria-hidden />
            {t("inspector.copyToSame", { count: sameCount, chord: symbol })}
          </Button>
        )}
      </Section>

      <Section
        title={t("inspector.function")}
        hint={t("inspector.functionHint")}
      >
        <div className="flex flex-wrap gap-1.5">
          {HARMONIC_FUNCTIONS.map((fn) => (
            <Toggle
              key={fn}
              active={entry.fn === fn}
              onClick={() =>
                actions.setEntry({ fn: entry.fn === fn ? null : fn })
              }
              style={{ color: FUNCTION_COLOR[fn] }}
              title={t(`functions.${fn}.name`)}
            >
              <span className="font-bold">{fn}</span>
              <span className="text-foreground/80 font-medium">
                {t(`functions.${fn}.name`)}
              </span>
            </Toggle>
          ))}
        </div>
      </Section>

      <Section title={t("inspector.marks")} hint={t("inspector.marksHint")}>
        <div className="flex flex-wrap gap-1.5">
          {CHORD_BADGES.map((badge) => {
            const active = entry.badges.includes(badge);
            return (
              <Toggle
                key={badge}
                active={active}
                title={tBadge(`${badge}.name`)}
                style={badge === "aem" ? { color: "var(--an-aem)" } : undefined}
                onClick={() =>
                  actions.setEntry({
                    badges: active
                      ? entry.badges.filter((b) => b !== badge)
                      : [...entry.badges, badge],
                  })
                }
              >
                <span className={active ? "" : "text-foreground/80"}>
                  {tBadge(`${badge}.short`)}
                </span>
              </Toggle>
            );
          })}
        </div>
        <Input
          value={entry.custom}
          maxLength={LIMITS.custom}
          onChange={(event) =>
            actions.setEntry({ custom: event.target.value }, `custom-${index}`)
          }
          placeholder={t("inspector.customPlaceholder")}
          aria-label={t("inspector.custom")}
          className="h-9"
        />
      </Section>

      <Section title={t("inspector.lines")} hint={t("inspector.linesHint")}>
        {(outgoing.length > 0 || incoming.length > 0) && (
          <ul className="space-y-1">
            {[...outgoing, ...incoming].map((connection) => {
              const out = connection.from === index;
              return (
                <li
                  key={connection.id}
                  className="hover:bg-muted/60 flex items-center gap-2 rounded-md px-1.5 py-1"
                  onMouseEnter={() => actions.highlight(connection.id)}
                  onMouseLeave={() => actions.highlight(null)}
                  onFocus={() => actions.highlight(connection.id)}
                  onBlur={() => actions.highlight(null)}
                >
                  <ConnectionSample
                    kind={connection.kind}
                    bracket={
                      connection.kind === "twoFive" &&
                      analysis.display.twoFiveStyle === "bracket"
                    }
                  />
                  <div className="min-w-0 flex-1 text-xs">
                    <Select
                      value={connection.kind}
                      onValueChange={(kind) =>
                        actions.setConnectionKind(
                          connection.id,
                          kind as ConnectionKind,
                        )
                      }
                    >
                      <SelectTrigger
                        size="sm"
                        aria-label={t("inspector.lineKind")}
                        className="h-7 w-full border-0 bg-transparent px-1 text-xs shadow-none"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CONNECTION_KINDS.map((kind) => (
                          <SelectItem key={kind} value={kind}>
                            {tKind(`${kind}.name`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 flex items-center gap-1 rounded-sm px-1 outline-none focus-visible:ring-3"
                      onClick={() =>
                        actions.select(out ? connection.to : connection.from)
                      }
                    >
                      {out ? (
                        <>
                          <ArrowRight className="h-3 w-3" aria-hidden />
                          {describe(connection.to)}
                        </>
                      ) : (
                        <>
                          {t("inspector.from")} {describe(connection.from)}
                        </>
                      )}
                    </button>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={() => {
                      actions.highlight(null);
                      actions.removeConnection(connection.id);
                    }}
                    aria-label={t("inspector.removeLine")}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
        <div className="grid grid-cols-2 gap-1.5">
          {CONNECTION_KINDS.map((kind) => (
            <button
              key={kind}
              type="button"
              onClick={() => actions.startConnection(kind)}
              title={tKind(`${kind}.hint`)}
              className="hover:bg-muted focus-visible:ring-ring flex min-w-0 items-center gap-2 rounded-md border px-2 py-1.5 text-left text-xs outline-none last:odd:col-span-2 focus-visible:ring-2"
            >
              <ConnectionSample
                kind={kind}
                bracket={
                  kind === "twoFive" &&
                  analysis.display.twoFiveStyle === "bracket"
                }
                className="w-7"
              />
              <span className="min-w-0 leading-tight font-semibold">
                {tKind(`${kind}.name`)}
              </span>
              <Plus
                className="text-muted-foreground ml-auto h-3.5 w-3.5 shrink-0"
                aria-hidden
              />
            </button>
          ))}
        </div>
      </Section>

      <Section
        title={t("inspector.key")}
        hint={
          keyMark
            ? t("inspector.keyStartsHere")
            : t("inspector.keyHint", { key: keyHere ?? "—" })
        }
      >
        <div className="flex items-center gap-2">
          <KeyRound
            className="text-muted-foreground h-4 w-4 shrink-0"
            aria-hidden
          />
          <Select
            value={keyMark?.key ?? "none"}
            onValueChange={(value) =>
              actions.setKey(value === "none" ? null : value)
            }
          >
            <SelectTrigger
              className="h-9 flex-1"
              // The visible "Key" heading isn't a <label>: name it here.
              aria-label={t("inspector.key")}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value="none">{t("inspector.noKeyChange")}</SelectItem>
              {KEY_NAMES.map((key) => (
                <SelectItem key={key} value={key}>
                  {t("inspector.keyOption", { key })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Section>

      <Section title={t("inspector.note")} hint={t("inspector.noteHint")}>
        <Textarea
          value={entry.note}
          maxLength={LIMITS.note}
          rows={2}
          onChange={(event) =>
            actions.setEntry({ note: event.target.value }, `note-${index}`)
          }
          placeholder={t("inspector.notePlaceholder")}
          aria-label={t("inspector.note")}
          className="min-h-16 resize-y text-sm"
        />
      </Section>

      <Section
        title={t("inspector.passages")}
        hint={t("inspector.passagesHint")}
        action={
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5"
            onClick={actions.startRange}
          >
            <Highlighter className="h-3.5 w-3.5" aria-hidden />
            {t("inspector.addPassage")}
          </Button>
        }
      >
        {passages.length === 0 ? (
          <p className="text-muted-foreground text-xs">
            {t("inspector.noPassages")}
          </p>
        ) : (
          <ul className="space-y-3">
            {passages.map((note) => (
              <PassageEditor
                key={note.id}
                note={note}
                chords={chords}
                autoFocus={note.id === focusNote}
                onChange={(patch, group) =>
                  actions.updateNote(note.id, patch, group)
                }
                onRemove={() => actions.removeNote(note.id)}
              />
            ))}
          </ul>
        )}
      </Section>

      {analysable && (
        <Section title={t("inspector.facts")} hint={t("inspector.factsHint")}>
          <ChordFacts
            symbol={symbol}
            degree={entry.degree ?? suggestion?.degree ?? null}
            keyName={keyHere}
          />
        </Section>
      )}

      <div className="border-t px-4 py-4">
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive w-full justify-start gap-2"
          onClick={actions.clear}
        >
          <Eraser className="h-4 w-4" aria-hidden />
          {t("inspector.clearChord")}
        </Button>
      </div>
    </div>
  );
}

export function PassageEditor({
  note,
  chords,
  onChange,
  onRemove,
  autoFocus,
}: {
  note: RangeNote;
  chords: readonly string[];
  onChange: (patch: Partial<Omit<RangeNote, "id">>, group?: string) => void;
  onRemove: () => void;
  autoFocus?: boolean;
}) {
  const t = useTranslations("analysis");
  return (
    <li
      className="space-y-2 rounded-lg border p-2.5"
      style={{ borderColor: NOTE_COLOR[note.color] }}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-muted-foreground text-xs">
          {t("inspector.passageRange", {
            from: chords[note.from] ?? "?",
            to: chords[note.to] ?? "?",
            count: note.to - note.from + 1,
          })}
        </p>
        <div className="flex items-center gap-1">
          {NOTE_COLORS.map((color: NoteColor) => (
            <button
              key={color}
              type="button"
              aria-label={t(`noteColors.${color}`)}
              aria-pressed={note.color === color}
              onClick={() => onChange({ color })}
              // 24px (28px on touch) rather than 16px: a target that small
              // is easy to miss, and needs a visible keyboard focus too.
              className={cn(
                "focus-visible:ring-ring/50 size-6 rounded-full border-2 transition-transform outline-none focus-visible:ring-3 pointer-coarse:size-7",
                note.color === color
                  ? "border-foreground scale-110"
                  : "border-transparent",
              )}
              style={{ backgroundColor: NOTE_COLOR[color] }}
            />
          ))}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onRemove}
            aria-label={t("inspector.removePassage")}
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
          </Button>
        </div>
      </div>
      <Textarea
        value={note.text}
        rows={2}
        maxLength={LIMITS.rangeNote}
        autoFocus={autoFocus}
        onChange={(event) =>
          onChange({ text: event.target.value }, `passage-${note.id}`)
        }
        placeholder={t("inspector.passagePlaceholder")}
        aria-label={t("inspector.passageText")}
        className="min-h-14 resize-y text-sm"
      />
    </li>
  );
}
