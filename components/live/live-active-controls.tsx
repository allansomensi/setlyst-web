"use client";

import { useTranslations } from "next-intl";
import { Metronome, Minus, Pause, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  SCROLL_MAX,
  SCROLL_MIN,
  type LiveControls,
} from "@/hooks/use-live-controls";

interface LiveActiveControlsProps {
  controls: LiveControls;
  metronomeRunning: boolean;
  metronomeBpm: number;
  onStopMetronome: () => void;
  className?: string;
}

/**
 * A small floating bar that only exists while something is *running* —
 * auto-scroll or the metronome — so it can be stopped or tuned in one tap
 * without opening the settings sheet mid-song. When nothing runs, the
 * lyrics have the whole screen.
 */
export function LiveActiveControls({
  controls,
  metronomeRunning,
  metronomeBpm,
  onStopMetronome,
  className,
}: LiveActiveControlsProps) {
  const t = useTranslations("liveMode");

  if (!controls.isAutoScroll && !metronomeRunning) return null;

  return (
    <div
      className={cn(
        "bg-card/95 animate-in fade-in slide-in-from-bottom-2 flex items-center gap-1 rounded-full border p-1 shadow-lg",
        className,
      )}
    >
      {controls.isAutoScroll && (
        <div className="flex items-center">
          <Button
            variant="default"
            size="sm"
            className="h-9 gap-1.5 rounded-full px-3"
            onClick={() => controls.setAutoScroll(false)}
            aria-label={t("active.pauseScroll")}
            title={t("active.pauseScroll")}
          >
            <Pause className="h-4 w-4" />
            <span className="text-xs font-semibold">
              {t("sheet.autoScroll")}
            </span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full"
            onClick={() => controls.stepScrollSpeed(-1)}
            disabled={controls.scrollSpeed <= SCROLL_MIN}
            aria-label={t("settings.decreaseSpeed")}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <span className="w-10 text-center font-mono text-xs font-semibold tabular-nums">
            {controls.scrollSpeed.toFixed(2).replace(/0$/, "")}×
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full"
            onClick={() => controls.stepScrollSpeed(1)}
            disabled={controls.scrollSpeed >= SCROLL_MAX}
            aria-label={t("settings.increaseSpeed")}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      )}

      {controls.isAutoScroll && metronomeRunning && (
        <span className="bg-border mx-0.5 h-6 w-px" aria-hidden />
      )}

      {metronomeRunning && (
        <Button
          variant="ghost"
          size="sm"
          className="h-9 gap-1.5 rounded-full px-3"
          onClick={onStopMetronome}
          aria-label={t("metronome.stop")}
          title={t("metronome.stop")}
        >
          <Metronome className="text-primary h-4 w-4" />
          <span className="font-mono text-xs font-semibold tabular-nums">
            {metronomeBpm}
          </span>
          <Pause className="h-3.5 w-3.5 opacity-70" />
        </Button>
      )}
    </div>
  );
}
