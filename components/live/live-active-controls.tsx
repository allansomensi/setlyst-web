"use client";

import { useTranslations } from "next-intl";
import {
  ChevronsDown,
  ChevronsLeft,
  ChevronsRight,
  Metronome,
  Minus,
  Pause,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  SCROLL_MAX,
  SCROLL_MIN,
  type LiveControls,
} from "@/hooks/use-live-controls";
import { useLiveScrollCollapsed } from "@/hooks/use-live-scroll-collapsed";

interface LiveActiveControlsProps {
  controls: LiveControls;
  /** Fit mode leaves nothing to scroll: no auto-scroll shortcut then. */
  canAutoScroll: boolean;
  metronomeRunning: boolean;
  metronomeBpm: number;
  onStopMetronome: () => void;
  className?: string;
}

const formatSpeed = (speed: number) => `${speed.toFixed(2).replace(/0$/, "")}×`;

/**
 * Live Mode's floating corner control, one thumb away on a phone:
 *
 *  - idle: a small, translucent round button that starts auto-scroll in one
 *    tap, instead of opening the settings sheet mid-song;
 *  - scrolling: a pill to pause it and tune the speed, which folds down to
 *    just pause + speed for those who want the lyrics clear (remembered on
 *    this device);
 *  - with the metronome running: a button to stop it.
 */
export function LiveActiveControls({
  controls,
  canAutoScroll,
  metronomeRunning,
  metronomeBpm,
  onStopMetronome,
  className,
}: LiveActiveControlsProps) {
  const t = useTranslations("liveMode");
  const [collapsed, setCollapsed] = useLiveScrollCollapsed();

  const scrolling = controls.isAutoScroll;
  const showStart = canAutoScroll && !scrolling;

  if (!scrolling && !showStart && !metronomeRunning) return null;

  // Idle with nothing else running: just the round start button, dimmed
  // until touched so it doesn't sit on top of the lyrics.
  if (showStart && !metronomeRunning) {
    return (
      <Button
        variant="outline"
        size="icon"
        onClick={() => controls.setAutoScroll(true)}
        aria-label={t("active.startScroll")}
        title={t("active.startScroll")}
        className={cn(
          "bg-card/80 h-12 w-12 rounded-full opacity-70 shadow-lg transition-opacity hover:opacity-100 focus-visible:opacity-100 active:opacity-100",
          className,
        )}
      >
        <ChevronsDown className="h-5 w-5" />
      </Button>
    );
  }

  return (
    <div
      className={cn(
        "bg-card/95 animate-in fade-in slide-in-from-bottom-2 flex items-center gap-1 rounded-full border p-1 shadow-lg",
        className,
      )}
    >
      {showStart && (
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-full"
          onClick={() => controls.setAutoScroll(true)}
          aria-label={t("active.startScroll")}
          title={t("active.startScroll")}
        >
          <ChevronsDown className="h-5 w-5" />
        </Button>
      )}

      {scrolling && (
        <div className="flex items-center">
          {/* The action is spoken from visually hidden text rather than an
              aria-label: an aria-label replaced the visible "Auto-scroll"
              / "1.25×", so saying what's on the button with voice control
              didn't match its name. Now the name contains the visible
              text: "Pause Auto-scroll", "Pause auto-scroll 1.25×". */}
          <Button
            variant="default"
            size="sm"
            className="h-10 gap-1.5 rounded-full px-3"
            onClick={() => controls.setAutoScroll(false)}
            title={t("active.pauseScroll")}
          >
            <Pause className="h-4 w-4" aria-hidden />
            <span className="sr-only">
              {collapsed ? t("active.pauseScroll") : t("active.pause")}{" "}
            </span>
            <span className="font-mono text-xs font-semibold tabular-nums">
              {collapsed
                ? formatSpeed(controls.scrollSpeed)
                : t("sheet.autoScroll")}
            </span>
          </Button>
          {!collapsed && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full"
                onClick={() => controls.stepScrollSpeed(-1)}
                disabled={controls.scrollSpeed <= SCROLL_MIN}
                aria-label={t("settings.decreaseSpeed")}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-10 text-center font-mono text-xs font-semibold tabular-nums">
                {formatSpeed(controls.scrollSpeed)}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full"
                onClick={() => controls.stepScrollSpeed(1)}
                disabled={controls.scrollSpeed >= SCROLL_MAX}
                aria-label={t("settings.increaseSpeed")}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground h-10 w-7 rounded-full"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={
              collapsed ? t("active.expandScroll") : t("active.collapseScroll")
            }
            aria-expanded={!collapsed}
            title={
              collapsed ? t("active.expandScroll") : t("active.collapseScroll")
            }
          >
            {collapsed ? (
              <ChevronsLeft className="h-4 w-4" />
            ) : (
              <ChevronsRight className="h-4 w-4" />
            )}
          </Button>
        </div>
      )}

      {(scrolling || showStart) && metronomeRunning && (
        <span className="bg-border mx-0.5 h-6 w-px" aria-hidden />
      )}

      {metronomeRunning && (
        <Button
          variant="ghost"
          size="sm"
          className="h-10 gap-1.5 rounded-full px-3"
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
