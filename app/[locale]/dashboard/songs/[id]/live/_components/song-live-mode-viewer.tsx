"use client";

import { useState, useEffect, useRef } from "react";
import { Song } from "@/types/api";
import { Button } from "@/components/ui/button";
import { LiveLyricsArea } from "@/components/live/live-lyrics-area";
import { DisplayControls } from "@/components/live/display-controls";
import { useLiveDisplayPrefs } from "@/hooks/use-live-display-prefs";
import { useTranslations } from "next-intl";
import {
  Maximize,
  Minimize,
  X,
  ZoomIn,
  ZoomOut,
  Play,
  Pause,
  Minus,
  Plus,
  Settings2,
  Music,
  Type,
  WifiOff,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { useOfflineSongBundle } from "@/hooks/use-offline-song-bundle";
import { useWakeLock } from "@/hooks/use-wake-lock";
import { useFullscreen } from "@/hooks/use-fullscreen";
import { useMetronome } from "@/hooks/use-metronome";
import { useMetronomeSettings } from "@/hooks/use-metronome-settings";
import { MetronomeFlash } from "@/components/live/metronome-flash";
import { MetronomeControls } from "@/components/live/metronome-controls";
import { useTranspose } from "@/hooks/use-transpose";
import { TransposeControls } from "@/components/live/transpose-controls";

type FontFamily = "sans" | "mono" | "serif";

interface LiveSettings {
  zoomLevel: number;
  fontFamily: FontFamily;
  showChords: boolean;
  isAutoScroll: boolean;
  scrollSpeed: number;
}

interface SongLiveModeViewerProps {
  song: Song;
  initialFontSize?: number;
}

const SCROLL_INTERVAL_MS = 50;
const SCROLL_MIN = 0.1;
const SCROLL_MAX = 8;
const SCROLL_STEP = 0.25;

const FONT_LABELS: Record<FontFamily, string> = {
  sans: "Sans",
  mono: "Mono",
  serif: "Serif",
};

// This is the single-song counterpart to setlists' LiveModeViewer — same
// look and controls, minus everything that only makes sense with a running
// order (next/prev navigation, progress bar, "next song" preview).
export function SongLiveModeViewer({
  song: initialSong,
  initialFontSize = 100,
}: SongLiveModeViewerProps) {
  const t = useTranslations("liveMode");
  const isOnline = useOnlineStatus();

  // See the analogous comment in setlists' LiveModeViewer: prefer the
  // on-device copy kept warm by OfflineSyncProvider over the
  // server-rendered prop.
  const { song } = useOfflineSongBundle(initialSong.id, initialSong);

  const [showControls, setShowControls] = useState(false);

  const { isFullscreen, toggle: toggleFullscreen } = useFullscreen();
  useWakeLock();

  // Tempo comes from the song itself; with only one song on screen there
  // is nothing to follow, but the rest of the behaviour is identical to
  // the setlist viewer's.
  const metronomeSettings = useMetronomeSettings(song.id, song.tempo);
  const metronome = useMetronome({
    bpm: metronomeSettings.bpm,
    beatsPerBar: metronomeSettings.beatsPerBar,
    isRunning: metronomeSettings.isRunning,
    audioEnabled: metronomeSettings.audioEnabled,
  });
  const { toggleRunning: toggleMetronome } = metronomeSettings;

  // Live key changes. See use-transpose.ts.
  const transpose = useTranspose(song.id, song.tonality, song.lyrics ?? "");
  const { shift: shiftTranspose } = transpose;

  const [settings, setSettings] = useState<LiveSettings>({
    zoomLevel: initialFontSize / 100,
    fontFamily: "sans",
    showChords: true,
    isAutoScroll: false,
    scrollSpeed: 1,
  });

  const scrollContainerRef = useRef<HTMLElement>(null);

  // High contrast / whole-song-on-one-screen. Per device, not per
  // account — see use-live-display-prefs.ts.
  const display = useLiveDisplayPrefs();
  const { fitToScreen } = display;

  // Auto-scroll
  useEffect(() => {
    // Nothing to scroll through when the whole song is already on screen.
    if (!settings.isAutoScroll || fitToScreen) return;
    const interval = setInterval(() => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop += settings.scrollSpeed;
      }
    }, SCROLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [settings.isAutoScroll, settings.scrollSpeed, fitToScreen]);

  // Keyboard shortcuts (space to toggle auto-scroll, +/- for its speed —
  // no left/right since there's nothing to navigate between)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;

      switch (e.key) {
        case " ":
          e.preventDefault();
          if (!fitToScreen) {
            setSettings((s) => ({ ...s, isAutoScroll: !s.isAutoScroll }));
          }
          break;
        case "m":
        case "M":
          toggleMetronome();
          break;
        case ",":
        case "<":
          shiftTranspose(-1);
          break;
        case ".":
        case ">":
          shiftTranspose(1);
          break;
        case "+":
        case "=":
          setSettings((s) => ({
            ...s,
            scrollSpeed: Math.min(SCROLL_MAX, s.scrollSpeed + SCROLL_STEP),
          }));
          break;
        case "-":
          setSettings((s) => ({
            ...s,
            scrollSpeed: Math.max(SCROLL_MIN, s.scrollSpeed - SCROLL_STEP),
          }));
          break;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleMetronome, shiftTranspose, fitToScreen]);

  const update = <K extends keyof LiveSettings>(
    key: K,
    value: LiveSettings[K],
  ) => setSettings((s) => ({ ...s, [key]: value }));

  // Base: 1.5rem (~text-2xl). Scaled by zoomLevel.
  const baseFontSize = 1.5 * settings.zoomLevel;

  return (
    <div
      data-live-contrast={display.highContrast ? "high" : undefined}
      className="bg-background text-foreground fixed inset-0 z-50 flex flex-col overflow-hidden"
    >
      {/* Header */}
      <header className="bg-card/50 flex shrink-0 items-center justify-between border-b p-2 px-4 backdrop-blur-md md:p-3 md:px-6">
        <div className="flex items-center gap-2 truncate md:gap-4">
          <Button variant="ghost" size="icon" asChild className="shrink-0">
            <Link href="/dashboard/songs">
              <X className="h-5 w-5 md:h-6 md:w-6" />
            </Link>
          </Button>
          <div className="truncate">
            <h1 className="truncate text-lg font-bold md:text-2xl">
              {song.title}
            </h1>
            <p className="text-muted-foreground truncate text-[10px] tracking-wider uppercase md:text-xs">
              {t("singleSongMode")}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 md:gap-3">
          {!isOnline && (
            <Badge
              variant="outline"
              className="gap-1 border-amber-500/40 bg-amber-500/10 px-2 py-1 text-xs font-bold text-amber-500 md:px-3 md:py-2 md:text-base"
              title={t("offline")}
            >
              <WifiOff className="h-3.5 w-3.5 md:h-4 md:w-4" />
              <span className="hidden sm:inline">{t("offline")}</span>
            </Badge>
          )}
          {song.tempo && (
            <Badge
              variant="secondary"
              className="px-2 py-1 text-xs font-bold md:px-3 md:py-2 md:text-base"
            >
              {song.tempo}
              <span className="ml-1 opacity-70">{t("bpm")}</span>
            </Badge>
          )}
          {transpose.key && (
            <Badge
              variant="default"
              className="px-2 py-1 text-xs font-bold md:px-3 md:py-2 md:text-base"
              title={
                transpose.semitones !== 0
                  ? `${song.tonality} ${transpose.semitones > 0 ? "+" : ""}${transpose.semitones}`
                  : undefined
              }
            >
              <span className="mr-1 hidden opacity-70 sm:inline">
                {t("key")}
              </span>
              {transpose.key}
              {transpose.semitones !== 0 && (
                <span className="ml-1 opacity-70">*</span>
              )}
            </Badge>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleFullscreen}
            className="hidden md:flex"
          >
            {isFullscreen ? (
              <Minimize className="h-5 w-5" />
            ) : (
              <Maximize className="h-5 w-5" />
            )}
          </Button>
        </div>
      </header>

      {/* Lyrics */}
      <LiveLyricsArea
        containerRef={scrollContainerRef}
        content={transpose.content}
        showChords={settings.showChords}
        fontFamily={settings.fontFamily}
        fontSize={baseFontSize}
        fitToScreen={fitToScreen}
      />

      {/* The beat itself — see the setlist viewer for the reasoning. */}
      <MetronomeFlash
        metronome={metronome}
        isRunning={metronomeSettings.isRunning}
      />

      {/* Floating Settings Panel */}
      <div
        className={cn(
          "fixed right-4 bottom-6 z-50 flex flex-col items-end gap-2 transition-all duration-300 md:right-6 md:bottom-8",
          showControls
            ? "translate-x-0"
            : "translate-x-[calc(100%-40px)] md:translate-x-[calc(100%-48px)]",
        )}
      >
        {showControls && (
          <div className="animate-in fade-in slide-in-from-right-2">
            <DisplayControls
              highContrast={display.highContrast}
              onToggleHighContrast={() => display.toggle("highContrast")}
              fitToScreen={fitToScreen}
              onToggleFitToScreen={() => display.toggle("fitToScreen")}
            />
          </div>
        )}

        {showControls && (
          <div className="animate-in fade-in slide-in-from-right-2">
            <TransposeControls
              semitones={transpose.semitones}
              onShift={transpose.shift}
              onReset={transpose.reset}
              transposedKey={transpose.key}
              capoFret={transpose.capoFret}
            />
          </div>
        )}

        {showControls && (
          <div className="animate-in fade-in slide-in-from-right-2">
            <MetronomeControls
              metronome={metronome}
              isRunning={metronomeSettings.isRunning}
              onToggleRunning={toggleMetronome}
              bpm={metronomeSettings.bpm}
              onBpmChange={metronomeSettings.setBpm}
              isSongTempo={metronomeSettings.isSongTempo}
              beatsPerBar={metronomeSettings.beatsPerBar}
              onBeatsPerBarChange={metronomeSettings.setBeatsPerBar}
              audioEnabled={metronomeSettings.audioEnabled}
              onAudioEnabledChange={metronomeSettings.setAudioEnabled}
            />
          </div>
        )}

        <div className="bg-card/90 flex items-center gap-1 rounded-xl border p-1 shadow-2xl backdrop-blur-lg md:gap-2 md:p-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowControls((v) => !v)}
            className={cn(
              "h-8 w-8 shrink-0 rounded-lg md:h-10 md:w-10",
              !showControls && "text-primary",
            )}
          >
            <Settings2 className="h-4 w-4 md:h-5 md:w-5" />
          </Button>

          {showControls && (
            <div className="animate-in fade-in slide-in-from-right-2 flex items-center gap-2 border-l pl-1 md:gap-4 md:pl-2">
              {/* Zoom */}
              <div className="bg-background/50 flex items-center rounded-lg border">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 md:h-10 md:w-10"
                  onClick={() =>
                    update("zoomLevel", Math.max(0.5, settings.zoomLevel - 0.2))
                  }
                  title={t("settings.decreaseSize")}
                >
                  <ZoomOut className="h-3 w-3 md:h-4 md:w-4" />
                </Button>
                <span className="w-9 text-center font-mono text-[9px] tabular-nums md:w-11 md:text-[10px]">
                  {Math.round(settings.zoomLevel * 100)}%
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 md:h-10 md:w-10"
                  onClick={() =>
                    update("zoomLevel", Math.min(3, settings.zoomLevel + 0.2))
                  }
                  title={t("settings.increaseSize")}
                >
                  <ZoomIn className="h-3 w-3 md:h-4 md:w-4" />
                </Button>
              </div>

              {/* Font family */}
              <div className="bg-background/50 flex items-center rounded-lg border">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 md:h-10 md:w-10"
                  title={t("settings.fontLabel")}
                  onClick={() => {
                    const order: FontFamily[] = ["sans", "mono", "serif"];
                    const next =
                      order[
                        (order.indexOf(settings.fontFamily) + 1) % order.length
                      ];
                    update("fontFamily", next);
                  }}
                >
                  <Type className="h-3 w-3 md:h-4 md:w-4" />
                </Button>
                <span className="hidden pr-2 text-[9px] md:block md:text-[10px]">
                  {FONT_LABELS[settings.fontFamily]}
                </span>
              </div>

              {/* Show/hide chords */}
              <Button
                variant={settings.showChords ? "secondary" : "outline"}
                size="sm"
                onClick={() => update("showChords", !settings.showChords)}
                className="h-8 gap-1 px-2 md:h-9 md:px-3"
                title={t("settings.showChords")}
              >
                <Music className="h-3 w-3 md:h-4 md:w-4" />
                <span className="hidden text-xs md:inline">
                  {settings.showChords
                    ? t("settings.chordsOn")
                    : t("settings.chordsOff")}
                </span>
              </Button>

              {/* Auto-scroll — hidden in fit mode, where there's
                  nothing left to scroll. */}
              {!fitToScreen && (
                <div className="flex items-center gap-1 md:gap-2">
                  <Button
                    variant={settings.isAutoScroll ? "default" : "outline"}
                    size="sm"
                    onClick={() =>
                      update("isAutoScroll", !settings.isAutoScroll)
                    }
                    className="h-8 gap-1 px-2 md:h-9 md:gap-2 md:px-3"
                    title={t("settings.autoScrollTitle")}
                  >
                    {settings.isAutoScroll ? (
                      <Pause className="h-3 w-3 md:h-4 md:w-4" />
                    ) : (
                      <Play className="h-3 w-3 md:h-4 md:w-4" />
                    )}
                    <span className="hidden text-xs md:inline">
                      {t("settings.scroll")}
                    </span>
                  </Button>

                  <div className="bg-background/50 flex items-center rounded-lg border">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 md:h-9 md:w-9"
                      onClick={() =>
                        update(
                          "scrollSpeed",
                          Math.max(
                            SCROLL_MIN,
                            settings.scrollSpeed - SCROLL_STEP,
                          ),
                        )
                      }
                      title={t("settings.decreaseSpeed")}
                    >
                      <Minus className="h-3 w-3 md:h-4 md:w-4" />
                    </Button>
                    <span className="w-6 text-center font-mono text-[9px] tabular-nums md:w-7 md:text-[10px]">
                      {settings.scrollSpeed.toFixed(1)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 md:h-9 md:w-9"
                      onClick={() =>
                        update(
                          "scrollSpeed",
                          Math.min(
                            SCROLL_MAX,
                            settings.scrollSpeed + SCROLL_STEP,
                          ),
                        )
                      }
                      title={t("settings.increaseSpeed")}
                    >
                      <Plus className="h-3 w-3 md:h-4 md:w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
