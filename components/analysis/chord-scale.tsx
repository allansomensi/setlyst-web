"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { Degree } from "@/lib/music/analysis";
import {
  chordScale,
  chordShape,
  mod12,
  type ChordScale,
  type ChordShape,
  type ScaleTone,
} from "@/lib/music/analysis-theory";

/** Which inversion a slash chord is in, by the role of its bass. */
function inversionOf(
  shape: ChordShape,
): "root" | "first" | "second" | "third" | "foreign" {
  if (shape.bass === null || shape.bass === shape.root) return "root";
  const interval = mod12(shape.bass - shape.root);
  const tone = shape.notes.tones.find((t) => mod12(t.semitones) === interval);
  if (!tone) return "foreign";
  if (tone.degree === 3 || tone.degree === 2 || tone.degree === 4) {
    return "first";
  }
  if (tone.degree === 5) return "second";
  if (tone.degree === 7) return "third";
  return "foreign";
}

const ROLE_CLASS: Record<ScaleTone["role"], string> = {
  chord: "bg-primary text-primary-foreground border-primary",
  tension: "border-primary/50 text-foreground bg-primary/5",
  avoid:
    "border-dashed border-muted-foreground/50 text-muted-foreground line-through decoration-1",
};

/**
 * One octave of a keyboard with the scale on it: chord tones filled, the
 * available tensions ringed, avoid notes crossed. Starts on C, so the
 * shape of the scale reads the way a pianist sees it.
 */
function ScaleKeyboard({ scale }: { scale: ChordScale }) {
  const t = useTranslations("analysis.chordFacts");
  const roleOf = new Map<number, ScaleTone>();
  for (const tone of scale.tones) {
    roleOf.set(mod12(scale.root + tone.semitones), tone);
  }
  const whites = [0, 2, 4, 5, 7, 9, 11];
  const blacks = [
    { pc: 1, x: 1 },
    { pc: 3, x: 2 },
    { pc: 6, x: 4 },
    { pc: 8, x: 5 },
    { pc: 10, x: 6 },
  ];
  const W = 20;
  const H = 64;

  const marker = (pc: number, cx: number, cy: number, onBlack: boolean) => {
    const tone = roleOf.get(pc);
    if (!tone) return null;
    const isRoot = pc === scale.root;
    if (tone.role === "avoid") {
      const r = 3.2;
      return (
        <g
          key={`m${pc}`}
          stroke={onBlack ? "white" : "var(--muted-foreground)"}
          strokeWidth={1.4}
          strokeLinecap="round"
        >
          <line x1={cx - r} y1={cy - r} x2={cx + r} y2={cy + r} />
          <line x1={cx - r} y1={cy + r} x2={cx + r} y2={cy - r} />
        </g>
      );
    }
    return (
      <circle
        key={`m${pc}`}
        cx={cx}
        cy={cy}
        r={tone.role === "chord" ? 5 : 4.2}
        fill={tone.role === "chord" ? "var(--primary)" : "transparent"}
        stroke="var(--primary)"
        strokeWidth={isRoot ? 2.6 : 1.6}
      />
    );
  };

  return (
    <svg
      viewBox={`0 0 ${W * 7 + 2} ${H + 2}`}
      className="h-auto w-full max-w-[16rem]"
      role="img"
      aria-label={t("keyboard", {
        notes: scale.tones.map((tone) => tone.name).join(" "),
      })}
    >
      {whites.map((pc, i) => (
        <g key={pc}>
          <rect
            x={1 + i * W}
            y={1}
            width={W}
            height={H}
            rx={2.5}
            fill="var(--background)"
            stroke="var(--border)"
          />
          {marker(pc, 1 + i * W + W / 2, H - 11, false)}
        </g>
      ))}
      {blacks.map(({ pc, x }) => (
        <g key={pc}>
          <rect
            x={1 + x * W - W * 0.32}
            y={1}
            width={W * 0.64}
            height={H * 0.6}
            rx={2}
            fill="var(--foreground)"
          />
          {marker(pc, 1 + x * W, H * 0.6 - 8, true)}
        </g>
      ))}
    </svg>
  );
}

/**
 * A chord taken apart: its notes and intervals, its inversion, and the
 * scale it implies where it stands (with the tensions it allows and the
 * notes to avoid over it).
 */
export function ChordFacts({
  symbol,
  degree,
  keyName,
  className,
}: {
  symbol: string;
  degree: Degree | null;
  /** The key in force at the chord. */
  keyName: string | null;
  className?: string;
}) {
  const t = useTranslations("analysis.chordFacts");
  const tScale = useTranslations("analysis.scales");
  const shape = chordShape(symbol);
  if (!shape) return null;
  const scale = chordScale(shape, degree, keyName);
  const inversion = inversionOf(shape);

  return (
    <div className={cn("space-y-3", className)}>
      <div className="space-y-1.5">
        <p className="text-muted-foreground text-[0.7rem] font-semibold tracking-wide uppercase">
          {t("notes")}
        </p>
        <ul className="flex flex-wrap gap-1">
          {shape.notes.noteNames.map((name, i) => (
            <li
              key={`${name}-${i}`}
              className="bg-muted inline-flex flex-col items-center rounded-md px-2 py-1 leading-tight"
            >
              <span className="font-mono text-sm font-bold">{name}</span>
              <span className="text-muted-foreground text-[0.65rem] font-semibold">
                {shape.notes.intervalNames[i]}
              </span>
            </li>
          ))}
        </ul>
        {inversion !== "root" && shape.bassName && (
          <p className="text-muted-foreground text-xs">
            {t(`inversion.${inversion}`, { bass: shape.bassName })}
          </p>
        )}
      </div>

      {scale && (
        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-muted-foreground text-[0.7rem] font-semibold tracking-wide uppercase">
              {t("scale")}
            </p>
            {!keyName && (
              <span className="text-muted-foreground text-[0.65rem]">
                {t("noKey")}
              </span>
            )}
          </div>
          <p className="text-sm font-semibold">
            {scale.rootName} {scale.id ? tScale(scale.id) : t("customScale")}
          </p>
          <ul className="flex flex-wrap gap-1" aria-label={t("scaleTones")}>
            {scale.tones.map((tone) => (
              <li
                key={tone.semitones}
                title={t(`roles.${tone.role}`)}
                className={cn(
                  "inline-flex min-w-9 flex-col items-center rounded-md border px-1.5 py-0.5 leading-tight",
                  ROLE_CLASS[tone.role],
                )}
              >
                <span className="font-mono text-xs font-bold">{tone.name}</span>
                <span className="text-[0.62rem] font-semibold opacity-80">
                  {tone.label}
                </span>
              </li>
            ))}
          </ul>
          <ScaleKeyboard scale={scale} />
          <ul className="text-muted-foreground flex flex-wrap gap-x-3 gap-y-1 text-[0.68rem]">
            {(["chord", "tension", "avoid"] as const).map((role) => (
              <li key={role} className="inline-flex items-center gap-1.5">
                <span
                  className={cn(
                    "inline-block size-2.5 rounded-full border",
                    role === "chord" && "bg-primary border-primary",
                    role === "tension" && "border-primary",
                    role === "avoid" && "border-muted-foreground border-dashed",
                  )}
                  aria-hidden
                />
                {t(`roles.${role}`)}
              </li>
            ))}
          </ul>
          {scale.alternatives.length > 0 && (
            <p className="text-muted-foreground text-xs">
              {t("alternatives", {
                scales: scale.alternatives.map((id) => tScale(id)).join(", "),
              })}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
