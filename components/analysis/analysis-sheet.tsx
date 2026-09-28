"use client";

import React, {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import {
  footnotes as buildFootnotes,
  isAnalysableChord,
  type Cell,
  type ChordEntry,
  type Connection,
  type HarmonicAnalysis,
  type SheetLine,
} from "@/lib/music/analysis";
import { ANNOTATION_MARK } from "@/lib/music/chordpro";
import {
  CONNECTION_COLOR,
  CONNECTION_DASH,
  DegreeText,
  FunctionBadge,
  KeyFlag,
  MarkBadge,
  NOTE_COLOR,
} from "./analysis-marks";

// Geometry

interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

interface ChordGeometry {
  chord: Box;
  cell: Box;
  degree: Box;
}

interface Geometry {
  width: number;
  height: number;
  /** Content edges, for lines that run off to the next row. */
  left: number;
  right: number;
  /** One em, in px. */
  em: number;
  chords: Map<number, ChordGeometry>;
}

function relativeBox(el: Element, origin: DOMRect, scale: number): Box {
  const r = el.getBoundingClientRect();
  return {
    left: (r.left - origin.left) / scale,
    top: (r.top - origin.top) / scale,
    right: (r.right - origin.left) / scale,
    bottom: (r.bottom - origin.top) / scale,
  };
}

function measure(container: HTMLElement): Geometry {
  const origin = container.getBoundingClientRect();
  // Rendered inside a scaled preview (the export dialog), rects come back
  // scaled; everything is drawn in the element's own units.
  const scale =
    container.offsetWidth > 0 ? origin.width / container.offsetWidth : 1;
  const style = getComputedStyle(container);
  const em = parseFloat(style.fontSize) || 16;
  const chords = new Map<number, ChordGeometry>();

  container.querySelectorAll<HTMLElement>("[data-an-cell]").forEach((cell) => {
    const index = Number(cell.dataset.anCell);
    const chord = cell.querySelector("[data-an-chord]");
    const degree = cell.querySelector("[data-an-degree]");
    if (!chord || !degree) return;
    chords.set(index, {
      chord: relativeBox(chord, origin, scale),
      cell: relativeBox(cell, origin, scale),
      degree: relativeBox(degree, origin, scale),
    });
  });

  const paddingLeft = parseFloat(style.paddingLeft) || 0;
  const paddingRight = parseFloat(style.paddingRight) || 0;
  return {
    width: container.offsetWidth,
    height: container.offsetHeight,
    left: paddingLeft,
    right: container.offsetWidth - paddingRight,
    em,
    chords,
  };
}

function sameGeometry(a: Geometry | null, b: Geometry): boolean {
  if (!a) return false;
  if (a.width !== b.width || a.height !== b.height || a.em !== b.em)
    return false;
  if (a.chords.size !== b.chords.size) return false;
  for (const [index, g] of b.chords) {
    const o = a.chords.get(index);
    if (
      !o ||
      Math.abs(o.chord.left - g.chord.left) > 0.5 ||
      Math.abs(o.chord.top - g.chord.top) > 0.5 ||
      Math.abs(o.degree.bottom - g.degree.bottom) > 0.5 ||
      Math.abs(o.cell.right - g.cell.right) > 0.5
    ) {
      return false;
    }
  }
  return true;
}

/**
 * Where every chord ended up on screen, re-measured whenever the layout
 * can have moved: a resize, fonts arriving, or the content changing
 * (`version`).
 */
function useGeometry(
  ref: React.RefObject<HTMLDivElement | null>,
  version: unknown,
): Geometry | null {
  const [geometry, setGeometry] = useState<Geometry | null>(null);

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const next = measure(el);
    setGeometry((previous) => (sameGeometry(previous, next) ? previous : next));
  }, [ref]);

  useLayoutEffect(() => {
    update();
  }, [update, version]);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(() => update());
    observer.observe(el);
    let cancelled = false;
    document.fonts?.ready.then(() => {
      if (!cancelled) update();
    });
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [ref, update]);

  return geometry;
}

// Drawing

const sameRow = (a: Box, b: Box) => Math.abs(a.top - b.top) < 4;
const centerX = (b: Box) => (b.left + b.right) / 2;

function arrowHead(
  x: number,
  y: number,
  fromX: number,
  fromY: number,
  size: number,
): string {
  const angle = Math.atan2(y - fromY, x - fromX);
  const spread = 0.45;
  const ax = x - size * Math.cos(angle - spread);
  const ay = y - size * Math.sin(angle - spread);
  const bx = x - size * Math.cos(angle + spread);
  const by = y - size * Math.sin(angle + spread);
  return `M${x},${y} L${ax},${ay} L${bx},${by} Z`;
}

interface Stroke {
  key: string;
  d: string;
  head?: string;
  kind: Connection["kind"];
}

function connectionStrokes(
  connection: Connection,
  geometry: Geometry,
  bracket: boolean,
): Stroke[] {
  const a = geometry.chords.get(connection.from);
  const b = geometry.chords.get(connection.to);
  if (!a || !b) return [];
  const em = geometry.em;
  const kind = connection.kind;
  const strokes: Stroke[] = [];

  if (bracket) {
    // The II–V bracket, under the degrees.
    const [first, last] = connection.from < connection.to ? [a, b] : [b, a];
    const tick = em * 0.28;
    const x1 = first.chord.left + em * 0.1;
    const x2 = Math.max(last.chord.right, last.degree.right) - em * 0.25;
    const y1 = first.degree.bottom + em * 0.18;
    if (sameRow(first.chord, last.chord)) {
      const y = Math.max(y1, last.degree.bottom + em * 0.18);
      strokes.push({
        key: `${connection.id}`,
        d: `M${x1},${y - tick} L${x1},${y} L${x2},${y} L${x2},${y - tick}`,
        kind,
      });
    } else {
      const y2 = last.degree.bottom + em * 0.18;
      strokes.push({
        key: `${connection.id}-a`,
        d: `M${x1},${y1 - tick} L${x1},${y1} L${geometry.right},${y1}`,
        kind,
      });
      strokes.push({
        key: `${connection.id}-b`,
        d: `M${geometry.left},${y2} L${x2},${y2} L${x2},${y2 - tick}`,
        kind,
      });
    }
    return strokes;
  }

  const head = em * 0.42;
  const lane = em * 1.15;
  const ax = centerX(a.chord);
  const bx = centerX(b.chord);
  const ay = a.chord.top - em * 0.08;
  const by = b.chord.top - em * 0.08;

  if (sameRow(a.chord, b.chord)) {
    const distance = Math.abs(bx - ax);
    const lift = Math.min(lane, em * 0.45 + distance * 0.16);
    const sx = ax + Math.sign(bx - ax) * em * 0.15;
    const ex = bx - Math.sign(bx - ax) * em * 0.1;
    const c1y = ay - lift;
    const c2x = ex;
    const c2y = by - lift;
    strokes.push({
      key: connection.id,
      d: `M${sx},${ay} C${sx},${c1y} ${c2x},${c2y} ${ex},${by - 0.5}`,
      head: arrowHead(ex, by, c2x, c2y + lift * 0.35, head),
      kind,
    });
    return strokes;
  }

  // Across rows: the arc leaves the first chord towards the edge of the
  // page and comes back in from the other edge onto the second, like a
  // line of music continued on the next system.
  const forward = b.chord.top > a.chord.top;
  const outX = forward ? geometry.right : geometry.left;
  const inX = forward ? geometry.left : geometry.right;
  const lift = lane * 0.8;
  strokes.push({
    key: `${connection.id}-out`,
    d: `M${ax},${ay} C${ax},${ay - lift} ${ax + (outX - ax) * 0.3},${ay - lift} ${outX},${ay - lift}`,
    kind,
  });
  strokes.push({
    key: `${connection.id}-in`,
    d: `M${inX},${by - lift} C${bx + (inX - bx) * 0.3},${by - lift} ${bx},${by - lift} ${bx},${by - 0.5}`,
    head: arrowHead(bx, by, bx, by - lift, head),
    kind,
  });
  return strokes;
}

function Overlay({
  geometry,
  connections,
  bracketTwoFive,
  highlight,
}: {
  geometry: Geometry;
  connections: Connection[];
  bracketTwoFive: boolean;
  highlight: string | null;
}) {
  const width = Math.max(1.1, geometry.em * 0.085);
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute inset-0 z-20 overflow-visible"
      width={geometry.width}
      height={geometry.height}
    >
      {connections.flatMap((connection) =>
        connectionStrokes(
          connection,
          geometry,
          bracketTwoFive && connection.kind === "twoFive",
        ).map((stroke) => {
          const color = CONNECTION_COLOR[stroke.kind];
          // The bracket is a plain line; dotted is the arrow form.
          const dash =
            bracketTwoFive && stroke.kind === "twoFive"
              ? null
              : CONNECTION_DASH[stroke.kind];
          const strong = highlight === connection.id;
          const w = strong ? width * 1.9 : width;
          return (
            <g key={stroke.key} data-connection={connection.id}>
              <path
                d={stroke.d}
                fill="none"
                stroke={color}
                strokeWidth={w}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={dash?.map((d) => d * w).join(" ")}
              />
              {stroke.head && <path d={stroke.head} fill={color} />}
            </g>
          );
        }),
      )}
    </svg>
  );
}

function Underlay({
  geometry,
  analysis,
  numbers,
}: {
  geometry: Geometry;
  analysis: HarmonicAnalysis;
  numbers: Map<string, number>;
}) {
  const em = geometry.em;
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0 overflow-visible"
      width={geometry.width}
      height={geometry.height}
    >
      {analysis.notes.map((note) => {
        // One rounded band per row the passage spans.
        const rows: Box[] = [];
        for (let i = note.from; i <= note.to; i++) {
          const g = geometry.chords.get(i);
          if (!g) continue;
          const row = rows.find((r) => Math.abs(r.top - g.chord.top) < 4);
          if (row) {
            row.left = Math.min(row.left, g.cell.left);
            row.right = Math.max(row.right, g.cell.right);
            row.bottom = Math.max(row.bottom, g.cell.bottom);
          } else {
            rows.push({
              left: g.cell.left,
              top: g.chord.top,
              right: g.cell.right,
              bottom: g.cell.bottom,
            });
          }
        }
        if (!rows.length) return null;
        const color = NOTE_COLOR[note.color];
        const number = numbers.get(note.id);
        const first = rows[0];
        return (
          <g key={note.id}>
            {rows.map((row, i) => (
              <rect
                key={i}
                x={row.left - em * 0.3}
                y={row.top - em * 0.12}
                width={row.right - row.left + em * 0.45}
                height={row.bottom - row.top + em * 0.24}
                rx={em * 0.35}
                fill={color}
                fillOpacity={0.2}
                stroke={color}
                strokeOpacity={0.75}
                strokeWidth={1}
              />
            ))}
            {number !== undefined && (
              <g>
                <circle
                  cx={first.left - em * 0.3}
                  cy={first.top - em * 0.12}
                  r={em * 0.42}
                  fill={color}
                />
                <text
                  x={first.left - em * 0.3}
                  y={first.top - em * 0.12}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={em * 0.5}
                  fontWeight={800}
                  fill="black"
                  fillOpacity={0.8}
                >
                  {number}
                </text>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// Sheet

export interface PendingPick {
  kind: "connection" | "range";
  from: number;
}

export interface AnalysisSheetProps {
  lines: SheetLine[];
  analysis: HarmonicAnalysis;
  /** The song's written key: what the first chords are analysed in. */
  songKey: string | null;
  mode: "edit" | "view" | "export";
  selected?: number | null;
  pending?: PendingPick | null;
  /** A connection to draw emphasised (hovered in the inspector). */
  highlightConnection?: string | null;
  onChordClick?: (index: number) => void;
  /** In `view` mode, chords carry `data-chord-symbol` for diagrams. */
  interactiveChords?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const stripMarks = (value: string) => value.split(ANNOTATION_MARK).join("");

/**
 * An analysed chart: the chords of the song with their degrees under
 * them, marks and functions under those, the lyric at the bottom, and
 * the resolutions drawn over it all. Laid out by the browser like any
 * text (so it wraps on a phone), then measured, and the arrows drawn on
 * top from where the chords actually landed.
 */
export function AnalysisSheet({
  lines,
  analysis,
  songKey,
  mode,
  selected = null,
  pending = null,
  highlightConnection = null,
  onChordClick,
  interactiveChords = false,
  className,
  style,
}: AnalysisSheetProps) {
  const t = useTranslations("analysis");
  const tSection = useTranslations("lyrics.toolbar");
  const tBadge = useTranslations("analysis.badges");
  const containerRef = useRef<HTMLDivElement>(null);
  const { showLyrics, showFunctions, twoFiveStyle } = analysis.display;

  const notes = useMemo(() => buildFootnotes(analysis), [analysis]);
  const chordNoteNumber = useMemo(() => {
    const map = new Map<number, number>();
    for (const note of notes)
      if (note.kind === "chord") map.set(note.at, note.number);
    return map;
  }, [notes]);
  const rangeNoteNumber = useMemo(() => {
    const map = new Map<string, number>();
    for (const note of notes)
      if (note.kind === "range" && note.id) map.set(note.id, note.number);
    return map;
  }, [notes]);

  // Where each key starts. The song's key heads the first chord unless a
  // mark says otherwise.
  const keyStarts = useMemo(() => {
    const map = new Map<number, string>();
    if (songKey) map.set(0, songKey);
    for (const mark of analysis.keys) map.set(mark.at, mark.key);
    return map;
  }, [analysis.keys, songKey]);

  const pendingRange = useMemo(() => {
    if (!pending || pending.kind !== "range" || selected === null) return null;
    return [Math.min(pending.from, selected), Math.max(pending.from, selected)];
  }, [pending, selected]);

  const geometry = useGeometry(containerRef, [
    analysis,
    lines,
    songKey,
    mode,
    selected,
  ]);

  const headingLabel = (line: Extract<SheetLine, { kind: "heading" }>) => {
    if (!line.section) return stripMarks(line.raw);
    const parts = [tSection(line.section)];
    if (line.heading?.number) parts.push(line.heading.number);
    let label = parts.join(" ");
    if (line.heading?.extra) label += ` · ${line.heading.extra}`;
    return label;
  };

  const renderCell = (
    cell: Cell,
    key: string,
    lineMarks: boolean,
    bare: boolean,
  ) => {
    if (cell.kind === "lyric") {
      if (!showLyrics || bare) return null;
      return (
        <span key={key} className="leading-[1.4] whitespace-pre">
          {cell.text}
        </span>
      );
    }
    if (cell.kind === "filler") {
      return (
        <span
          key={key}
          className="text-muted-foreground self-start pt-[0.1em] pr-[0.7em] font-mono text-[0.75em]"
        >
          {cell.text}
        </span>
      );
    }

    const entry: ChordEntry | undefined = analysis.entries[String(cell.index)];
    const keyName = keyStarts.get(cell.index);
    const footnote = chordNoteNumber.get(cell.index);
    const isSelected = selected === cell.index;
    const isSource = pending?.from === cell.index;
    const inPendingRange =
      pendingRange !== null &&
      cell.index >= pendingRange[0] &&
      cell.index <= pendingRange[1];
    const analysable = isAnalysableChord(cell.symbol);
    const fnColor =
      showFunctions && entry?.fn
        ? `var(--an-fn-${entry.fn.toLowerCase()})`
        : undefined;
    const clickable = mode === "edit" && !!onChordClick;

    const chordClass = cn(
      "text-primary relative w-fit rounded-[0.3em] px-[0.12em] font-mono text-[0.86em] leading-[1.35] font-bold tracking-tight",
      clickable &&
        "hover:bg-primary/10 focus-visible:ring-ring cursor-pointer outline-none focus-visible:ring-2",
      isSelected && "bg-primary/15 ring-primary ring-2",
      isSource &&
        "outline-2 outline-offset-2 outline-dashed outline-[var(--an-dominant)]",
      inPendingRange && !isSelected && "bg-primary/10",
      pending && !isSource && "hover:ring-primary/60 hover:ring-2",
    );

    const chordContent = (
      <>
        {cell.symbol}
        {footnote !== undefined && (
          <sup className="text-foreground ml-[0.1em] font-sans text-[0.6em] font-bold">
            {footnote}
          </sup>
        )}
      </>
    );

    return (
      <span
        key={key}
        data-an-cell={cell.index}
        className="inline-flex flex-col items-start"
      >
        {clickable ? (
          <button
            type="button"
            data-an-chord={cell.index}
            data-chord-index={cell.index}
            aria-pressed={isSelected}
            aria-label={t("sheet.chordLabel", { chord: cell.symbol })}
            onClick={() => onChordClick(cell.index)}
            // Scrolled to above the inspector docked at the bottom of a
            // phone's screen.
            className={cn(
              chordClass,
              "mr-[0.55em] scroll-mt-24 scroll-mb-[62dvh] lg:scroll-mb-12",
            )}
          >
            {chordContent}
          </button>
        ) : (
          <span
            data-an-chord={cell.index}
            {...(interactiveChords && analysable
              ? {
                  "data-chord-symbol": cell.symbol.replace(/^\((.+)\)$/, "$1"),
                  role: "button",
                  tabIndex: 0,
                }
              : {})}
            className={cn(
              chordClass,
              "mr-[0.55em]",
              interactiveChords &&
                analysable &&
                "cursor-pointer decoration-dotted underline-offset-[0.2em] hover:underline",
            )}
          >
            {chordContent}
          </span>
        )}
        <span
          data-an-degree={cell.index}
          className="mr-[0.55em] min-h-[1.35em] pb-[0.3em] text-[0.92em] leading-[1.35]"
          style={{ color: fnColor }}
        >
          {keyName && <KeyFlag keyName={keyName} />}
          <DegreeText degree={entry?.degree ?? null} />
        </span>
        {lineMarks && (
          <span className="mr-[0.55em] flex min-h-[1.2em] flex-wrap items-center gap-[0.2em] pb-[0.2em]">
            {showFunctions && entry?.fn && <FunctionBadge fn={entry.fn} />}
            {entry?.badges.map((badge) => (
              <MarkBadge
                key={badge}
                badge={badge}
                label={tBadge(`${badge}.short`)}
              />
            ))}
            {entry?.custom.trim() && (
              <MarkBadge badge="custom" label={entry.custom.trim()} />
            )}
          </span>
        )}
        {showLyrics && !bare && (
          <span className="leading-[1.4] whitespace-pre">
            {cell.lyric || " "}
          </span>
        )}
      </span>
    );
  };

  const hasMarks = (words: Cell[][]) =>
    words.some((word) =>
      word.some((cell) => {
        if (cell.kind !== "chord") return false;
        const entry = analysis.entries[String(cell.index)];
        return (
          !!entry &&
          (entry.badges.length > 0 ||
            !!entry.custom.trim() ||
            (showFunctions && !!entry.fn))
        );
      }),
    );

  return (
    <div
      ref={containerRef}
      data-analysis-sheet=""
      className={cn("relative font-medium", className)}
      style={style}
    >
      {geometry && (
        <Underlay
          geometry={geometry}
          analysis={analysis}
          numbers={rangeNoteNumber}
        />
      )}
      <div className="relative z-10">
        {lines.map((line, i) => {
          switch (line.kind) {
            case "gap":
              return <div key={i} className="h-[0.9em]" />;
            case "heading":
              return (
                <div
                  key={i}
                  className="text-muted-foreground border-border/70 mt-[1.3em] mb-[0.5em] flex items-center gap-[0.5em] border-b pb-[0.3em] text-[0.66em] font-bold tracking-[0.14em] uppercase first:mt-0"
                >
                  {headingLabel(line)}
                  {line.heading?.repeat && line.heading.repeat > 1 && (
                    <span className="bg-muted text-foreground rounded-[0.4em] px-[0.5em] font-mono tracking-normal normal-case">
                      ×{line.heading.repeat}
                    </span>
                  )}
                </div>
              );
            case "comment":
              return (
                <p
                  key={i}
                  className="text-muted-foreground my-[0.3em] text-[0.8em] italic"
                >
                  {line.text}
                </p>
              );
            case "text":
              if (!showLyrics) return null;
              return (
                <p key={i} className="text-foreground/85 leading-[1.45]">
                  {line.text}
                </p>
              );
            case "chords": {
              const marks = hasMarks(line.words);
              const bare = line.bare || !showLyrics;
              return (
                <div
                  key={i}
                  className={cn(
                    "flex flex-wrap items-end pt-[1.25em]",
                    bare ? "gap-y-[0.2em]" : "gap-y-[0.15em]",
                  )}
                >
                  {line.words.map((word, w) => (
                    <span key={w} className="inline-flex items-end">
                      {word.map((cell, c) =>
                        renderCell(cell, `${w}-${c}`, marks, bare),
                      )}
                    </span>
                  ))}
                </div>
              );
            }
          }
        })}
      </div>
      {geometry && (
        <Overlay
          geometry={geometry}
          connections={analysis.connections}
          bracketTwoFive={twoFiveStyle === "bracket"}
          highlight={highlightConnection}
        />
      )}
    </div>
  );
}
