"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Setlist, Song } from "@/types/api";
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
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

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
  songs: Song[];
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
  setlist,
  songs,
  initialSongId,
  initialFontSize = 100,
}: LiveModeViewerProps) {
  const t = useTranslations("liveMode");

  const startIndex = initialSongId
    ? Math.max(
        0,
        songs.findIndex((s) => s.id === initialSongId),
      )
    : 0;

  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(false);

  const [settings, setSettings] = useState<LiveSettings>({
    zoomLevel: initialFontSize / 100,
    fontFamily: "sans",
    showChords: true,
    isAutoScroll: false,
    scrollSpeed: 1,
  });

  const scrollContainerRef = useRef<HTMLElement>(null);

  const currentSong = songs[currentIndex];
  const nextSong = songs[currentIndex + 1];
  const progress =
    songs.length > 0 ? ((currentIndex + 1) / songs.length) * 100 : 0;

  // Navigation

  const handleNext = useCallback(() => {
    if (currentIndex < songs.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setSettings((s) => ({ ...s, isAutoScroll: false }));
    }
  }, [currentIndex, songs.length]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setSettings((s) => ({ ...s, isAutoScroll: false }));
    }
  }, [currentIndex]);

  // Scroll to top on song change

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [currentIndex]);

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

  // Wake Lock

  useEffect(() => {
    let wakeLock: WakeLockSentinel | null = null;
    const requestWakeLock = async () => {
      try {
        if ("wakeLock" in navigator) {
          wakeLock = await navigator.wakeLock.request("screen");
        }
      } catch (err) {
        console.error("Wake Lock failed:", err);
      }
    };
    requestWakeLock();
    return () => {
      wakeLock?.release();
    };
  }, []);

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
  }, [handleNext, handlePrev]);

  // Fullscreen

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

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
              {setlist.title} · {currentIndex + 1} of {songs.length}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 md:gap-3">
          {currentSong.tempo && (
            <Badge
              variant="secondary"
              className="px-2 py-1 text-xs font-bold tabular-nums md:px-3 md:py-2 md:text-base"
            >
              {currentSong.tempo}
              <span className="ml-1 opacity-70">{t("bpm")}</span>
            </Badge>
          )}
          {currentSong.tonality && (
            <Badge
              variant="default"
              className="px-2 py-1 text-xs font-bold md:px-3 md:py-2 md:text-base"
            >
              <span className="mr-1 hidden opacity-70 sm:inline">
                {t("key")}
              </span>
              {currentSong.tonality}
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
            content={currentSong.lyrics ?? ""}
            showChords={settings.showChords}
            fontSize={baseFontSize}
            fontFamily={settings.fontFamily}
            chordColor="text-primary"
          />
        </div>
      </main>

      {/* Floating Settings Panel */}
      <div
        className={cn(
          "fixed right-4 bottom-24 z-50 flex flex-col gap-2 transition-all duration-300 md:right-6 md:bottom-28",
          showControls
            ? "translate-x-0"
            : "translate-x-[calc(100%-40px)] md:translate-x-[calc(100%-48px)]",
        )}
      >
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
              disabled={currentIndex === 0}
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
              disabled={currentIndex === songs.length - 1}
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
