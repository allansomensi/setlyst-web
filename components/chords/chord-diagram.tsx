"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  chordNotes,
  noteNameIn,
  type ChordNotes,
} from "@/lib/music/chord-theory";
import {
  TUNINGS,
  formatFrets,
  frettedVoicings,
  keyboardVoicings,
  type FrettedVoicing,
  type KeyboardVoicing,
  type StringInstrument,
} from "@/lib/music/voicings";
import type { ChordInstrument } from "@/lib/ui-settings";

const mod12 = (n: number) => ((n % 12) + 12) % 12;

/** What a dot says: the tone's interval ("R", "3", "b7"). */
function intervalLabel(chord: ChordNotes, pitchClass: number): string {
  const index = chord.tones.findIndex(
    (tone) => mod12(chord.rootPitchClass + tone.semitones) === pitchClass,
  );
  if (index < 0) return "B";
  if (index === 0) return "R";
  return chord.intervalNames[index];
}

type ToneRole = "root" | "bass" | "tone";

function roleOf(chord: ChordNotes, pitchClass: number): ToneRole {
  if (pitchClass === chord.rootPitchClass) return "root";
  if (
    chord.bassPitchClass === pitchClass &&
    !chord.tones.some(
      (tone) => mod12(chord.rootPitchClass + tone.semitones) === pitchClass,
    )
  ) {
    return "bass";
  }
  return "tone";
}

const DOT_FILL: Record<ToneRole, string> = {
  root: "fill-primary",
  bass: "fill-chart-2",
  tone: "fill-foreground",
};
const DOT_TEXT: Record<ToneRole, string> = {
  root: "fill-primary-foreground",
  bass: "fill-background",
  tone: "fill-background",
};

// Fretted instruments

const FRETS_SHOWN = 5;

export function FrettedDiagram({
  chord,
  voicing,
  instrument,
  leftHanded = false,
  className,
}: {
  chord: ChordNotes;
  voicing: FrettedVoicing;
  instrument: StringInstrument;
  leftHanded?: boolean;
  className?: string;
}) {
  const t = useTranslations("chordDiagram");
  const tuning = TUNINGS[instrument];
  const n = tuning.strings.length;
  const gap = n >= 6 ? 22 : 30;
  const fretGap = 26;
  const padLeft = 28;
  const padRight = 16;
  const padTop = 26;
  const padBottom = 22;
  const width = padLeft + gap * (n - 1) + padRight;
  const height = padTop + fretGap * FRETS_SHOWN + padBottom;

  const fretted = voicing.frets.filter((f): f is number => f !== null && f > 0);
  const top = fretted.length ? Math.max(...fretted) : 0;
  const low = fretted.length ? Math.min(...fretted) : 0;
  const base = top <= FRETS_SHOWN ? 1 : low;
  const x = (s: number) => padLeft + gap * (leftHanded ? n - 1 - s : s);
  const y = (fret: number) => padTop + fretGap * (fret - base + 0.5);

  const pitchClassAt = (s: number, fret: number) =>
    mod12(tuning.strings[s] + fret);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={t("fretsLabel", {
        chord: chord.symbol,
        frets: formatFrets(voicing.frets),
      })}
      className={cn("h-auto w-full max-w-[13rem] select-none", className)}
    >
      {/* Frets */}
      {Array.from({ length: FRETS_SHOWN + 1 }, (_, i) => (
        <line
          key={`f${i}`}
          x1={padLeft}
          x2={padLeft + gap * (n - 1)}
          y1={padTop + fretGap * i}
          y2={padTop + fretGap * i}
          className="stroke-muted-foreground/45"
          strokeWidth={i === 0 && base === 1 ? 0 : 1}
        />
      ))}
      {base === 1 && (
        <rect
          x={padLeft - 1}
          y={padTop - 4}
          width={gap * (n - 1) + 2}
          height={5}
          rx={1.5}
          className="fill-foreground"
        />
      )}
      {base > 1 && (
        <text
          x={padLeft - 8}
          y={padTop + fretGap * 0.5}
          dominantBaseline="central"
          textAnchor="end"
          className="fill-muted-foreground text-[10px] font-semibold"
        >
          {t("fretNumber", { fret: base })}
        </text>
      )}

      {/* Strings */}
      {tuning.strings.map((_, s) => (
        <line
          key={`s${s}`}
          x1={x(s)}
          x2={x(s)}
          y1={padTop}
          y2={padTop + fretGap * FRETS_SHOWN}
          className="stroke-muted-foreground/70"
          strokeWidth={instrument === "guitar" ? 1 + (n - 1 - s) * 0.18 : 1.2}
        />
      ))}

      {/* Open / muted markers */}
      {voicing.frets.map((fret, s) => {
        if (fret === null) {
          return (
            <g
              key={`m${s}`}
              className="stroke-muted-foreground"
              strokeWidth={1.6}
            >
              <line
                x1={x(s) - 4}
                x2={x(s) + 4}
                y1={padTop - 15}
                y2={padTop - 7}
              />
              <line
                x1={x(s) + 4}
                x2={x(s) - 4}
                y1={padTop - 15}
                y2={padTop - 7}
              />
            </g>
          );
        }
        if (fret === 0) {
          const role = roleOf(chord, pitchClassAt(s, 0));
          return (
            <circle
              key={`o${s}`}
              cx={x(s)}
              cy={padTop - 11}
              r={4.2}
              fill="none"
              strokeWidth={1.6}
              className={
                role === "root" ? "stroke-primary" : "stroke-foreground"
              }
            />
          );
        }
        return null;
      })}

      {/* Barre */}
      {voicing.barre && (
        <rect
          x={Math.min(x(voicing.barre.from), x(voicing.barre.to)) - 9}
          y={y(voicing.barre.fret) - 9}
          width={Math.abs(x(voicing.barre.to) - x(voicing.barre.from)) + 18}
          height={18}
          rx={9}
          className="fill-foreground/85"
        />
      )}

      {/* Fretted notes */}
      {voicing.frets.map((fret, s) => {
        if (fret === null || fret === 0) return null;
        const pc = pitchClassAt(s, fret);
        const role = roleOf(chord, pc);
        const label = intervalLabel(chord, pc);
        return (
          <g key={`d${s}`}>
            <circle cx={x(s)} cy={y(fret)} r={9} className={DOT_FILL[role]} />
            <text
              x={x(s)}
              y={y(fret)}
              dominantBaseline="central"
              textAnchor="middle"
              className={cn(
                DOT_TEXT[role],
                label.length > 2 ? "text-[7px]" : "text-[8.5px]",
                "font-bold",
              )}
            >
              {label}
            </text>
          </g>
        );
      })}

      {/* Note names under the strings */}
      {voicing.frets.map((fret, s) =>
        fret === null ? null : (
          <text
            key={`n${s}`}
            x={x(s)}
            y={padTop + fretGap * FRETS_SHOWN + 14}
            textAnchor="middle"
            className={cn(
              "text-[9px] font-medium",
              roleOf(chord, pitchClassAt(s, fret)) === "root"
                ? "fill-primary"
                : "fill-muted-foreground",
            )}
          >
            {noteNameIn(chord, pitchClassAt(s, fret))}
          </text>
        ),
      )}
    </svg>
  );
}

// Keyboard

const BLACK = new Set([1, 3, 6, 8, 10]);

export function KeyboardDiagram({
  chord,
  voicing,
  className,
}: {
  chord: ChordNotes;
  voicing: KeyboardVoicing;
  className?: string;
}) {
  const t = useTranslations("chordDiagram");
  const all = [voicing.bass, ...voicing.notes];
  const low = Math.floor(Math.min(...all) / 12) * 12;
  let high = Math.floor(Math.max(...all) / 12) * 12 + 11;
  if (high - low < 23) high = low + 23;

  const whites: number[] = [];
  for (let m = low; m <= high; m++) if (!BLACK.has(mod12(m))) whites.push(m);
  const whiteWidth = 13;
  const whiteHeight = 62;
  const blackWidth = 8.5;
  const blackHeight = 38;
  const width = whites.length * whiteWidth + 2;
  const height = whiteHeight + 18;
  const whiteIndex = new Map(whites.map((m, i) => [m, i]));

  const rightHand = new Set(voicing.notes);
  const fillFor = (m: number, black: boolean) => {
    if (m === voicing.bass) return "fill-chart-2";
    if (rightHand.has(m)) {
      return mod12(m) === chord.rootPitchClass
        ? "fill-primary"
        : black
          ? "fill-primary/80"
          : "fill-primary/70";
    }
    return black ? "fill-foreground" : "fill-card";
  };

  const keyX = (m: number) => {
    if (!BLACK.has(mod12(m))) return 1 + (whiteIndex.get(m) ?? 0) * whiteWidth;
    return (
      1 +
      (whiteIndex.get(m - 1) ?? 0) * whiteWidth +
      whiteWidth -
      blackWidth / 2
    );
  };

  const marked = [...new Set(all)].sort((a, b) => a - b);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={t("keysLabel", {
        chord: chord.symbol,
        notes: marked.map((m) => noteNameIn(chord, mod12(m))).join(" "),
      })}
      className={cn("h-auto w-full select-none", className)}
    >
      {whites.map((m) => (
        <rect
          key={m}
          x={keyX(m)}
          y={1}
          width={whiteWidth}
          height={whiteHeight}
          rx={2}
          className={cn(fillFor(m, false), "stroke-muted-foreground/50")}
          strokeWidth={0.8}
        />
      ))}
      {whites.map((m) =>
        mod12(m) === 0 ? (
          <text
            key={`c${m}`}
            x={keyX(m) + whiteWidth / 2}
            y={whiteHeight - 6}
            textAnchor="middle"
            className="fill-muted-foreground/60 text-[6px]"
          >
            {`C${Math.floor(m / 12) - 1}`}
          </text>
        ) : null,
      )}
      {Array.from({ length: high - low + 1 }, (_, i) => low + i)
        .filter((m) => BLACK.has(mod12(m)))
        .map((m) => (
          <rect
            key={m}
            x={keyX(m)}
            y={1}
            width={blackWidth}
            height={blackHeight}
            rx={1.5}
            className={fillFor(m, true)}
          />
        ))}
      {marked.map((m) => (
        <text
          key={`l${m}`}
          x={keyX(m) + (BLACK.has(mod12(m)) ? blackWidth : whiteWidth) / 2}
          y={whiteHeight + 12}
          textAnchor="middle"
          className={cn(
            "text-[8px] font-semibold",
            m === voicing.bass
              ? "fill-chart-2"
              : mod12(m) === chord.rootPitchClass
                ? "fill-primary"
                : "fill-foreground",
          )}
        >
          {noteNameIn(chord, mod12(m))}
        </text>
      ))}
    </svg>
  );
}

// The whole diagram

/**
 * A chord drawn for the chosen instrument, with its notes and a way to
 * step through the other voicings (or inversions, on the keyboard).
 */
export function ChordDiagram({
  symbol,
  instrument,
  leftHanded = false,
  className,
}: {
  symbol: string;
  instrument: ChordInstrument;
  leftHanded?: boolean;
  className?: string;
}) {
  const t = useTranslations("chordDiagram");
  const chord = useMemo(() => chordNotes(symbol), [symbol]);
  const [variant, setVariant] = useState({ key: "", index: 0 });

  const fretted = useMemo(
    () =>
      chord && instrument !== "keyboard"
        ? frettedVoicings(chord, instrument, 8)
        : [],
    [chord, instrument],
  );
  const keys = useMemo(
    () => (chord && instrument === "keyboard" ? keyboardVoicings(chord) : []),
    [chord, instrument],
  );

  const variantKey = `${symbol}|${instrument}`;
  const index = variant.key === variantKey ? variant.index : 0;
  const total = instrument === "keyboard" ? keys.length : fretted.length;
  const current = Math.min(index, Math.max(0, total - 1));
  const go = (delta: number) =>
    setVariant({
      key: variantKey,
      index: (current + delta + total) % total,
    });

  if (!chord) {
    return (
      <p
        className={cn(
          "text-muted-foreground py-6 text-center text-sm",
          className,
        )}
      >
        {t("unknown")}
      </p>
    );
  }

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <p className="text-muted-foreground flex flex-wrap justify-center gap-x-2 text-xs">
        {chord.noteNames.map((name, i) => (
          <span key={i} className="inline-flex items-baseline gap-0.5">
            <span
              className={cn(
                "font-semibold",
                i === 0 ? "text-primary" : "text-foreground",
              )}
            >
              {name}
            </span>
            <span className="text-[0.65rem] opacity-70">
              {i === 0 ? "R" : chord.intervalNames[i]}
            </span>
          </span>
        ))}
        {chord.bassName && (
          <span className="inline-flex items-baseline gap-0.5">
            <span className="text-chart-2 font-semibold">
              /{chord.bassName}
            </span>
            <span className="text-[0.65rem] opacity-70">{t("bass")}</span>
          </span>
        )}
      </p>

      <div className="flex min-h-40 w-full items-center justify-center">
        {total === 0 ? (
          <p className="text-muted-foreground px-4 text-center text-sm">
            {t("noVoicing")}
          </p>
        ) : instrument === "keyboard" ? (
          <KeyboardDiagram chord={chord} voicing={keys[current]} />
        ) : (
          <FrettedDiagram
            chord={chord}
            voicing={fretted[current]}
            instrument={instrument}
            leftHanded={leftHanded}
          />
        )}
      </div>

      {total > 1 && (
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => go(-1)}
            aria-label={t("previous")}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </Button>
          <span className="text-muted-foreground min-w-24 text-center text-xs tabular-nums">
            {instrument === "keyboard"
              ? t("inversion", { index: current })
              : t("voicing", { index: current + 1, total })}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => go(1)}
            aria-label={t("next")}
          >
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      )}
    </div>
  );
}
