"use client";

import { useTranslations } from "next-intl";
import { Minus, Plus, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MAX_TRANSPOSE } from "@/hooks/use-transpose";

interface TransposeControlsProps {
  semitones: number;
  onShift: (delta: number) => void;
  onReset: () => void;
  /** The key now being played, or null when the song has none stored. */
  transposedKey: string | null;
  capoFret: number | null;
}

export function TransposeControls({
  semitones,
  onShift,
  onReset,
  transposedKey,
  capoFret,
}: TransposeControlsProps) {
  const t = useTranslations("liveMode.transpose");
  const isTransposed = semitones !== 0;

  return (
    <div className="bg-card/90 flex flex-wrap items-center gap-1.5 rounded-xl border p-1 shadow-2xl backdrop-blur-lg md:gap-2 md:p-2">
      <div className="bg-background/50 flex items-center rounded-lg border">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 md:h-9 md:w-9"
          onClick={() => onShift(-1)}
          disabled={semitones <= -MAX_TRANSPOSE}
          title={t("down")}
        >
          <Minus className="h-3 w-3 md:h-4 md:w-4" />
        </Button>

        <span className="flex w-16 flex-col items-center leading-none md:w-20">
          {/* The key is what a musician actually needs to see — the
              semitone count is only how they got there, so it is the
              smaller of the two. */}
          <span
            className={cn(
              "font-mono text-xs font-bold tabular-nums md:text-sm",
              isTransposed ? "text-primary" : "text-foreground",
            )}
          >
            {transposedKey ?? (isTransposed ? formatOffset(semitones) : "—")}
          </span>
          <span className="text-muted-foreground text-[8px] tracking-wider uppercase md:text-[9px]">
            {isTransposed ? formatOffset(semitones) : t("original")}
          </span>
        </span>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 md:h-9 md:w-9"
          onClick={() => onShift(1)}
          disabled={semitones >= MAX_TRANSPOSE}
          title={t("up")}
        >
          <Plus className="h-3 w-3 md:h-4 md:w-4" />
        </Button>
      </div>

      {/* Only shown when transposing down, because that is the only
          direction a capo can compensate for. */}
      {capoFret !== null && (
        <span
          className="bg-background/50 rounded-lg border px-2 py-1 text-[10px] font-bold tracking-wider uppercase md:text-xs"
          title={t("capoHelp")}
        >
          {t("capo", { fret: capoFret })}
        </span>
      )}

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 md:h-9 md:w-9"
        onClick={onReset}
        disabled={!isTransposed}
        title={t("reset")}
      >
        <RotateCcw className="h-3 w-3 md:h-4 md:w-4" />
      </Button>
    </div>
  );
}

function formatOffset(semitones: number): string {
  return semitones > 0 ? `+${semitones}` : String(semitones);
}
