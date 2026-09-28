/**
 * The small typographic pieces of an analysis — a degree, a badge, a key
 * flag, a connection's line style — shared by the sheet, the inspector,
 * the legend and the export, so each is drawn the same way everywhere.
 */

import { cn } from "@/lib/utils";
import {
  degreeIsSet,
  type ChordBadge,
  type ConnectionKind,
  type Degree,
  type HarmonicFunction,
  type NoteColor,
} from "@/lib/music/analysis";

export const FUNCTION_COLOR: Record<HarmonicFunction, string> = {
  T: "var(--an-fn-t)",
  SD: "var(--an-fn-sd)",
  D: "var(--an-fn-d)",
};

export const CONNECTION_COLOR: Record<ConnectionKind, string> = {
  dominant: "var(--an-dominant)",
  subV: "var(--an-subv)",
  twoFive: "var(--an-twofive)",
  deceptive: "var(--an-deceptive)",
  other: "var(--an-other)",
};

/** SVG dash pattern, in multiples of the stroke width. */
export const CONNECTION_DASH: Record<ConnectionKind, number[] | null> = {
  dominant: null,
  subV: [4, 3],
  twoFive: [0.1, 2.6],
  deceptive: [6, 2.5, 0.1, 2.5],
  other: [1.5, 2.5],
};

export const NOTE_COLOR: Record<NoteColor, string> = {
  amber: "var(--an-note-amber)",
  sky: "var(--an-note-sky)",
  violet: "var(--an-note-violet)",
  rose: "var(--an-note-rose)",
  emerald: "var(--an-note-emerald)",
};

/** "b" and "#" as ♭ and ♯ inside degree text ("7(b9)", "bVI"). */
function accidentals(value: string): string {
  return value.replace(/b(?=[IV\d])/g, "♭").replace(/#/g, "♯");
}

/**
 * A degree as harmony books write it: roman numeral, then the chord's
 * quality, then the target of a secondary dominant ("V7/IIm"). Numerals
 * are set in a serif, which is how they're printed in harmony books and
 * what makes them read as numerals rather than letters.
 */
export function DegreeText({
  degree,
  className,
}: {
  degree: Degree | null;
  className?: string;
}) {
  if (!degreeIsSet(degree)) return null;
  return (
    <span
      className={cn("inline-flex items-baseline whitespace-nowrap", className)}
    >
      {degree.sub && (
        <span className="mr-[0.05em] text-[0.78em] font-semibold tracking-tight">
          Sub
        </span>
      )}
      {degree.accidental && (
        <span className="text-[0.95em]">{accidentals(degree.accidental)}</span>
      )}
      <span className="font-serif font-bold tracking-[0.02em]">
        {degree.numeral}
      </span>
      {degree.quality && (
        <span className="text-[0.82em] font-semibold">
          {accidentals(degree.quality)}
        </span>
      )}
      {degree.target && (
        <>
          <span className="mx-[0.05em] opacity-70">/</span>
          <span className="font-serif font-bold">
            {accidentals(degree.target)}
          </span>
        </>
      )}
    </span>
  );
}

/** Where a new key starts: "G:" before the degree. */
export function KeyFlag({
  keyName,
  className,
}: {
  keyName: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "bg-foreground text-background mr-[0.35em] inline-flex items-center rounded-[0.3em] px-[0.35em] py-[0.02em] font-sans text-[0.72em] font-bold tracking-wide",
        className,
      )}
    >
      {accidentals(keyName)}
    </span>
  );
}

export function FunctionBadge({
  fn,
  className,
}: {
  fn: HarmonicFunction;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-[0.45em] text-[0.62em] leading-[1.5] font-bold tracking-wide",
        className,
      )}
      style={{ color: FUNCTION_COLOR[fn], borderColor: FUNCTION_COLOR[fn] }}
    >
      {fn}
    </span>
  );
}

export function MarkBadge({
  badge,
  label,
  className,
}: {
  badge: ChordBadge | "custom";
  label: string;
  className?: string;
}) {
  const aem = badge === "aem";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-[0.45em] text-[0.62em] leading-[1.5] font-bold tracking-wide whitespace-nowrap",
        aem
          ? "text-white"
          : badge === "custom"
            ? "border-foreground/40 text-foreground border"
            : "bg-muted text-muted-foreground",
        className,
      )}
      style={aem ? { backgroundColor: "var(--an-aem)" } : undefined}
    >
      {label}
    </span>
  );
}

/** A connection's stroke, as a short line sample (legend, menus). */
export function ConnectionSample({
  kind,
  bracket = false,
  className,
}: {
  kind: ConnectionKind;
  bracket?: boolean;
  className?: string;
}) {
  const color = CONNECTION_COLOR[kind];
  const dash = CONNECTION_DASH[kind];
  const width = 1.6;
  if (bracket) {
    return (
      <svg
        viewBox="0 0 36 14"
        className={cn("h-3.5 w-9 shrink-0", className)}
        aria-hidden
      >
        <path
          d="M3 3 L3 10 L33 10 L33 3"
          fill="none"
          stroke={color}
          strokeWidth={width}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={undefined}
        />
      </svg>
    );
  }
  return (
    <svg
      viewBox="0 0 36 14"
      className={cn("h-3.5 w-9 shrink-0", className)}
      aria-hidden
    >
      <path
        d="M3 11 C 8 1, 26 1, 31 10"
        fill="none"
        stroke={color}
        strokeWidth={width}
        strokeLinecap="round"
        strokeDasharray={dash?.map((d) => d * width).join(" ")}
      />
      <path d="M27.4 8.2 L31.6 11.6 L32.6 6.4 Z" fill={color} />
    </svg>
  );
}
