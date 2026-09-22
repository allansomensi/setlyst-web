"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Setlist, SetlistSong } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ChordProRenderer } from "@/components/lyrics/chord-pro-renderer";
import { useTranslations } from "next-intl";
import {
  ChevronLeft,
  ChevronRight,
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
import { useOfflineSetlistBundle } from "@/hooks/use-offline-setlist-bundle";
import { useWakeLock } from "@/hooks/use-wake-lock";
import { useFullscreen } from "@/hooks/use-fullscreen";
import { useMetronome } from "@/hooks/use-metronome";
import { useMetronomeSettings } from "@/hooks/use-metronome-settings";
import { MetronomeFlash } from "@/components/live/metronome-flash";
import { MetronomeControls } from "@/components/live/metronome-controls";
import { useTranspose } from "@/hooks/use-transpose";
import { TransposeControls } from "@/components/live/transpose-controls";

// Types

type FontFamily = "sans" | "mono" | "serif";

interface LiveSettings {
  zoomLevel: number;
  fontFamily: FontFamily;
  showChords: boolean;
  isAutoScroll: boolean;
  scrollSpeed: number;
}

interface LiveModeViewerProps {
  setlist: Setlist;
  songs: SetlistSong[];
  initialSongId?: string;
  initialFontSize?: number;
}
// Constants

const SCROLL_INTERVAL_MS = 50;
const SCROLL_MIN = 0.1;
const SCROLL_MAX = 8;
const SCROLL_STEP = 0.25;

const FONT_LABELS: Record<FontFamily, string> = {
  sans: "Sans",
  mono: "Mono",
  serif: "Serif",
};

// Component

export function LiveModeViewer({
  setlist: initialSetlist,
  songs: initialSongs,
  initialSongId,
  initialFontSize = 100,
}: LiveModeViewerProps) {
  const t = useTranslations("liveMode");
  const isOnline = useOnlineStatus();

  // Prefer the on-device copy synced in the background (see
  // OfflineSyncProvider) over the props this page was server-rendered
  // with — it stays fresh on a schedule instead of being frozen at
  // whatever moment this exact URL last got cached, which matters once
  // you're relying on it with no signal at a venue.
  const { setlist, songs } = useOfflineSetlistBundle(initialSetlist.id, {
    setlist: initialSetlist,
    songs: initialSongs,
  });

  const startIndex = initialSongId
    ? Math.max(
        0,
        songs.findIndex((s) => s.id === initialSongId),
      )
    : 0;

  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const [showControls, setShowControls] = useState(false);

  const { isFullscreen, toggle: toggleFullscreen } = useFullscreen();
  useWakeLock();

  const [settings, setSettings] = useState<LiveSettings>({
    zoomLevel: initialFontSize / 100,
    fontFamily: "sans",
    showChords: true,
    isAutoScroll: false,
    scrollSpeed: 1,
  });

  const scrollContainerRef = useRef<HTMLElement>(null);

  // The running order can change underneath this screen: the offline
  // bundle above swaps in a freshly synced copy, and a bandmate removing
  // songs elsewhere can make it shorter than the one this page rendered
  // with. Clamping here rather than trusting `currentIndex` keeps a stale
  // index from reading past the end and dropping the performer onto the
  // "no songs" empty state mid-set.
  const safeIndex = Math.min(currentIndex, Math.max(0, songs.length - 1));
  const currentSong = songs[safeIndex];
  const nextSong = songs[safeIndex + 1];
  const progress =
    songs.length > 0 ? ((safeIndex + 1) / songs.length) * 100 : 0;

  // The metronome takes its tempo from whichever song is on screen, so
  // moving through the running order retunes it without anyone touching a
  // control mid-set. See use-metronome-settings.ts.
  const metronomeSettings = useMetronomeSettings(
    currentSong?.id,
    currentSong?.tempo,
  );
  const metronome = useMetronome({
    bpm: metronomeSettings.bpm,
    beatsPerBar: metronomeSettings.beatsPerBar,
    isRunning: metronomeSettings.isRunning,
    audioEnabled: metronomeSettings.audioEnabled,
  });
  // Pulled out because the keyboard effect depends on it: the settings
  // object itself is rebuilt every render, so depending on that would
  // re-arm the key listener continuously.
  const { toggleRunning: toggleMetronome } = metronomeSettings;

  // Live key changes, scoped to the song on screen. See use-transpose.ts.
  const transpose = useTranspose(
    currentSong?.id,
    currentSong?.tonality,
    currentSong?.lyrics ?? "",
  );
  const { shift: shiftTranspose } = transpose;

  // Navigation
  //
  // Both step from `safeIndex` rather than the raw previous value: if the
  // running order shrank while this screen was open, `currentIndex` can
  // still hold an index past the end, and stepping from *that* would move
  // within the out-of-range region instead of from the song actually on
  // screen. Writing the clamped value back also settles `currentIndex`
  // without a separate synchronising effect.

  const handleNext = useCallback(() => {
    if (safeIndex < songs.length - 1) {
      setCurrentIndex(safeIndex + 1);
      setSettings((s) => ({ ...s, isAutoScroll: false }));
    }
  }, [safeIndex, songs.length]);

  const handlePrev = useCallback(() => {
    if (safeIndex > 0) {
      setCurrentIndex(safeIndex - 1);
      setSettings((s) => ({ ...s, isAutoScroll: false }));
    }
  }, [safeIndex]);

  // Scroll to top on song change

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [safeIndex]);

  // Auto-scroll

  useEffect(() => {
    if (!settings.isAutoScroll) return;
    const interval = setInterval(() => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop += settings.scrollSpeed;
      }
    }, SCROLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [settings.isAutoScroll, settings.scrollSpeed]);

  // Keyboard shortcuts

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;

      switch (e.key) {
        case "ArrowRight":
        case "PageDown":
          handleNext();
          break;
        case "ArrowLeft":
        case "PageUp":
          handlePrev();
          break;
        case " ":
          e.preventDefault();
          setSettings((s) => ({ ...s, isAutoScroll: !s.isAutoScroll }));
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
  }, [handleNext, handlePrev, toggleMetronome, shiftTranspose]);

  // Setting helpers

  const update = <K extends keyof LiveSettings>(
    key: K,
    value: LiveSettings[K],
  ) => setSettings((s) => ({ ...s, [key]: value }));

  // Empty state

  if (!currentSong) {
    return (
      <div className="bg-background fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 p-4 text-center">
        <h2 className="text-xl font-semibold md:text-2xl">{t("noSongs")}</h2>
        <Button asChild>
          <Link href={`/dashboard/setlists/${setlist.id}`}>{t("back")}</Link>
        </Button>
      </div>
    );
  }

  // Compute base font size for ChordPro
  // Base: 1.5rem (~text-2xl). Scaled by zoomLevel.
  const baseFontSize = 1.5 * settings.zoomLevel;

  return (
    <div className="bg-background text-foreground fixed inset-0 z-50 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-card/50 flex shrink-0 items-center justify-between border-b p-2 px-4 backdrop-blur-md md:p-3 md:px-6">
        <div className="flex items-center gap-2 truncate md:gap-4">
          <Button variant="ghost" size="icon" asChild className="shrink-0">
            <Link href={`/dashboard/setlists/${setlist.id}`}>
              <X className="h-5 w-5 md:h-6 md:w-6" />
            </Link>
          </Button>
          <div className="truncate">
            <h1 className="truncate text-lg font-bold md:text-2xl">
              {currentSong.title}
            </h1>
            <p className="text-muted-foreground truncate text-[10px] tracking-wider uppercase md:text-xs">
              {setlist.title} ·{" "}
              {t("songPosition", {
                current: safeIndex + 1,
                total: songs.length,
              })}
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
          {currentSong.tempo && (
            <Badge
              variant="secondary"
              className="px-2 py-1 text-xs font-bold tabular-nums md:px-3 md:py-2 md:text-base"
            >
              {currentSong.tempo}
              <span className="ml-1 opacity-70">{t("bpm")}</span>
            </Badge>
          )}
          {transpose.key && (
            <Badge
              variant="default"
              className="px-2 py-1 text-xs font-bold md:px-3 md:py-2 md:text-base"
              title={
                transpose.semitones !== 0
                  ? `${currentSong.tonality} ${transpose.semitones > 0 ? "+" : ""}${transpose.semitones}`
                  : undefined
              }
            >
              <span className="mr-1 hidden opacity-70 sm:inline">
                {t("key")}
              </span>
              {transpose.key}
              {/* Marks the key as moved, so nobody reads the header as the
                  written key and calls it out wrong to the band. */}
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
      <main
        ref={scrollContainerRef}
        className="flex-1 overflow-auto scroll-smooth p-4 md:p-12"
      >
        <div className="mx-auto max-w-5xl">
          <ChordProRenderer
            content={transpose.content}
            showChords={settings.showChords}
            fontSize={baseFontSize}
            fontFamily={settings.fontFamily}
          />
        </div>
      </main>

      {/* The beat itself — a pulse at the edge of the screen, outside the
          scrolling area so it never moves with the lyrics. */}
      <MetronomeFlash
        metronome={metronome}
        isRunning={metronomeSettings.isRunning}
      />

      {/* Floating Settings Panel */}
      <div
        className={cn(
          "fixed right-4 bottom-24 z-50 flex flex-col items-end gap-2 transition-all duration-300 md:right-6 md:bottom-28",
          showControls
            ? "translate-x-0"
            : "translate-x-[calc(100%-40px)] md:translate-x-[calc(100%-48px)]",
        )}
      >
        {/* The metronome gets its own row rather than being squeezed into
            the settings pill: it is a while-you-play control, not a
            set-and-forget one, and the pill is already full at phone
            width. */}
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
          {/* Toggle panel visibility */}
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

              {/* Auto-scroll */}
              <div className="flex items-center gap-1 md:gap-2">
                <Button
                  variant={settings.isAutoScroll ? "default" : "outline"}
                  size="sm"
                  onClick={() => update("isAutoScroll", !settings.isAutoScroll)}
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

                {/* Speed control */}
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
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-card/80 shrink-0 border-t backdrop-blur-md">
        <Progress
          value={progress}
          className="h-1.5 rounded-none bg-transparent"
        />
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2 p-2 md:grid-cols-3 md:gap-4 md:p-4">
          <div>
            <Button
              variant="outline"
              size="lg"
              onClick={handlePrev}
              disabled={safeIndex === 0}
              className="h-12 gap-1 px-4 text-sm font-bold md:h-14 md:gap-2 md:px-8 md:text-lg"
            >
              <ChevronLeft className="h-5 w-5 md:h-6 md:w-6" />
              <span className="hidden sm:inline">{t("prev")}</span>
            </Button>
          </div>

          <div className="overflow-hidden px-1 text-center">
            <p className="text-muted-foreground text-[9px] font-bold tracking-[0.2em] uppercase md:text-[10px]">
              {t("nextSong")}
            </p>
            <p className="truncate text-sm font-bold md:text-lg">
              {nextSong ? nextSong.title : t("endOfShow")}
            </p>
          </div>

          <div className="flex justify-end">
            <Button
              size="lg"
              onClick={handleNext}
              disabled={safeIndex === songs.length - 1}
              className="bg-primary text-primary-foreground hover:bg-primary/90 h-12 gap-1 px-4 text-sm font-bold md:h-14 md:gap-2 md:px-8 md:text-lg"
            >
              <span className="hidden sm:inline">{t("next")}</span>
              <ChevronRight className="h-5 w-5 md:h-6 md:w-6" />
            </Button>
          </div>
        </div>
      </footer>
    </div>
  );
}
