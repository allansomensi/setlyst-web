import { getTranslations } from "next-intl/server";
import {
  AlignLeft,
  ChevronLeft,
  ChevronRight,
  Mic,
  WifiOff,
  X,
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
          <span className="h-[1.15em] text-[0.8em] font-extrabold text-yellow-300">
            {part.chord || " "}
          </span>
          <span>{part.text || " "}</span>
        </span>
      ))}
    </p>
  );
}

/**
 * Illustration of the Live Mode screen with its high-contrast palette
 * (black, white, yellow chords: `[data-live-contrast="high"]` in
 * globals.css), laid out like the real screen: the header with the song,
 * its place in the setlist, BPM with the running metronome and the key;
 * section headings and the chorus accent of the lyrics; the previous /
 * next bar with the coming song. Its labels are the Live Mode's own
 * strings, so the picture never drifts from the product's wording.
 * Purely decorative (`aria-hidden`); the text around it describes the
 * feature.
 */
export async function LiveModeMock({ className }: { className?: string }) {
  const [t, tLive, tLyrics] = await Promise.all([
    getTranslations("landing.mock"),
    getTranslations("liveMode"),
    getTranslations("lyrics.toolbar"),
  ]);
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
        "relative overflow-hidden rounded-2xl border border-white/15 bg-black text-white shadow-2xl shadow-black/30 select-none",
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-white/20 py-2.5 pr-3 pl-4 sm:pl-2">
        {/* Without the close button on a phone, the song's name fits. */}
        <span className="hidden size-7 shrink-0 items-center justify-center text-white/80 sm:flex">
          <X className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base leading-tight font-bold tracking-tight sm:text-lg">
            Estrada de Terra
          </p>
          <p className="truncate text-[10px] font-medium tracking-wider text-white/70 uppercase">
            {t("setlistTitle")} ·{" "}
            {tLive("songPosition", { current: 3, total: 12 })}
          </p>
        </div>
        <span className="hidden items-center gap-1 rounded-full border border-amber-400/50 px-2 py-0.5 text-[10px] font-bold text-amber-400 sm:flex">
          <WifiOff className="size-3" />
          {tLive("offline")}
        </span>
        <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-xs font-bold tabular-nums">
          92
          <span className="text-[10px] opacity-70">{tLive("bpm")}</span>
          {/* The running beat from `sm`: on a phone its room goes to
              the setlist's name. */}
          <span className="hidden gap-0.5 sm:flex">
            <span className="landing-beat size-1.5 rounded-full bg-yellow-300" />
            <span className="landing-beat size-1.5 rounded-full bg-zinc-600 [animation-delay:0.652s]" />
            <span className="landing-beat size-1.5 rounded-full bg-zinc-600 [animation-delay:1.304s]" />
            <span className="landing-beat size-1.5 rounded-full bg-zinc-600 [animation-delay:1.956s]" />
          </span>
        </span>
        <span className="rounded-full bg-yellow-300 px-2.5 py-1 text-xs font-bold text-black">
          <span className="opacity-70">{tLive("key")}</span> G
        </span>
      </div>

      {/* Lyrics */}
      <div className="relative px-5 pt-5 pb-3 text-lg leading-snug font-semibold sm:px-6 sm:text-xl">
        <p className="mb-2 flex items-center gap-1.5 border-b border-white/30 pb-1 text-[10px] font-bold tracking-[0.14em] uppercase">
          <Mic className="size-3" strokeWidth={2.5} />
          {t("chorus")}
        </p>
        <div className="space-y-1 border-l-2 border-yellow-300 pl-3">
          {lines.map((line) => (
            <ChordLine key={line} line={line} />
          ))}
        </div>
        <p className="mt-5 flex items-center gap-1.5 border-b border-white/30 pb-1 text-[10px] font-bold tracking-[0.14em] uppercase">
          <AlignLeft className="size-3" strokeWidth={2.5} />
          {tLyrics("verse")} 2
        </p>
        {/* The song carries on below: auto-scroll will bring it up. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black to-transparent" />
      </div>

      {/* Setlist progress and previous / next */}
      <div className="border-t border-white/20">
        <div className="h-0.5 bg-white/15">
          <div className="h-full w-1/4 bg-yellow-300" />
        </div>
        <div className="flex items-center justify-between gap-3 px-3 py-2.5">
          <span className="flex items-center gap-1 rounded-lg border border-white/40 px-2.5 py-1.5 text-[11px] font-bold tracking-wide text-white/80">
            <ChevronLeft className="size-3.5" />
            {tLive("prev")}
          </span>
          <span className="min-w-0 text-center">
            <span className="block text-[9px] font-semibold tracking-[0.14em] text-white/60 uppercase">
              {tLive("nextSong")}
            </span>
            <span className="block truncate text-xs font-bold">
              Luz do Farol
            </span>
          </span>
          <span className="flex items-center gap-1 rounded-lg bg-yellow-300 px-2.5 py-1.5 text-[11px] font-bold tracking-wide text-black">
            {tLive("next")}
            <ChevronRight className="size-3.5" />
          </span>
        </div>
      </div>
    </div>
  );
}
