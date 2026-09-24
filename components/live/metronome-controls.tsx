"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Hand,
  Metronome,
  Minus,
  Pause,
  Plus,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  MAX_BPM,
  MIN_BPM,
  clampBpm,
  type MetronomeController,
} from "@/hooks/use-metronome";

/** Time signatures offered, as beats per bar. Covers almost all of popular music. */
export const BEATS_PER_BAR_OPTIONS = [2, 3, 4, 6] as const;

const BPM_STEP = 1;
const BPM_STEP_LARGE = 5;

/** Taps further apart than this start a new measurement rather than extending one. */
const TAP_RESET_MS = 2500;
/** How many intervals to average. Enough to steady out, short enough to follow a change. */
const TAP_HISTORY = 4;

interface MetronomeControlsProps {
  metronome: MetronomeController;
  isRunning: boolean;
  onToggleRunning: () => void;
  bpm: number;
  onBpmChange: (bpm: number) => void;
  /** True when the BPM shown is the song's own stored tempo, not a manual override. */
  isSongTempo: boolean;
  beatsPerBar: number;
  onBeatsPerBarChange: (beats: number) => void;
  audioEnabled: boolean;
  onAudioEnabledChange: (enabled: boolean) => void;
  className?: string;
}

/**
 * The in-bar beat indicator.
 *
 * Deliberately its own component with its own state: it is the one piece
 * of this UI that must update on every beat, and isolating it keeps those
 * updates from re-rendering the controls around it — let alone the Live
 * Mode screen that hosts them.
 */
function BeatDots({
  metronome,
  isRunning,
  beatsPerBar,
}: {
  metronome: MetronomeController;
  isRunning: boolean;
  beatsPerBar: number;
}) {
  const [activeBeat, setActiveBeat] = useState<number | null>(null);

  useEffect(() => {
    if (!isRunning) return;
    return metronome.subscribe(({ beat }) => setActiveBeat(beat));
  }, [metronome, isRunning]);

  return (
    <div className="flex items-center gap-1" aria-hidden="true">
      {Array.from({ length: beatsPerBar }, (_, index) => (
        <span
          key={index}
          className={cn(
            "rounded-full transition-colors duration-75",
            index === 0 ? "h-2 w-2" : "h-1.5 w-1.5",
            // The last beat seen is left in state when the metronome
            // stops rather than being cleared by the effect above — it
            // simply stops being shown. Clearing it would mean a state
            // write inside an effect for something already derivable.
            isRunning && activeBeat === index
              ? "bg-primary"
              : "bg-muted-foreground/30",
          )}
        />
      ))}
    </div>
  );
}

export function MetronomeControls({
  metronome,
  isRunning,
  onToggleRunning,
  bpm,
  onBpmChange,
  isSongTempo,
  beatsPerBar,
  onBeatsPerBarChange,
  audioEnabled,
  onAudioEnabledChange,
  className,
}: MetronomeControlsProps) {
  const t = useTranslations("liveMode.metronome");

  // Tap timestamps live in a ref: they feed a computation on the next tap
  // and are never rendered, so keeping them in state would re-render the
  // controls on every tap for nothing.
  const tapsRef = useRef<number[]>([]);

  const handleTap = useCallback(() => {
    const now = performance.now();
    const taps = tapsRef.current;

    if (taps.length > 0 && now - taps[taps.length - 1] > TAP_RESET_MS) {
      taps.length = 0;
    }

    taps.push(now);
    if (taps.length > TAP_HISTORY + 1) taps.shift();

    // Two taps give one interval — enough for a first estimate, which then
    // steadies as more arrive.
    if (taps.length < 2) return;

    const intervals: number[] = [];
    for (let i = 1; i < taps.length; i++) intervals.push(taps[i] - taps[i - 1]);
    const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    if (mean <= 0) return;

    onBpmChange(clampBpm(60_000 / mean));
  }, [onBpmChange]);

  const adjustBpm = (delta: number) => onBpmChange(clampBpm(bpm + delta));

  const cycleBeatsPerBar = () => {
    const index = BEATS_PER_BAR_OPTIONS.indexOf(
      beatsPerBar as (typeof BEATS_PER_BAR_OPTIONS)[number],
    );
    const next =
      BEATS_PER_BAR_OPTIONS[(index + 1) % BEATS_PER_BAR_OPTIONS.length];
    onBeatsPerBarChange(next);
  };

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <Button
        variant={isRunning ? "default" : "ghost"}
        size="icon"
        onClick={onToggleRunning}
        className="h-10 w-10 shrink-0 rounded-lg"
        title={isRunning ? t("stop") : t("start")}
        // Fixed name plus pressed state, like the click toggle below.
        aria-label={t("label")}
        aria-pressed={isRunning}
      >
        {isRunning ? (
          <Pause className="h-5 w-5" aria-hidden />
        ) : (
          <Metronome className="h-5 w-5" aria-hidden />
        )}
      </Button>

      {/* Tempo */}
      <div className="bg-background/50 flex items-center rounded-lg border">
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10"
          onClick={() => adjustBpm(-BPM_STEP)}
          onContextMenu={(event) => {
            event.preventDefault();
            adjustBpm(-BPM_STEP_LARGE);
          }}
          disabled={bpm <= MIN_BPM}
          title={t("decreaseTempo")}
          aria-label={t("decreaseTempo")}
        >
          <Minus className="h-4 w-4" aria-hidden />
        </Button>

        <span
          className="flex w-18 flex-col items-center leading-none"
          title={isSongTempo ? t("songTempo") : t("manualTempo")}
          aria-live="polite"
        >
          <span className="font-mono text-sm font-bold tabular-nums">
            {bpm}
          </span>
          <span
            className={cn(
              "text-[11px] tracking-wider uppercase",
              isSongTempo ? "text-primary" : "text-muted-foreground",
            )}
          >
            {isSongTempo ? t("bpmFromSong") : t("bpm")}
          </span>
        </span>

        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10"
          onClick={() => adjustBpm(BPM_STEP)}
          onContextMenu={(event) => {
            event.preventDefault();
            adjustBpm(BPM_STEP_LARGE);
          }}
          disabled={bpm >= MAX_BPM}
          title={t("increaseTempo")}
          aria-label={t("increaseTempo")}
        >
          <Plus className="h-4 w-4" aria-hidden />
        </Button>
      </div>

      {/* Tap tempo — the way to set a tempo for a song that has none saved. */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleTap}
        className="h-10 gap-1.5 px-3"
        title={t("tapTempoTitle")}
      >
        <Hand className="h-4 w-4" aria-hidden />
        <span className="text-xs font-bold tracking-wider">{t("tap")}</span>
      </Button>

      {/* Time signature */}
      <Button
        variant="outline"
        size="sm"
        onClick={cycleBeatsPerBar}
        className="h-10 px-3 font-mono text-xs font-bold"
        title={t("beatsPerBarTitle")}
        aria-label={`${t("beatsPerBarTitle")}: ${beatsPerBar}/4`}
      >
        {beatsPerBar}/4
      </Button>

      {/* Audible click — off by default, since on stage the useful metronome
          is a silent one. */}
      <Button
        variant={audioEnabled ? "secondary" : "ghost"}
        size="icon"
        onClick={() => onAudioEnabledChange(!audioEnabled)}
        className="h-10 w-10"
        title={audioEnabled ? t("muteClick") : t("unmuteClick")}
        // One fixed name with a pressed state: a label that flips between
        // "mute" and "unmute" on top of aria-pressed reads as a double
        // negative to screen readers.
        aria-label={t("clickSound")}
        aria-pressed={audioEnabled}
      >
        {audioEnabled ? (
          <Volume2 className="h-4 w-4" aria-hidden />
        ) : (
          <VolumeX className="h-4 w-4" aria-hidden />
        )}
      </Button>

      <div className="px-1">
        <BeatDots
          metronome={metronome}
          isRunning={isRunning}
          beatsPerBar={beatsPerBar}
        />
      </div>
    </div>
  );
}
