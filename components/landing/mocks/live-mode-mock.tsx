import { getTranslations } from "next-intl/server";
import {
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  Timer,
  WifiOff,
} from "lucide-react";
import { cn } from "@/lib/utils";

/** Splits a ChordPro line (`[G]Sigo a [D]estrada`) into chord/text pairs. */
function parseChordLine(line: string): { chord: string; text: string }[] {
  const parts: { chord: string; text: string }[] = [];
  const regex = /\[([^\]]+)\]([^[]*)/g;
  const first = line.indexOf("[");
  if (first !== 0) parts.push({ chord: "", text: line.slice(0, first) });
  for (const match of line.matchAll(regex)) {
    parts.push({ chord: match[1], text: match[2] });
  }
  return parts.length ? parts : [{ chord: "", text: line }];
}

function ChordLine({ line }: { line: string }) {
  return (
    <p className="flex flex-wrap">
      {parseChordLine(line).map((part, index) => (
        <span key={index} className="inline-flex flex-col whitespace-pre">
          <span className="h-5 font-mono text-[0.8em] font-bold text-amber-300">
            {part.chord || " "}
          </span>
          <span>{part.text || " "}</span>
        </span>
      ))}
    </p>
  );
}

/**
 * Illustration of the Live Mode screen: a song in large type with chords
 * above the lyrics, key, tempo with a running metronome, and the
 * previous/next controls. Purely decorative (`aria-hidden`); the text
 * around it describes the feature.
 */
export async function LiveModeMock({ className }: { className?: string }) {
  const t = await getTranslations("landing.mock");
  const lines = [
    t("lyrics.l1"),
    t("lyrics.l2"),
    t("lyrics.l3"),
    t("lyrics.l4"),
  ];

  return (
    <div
      aria-hidden
      className={cn(
        "relative overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 text-zinc-50 shadow-2xl shadow-black/30 select-none",
        className,
      )}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5 text-[11px] font-semibold tracking-wider text-zinc-400 uppercase">
        <span className="flex items-center gap-1">
          <ChevronLeft className="size-3.5" />
          {t("prev")}
        </span>
        <span className="flex items-center gap-2 tabular-nums">
          <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] text-emerald-300 normal-case">
            <WifiOff className="size-3" />
            {t("offline")}
          </span>
          3 / 12
        </span>
        <span className="flex items-center gap-1 text-zinc-200">
          {t("next")}
          <ChevronRight className="size-3.5" />
        </span>
      </div>

      {/* Song header */}
      <div className="flex flex-wrap items-end justify-between gap-3 px-5 pt-5">
        <div>
          <p className="text-xl font-bold tracking-tight sm:text-2xl">
            Estrada de Terra
          </p>
          <p className="text-sm text-zinc-400">Banda Aurora</p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="rounded-md bg-white/10 px-2 py-1 font-semibold">
            {t("key")} <span className="text-amber-300">A</span>
            <span className="ml-1 text-zinc-400">({t("capo")} 2)</span>
          </span>
          <span className="flex items-center gap-1.5 rounded-md bg-white/10 px-2 py-1 font-semibold tabular-nums">
            <Timer className="size-3.5 text-zinc-400" />
            92 BPM
            <span className="ml-1 flex gap-0.5">
              <span className="landing-beat size-1.5 rounded-full bg-amber-300" />
              <span className="landing-beat size-1.5 rounded-full bg-zinc-600 [animation-delay:0.652s]" />
              <span className="landing-beat size-1.5 rounded-full bg-zinc-600 [animation-delay:1.304s]" />
              <span className="landing-beat size-1.5 rounded-full bg-zinc-600 [animation-delay:1.956s]" />
            </span>
          </span>
        </div>
      </div>

      {/* Lyrics */}
      <div className="space-y-1 px-5 pt-4 pb-5 text-lg leading-snug sm:text-xl">
        <p className="mb-2 inline-block rounded bg-violet-500/20 px-1.5 py-0.5 text-[10px] font-bold tracking-widest text-violet-200 uppercase">
          {t("chorus")}
        </p>
        {lines.map((line) => (
          <ChordLine key={line} line={line} />
        ))}
      </div>

      {/* Auto-scroll progress and controls */}
      <div className="border-t border-white/10 px-4 py-3">
        <div className="mb-3 h-1 overflow-hidden rounded-full bg-white/10">
          <div className="landing-scroll h-full w-2/5 rounded-full bg-violet-400" />
        </div>
        <div className="flex items-center justify-between text-xs text-zinc-300">
          <span className="flex items-center gap-1.5">
            <span className="flex size-6 items-center justify-center rounded-md bg-white/10">
              <Minus className="size-3" />
            </span>
            <span className="font-semibold">{t("transpose")}</span>
            <span className="flex size-6 items-center justify-center rounded-md bg-white/10">
              <Plus className="size-3" />
            </span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="rounded-md bg-white/10 px-2 py-1 font-semibold">
              A−
            </span>
            <span className="rounded-md bg-white/10 px-2 py-1 font-semibold">
              A+
            </span>
          </span>
          <span className="hidden rounded-md bg-violet-500/25 px-2 py-1 font-semibold text-violet-100 sm:inline">
            {t("nextSong")}: Luz do Farol
          </span>
        </div>
      </div>
    </div>
  );
}
