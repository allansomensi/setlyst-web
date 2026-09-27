"use client";

import { useTranslations } from "next-intl";
import { Minus, Plus, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MAX_TRANSPOSE } from "@/hooks/use-transpose";
import type { SetlistKeyStatus } from "@/hooks/use-setlist-keys";

interface TransposeControlsProps {
  semitones: number;
  onShift: (delta: number) => void;
  onReset: () => void;
  /** The key now being played, or null when the song has none stored. */
  transposedKey: string | null;
  capoFret: number | null;
  /**
   * In a setlist: whether this key is the one saved in the setlist. Absent
   * for a song on its own, whose key changes are never saved.
   */
  status?: SetlistKeyStatus;
  className?: string;
}

export function TransposeControls({
  semitones,
  onShift,
  onReset,
  transposedKey,
  capoFret,
  status,
  className,
}: TransposeControlsProps) {
  const t = useTranslations("liveMode.transpose");
  const isTransposed = semitones !== 0;
  // "Saved" only says something when the song isn't in its written key.
  const statusText =
    status === "saving"
      ? t("saving")
      : status === "local"
        ? t("sessionOnly")
        : status === "saved" && isTransposed
          ? t("savedInSetlist")
          : null;

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <div className="bg-background/50 flex items-center rounded-lg border">
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10"
          onClick={() => onShift(-1)}
          disabled={semitones <= -MAX_TRANSPOSE}
          title={t("down")}
          aria-label={t("down")}
        >
          <Minus className="h-4 w-4" aria-hidden />
        </Button>

        <span
          className="flex w-20 flex-col items-center leading-none"
          aria-live="polite"
        >
          {/* The key is what a musician actually needs to see — the
              semitone count is only how they got there, so it is the
              smaller of the two. */}
          <span
            className={cn(
              "font-mono text-sm font-bold tabular-nums",
              isTransposed ? "text-primary" : "text-foreground",
            )}
          >
            {transposedKey ?? (isTransposed ? formatOffset(semitones) : "—")}
          </span>
          <span className="text-muted-foreground text-[11px] tracking-wider uppercase">
            {isTransposed ? formatOffset(semitones) : t("original")}
          </span>
        </span>

        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10"
          onClick={() => onShift(1)}
          disabled={semitones >= MAX_TRANSPOSE}
          title={t("up")}
          aria-label={t("up")}
        >
          <Plus className="h-4 w-4" aria-hidden />
        </Button>
      </div>

      {/* Only shown when transposing down, because that is the only
          direction a capo can compensate for. */}
      {capoFret !== null && (
        <span
          className="bg-background/50 flex h-10 items-center rounded-lg border px-3 text-xs font-bold tracking-wider uppercase"
          title={t("capoHelp")}
        >
          {t("capo", { fret: capoFret })}
        </span>
      )}

      <Button
        variant="ghost"
        size="icon"
        className="h-10 w-10"
        onClick={onReset}
        disabled={!isTransposed}
        title={t("reset")}
        aria-label={t("reset")}
      >
        <RotateCcw className="h-4 w-4" aria-hidden />
      </Button>

      {statusText && (
        <p className="text-muted-foreground w-full text-xs" aria-live="polite">
          {statusText}
        </p>
      )}
    </div>
  );
}

function formatOffset(semitones: number): string {
  return semitones > 0 ? `+${semitones}` : String(semitones);
}
