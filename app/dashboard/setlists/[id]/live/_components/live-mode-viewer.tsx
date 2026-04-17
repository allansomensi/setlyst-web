"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Setlist, Song } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
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
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface LiveModeViewerProps {
  setlist: Setlist;
  songs: Song[];
}

export function LiveModeViewer({ setlist, songs }: LiveModeViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);

  const [zoomLevel, setZoomLevel] = useState(1);
  const [isAutoScroll, setIsAutoScroll] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(1);

  const scrollContainerRef = useRef<HTMLElement>(null);

  const currentSong = songs[currentIndex];
  const nextSong = songs[currentIndex + 1];
  const progress =
    songs.length > 0 ? ((currentIndex + 1) / songs.length) * 100 : 0;

  const handleNext = useCallback(() => {
    if (currentIndex < songs.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setIsAutoScroll(false);
    }
  }, [currentIndex, songs.length]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setIsAutoScroll(false);
    }
  }, [currentIndex]);

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [currentIndex]);

  useEffect(() => {
    if (!isAutoScroll) return;

    const interval = setInterval(() => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop += scrollSpeed;
      }
    }, 30);

    return () => clearInterval(interval);
  }, [isAutoScroll, scrollSpeed]);

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
      if (wakeLock) {
        wakeLock.release();
      }
    };
  }, []);

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
          setIsAutoScroll((prev) => !prev);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleNext, handlePrev]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  if (!currentSong) {
    return (
      <div className="bg-background fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 p-4 text-center">
        <h2 className="text-xl font-semibold md:text-2xl">
          No songs in this setlist
        </h2>
        <Button asChild>
          <Link href={`/dashboard/setlists/${setlist.id}`}>Go Back</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-background text-foreground fixed inset-0 z-50 flex flex-col overflow-hidden">
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
              {setlist.title} • {currentIndex + 1} of {songs.length}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 md:gap-3">
          {currentSong.tempo && (
            <Badge
              variant="secondary"
              className="px-2 py-1 text-xs font-bold md:px-3 md:py-2 md:text-base"
            >
              {currentSong.tempo} <span className="ml-1">BPM</span>
            </Badge>
          )}
          {currentSong.tonality && (
            <Badge
              variant="default"
              className="px-2 py-1 text-xs font-bold md:px-3 md:py-2 md:text-base"
            >
              <span className="mr-1 hidden sm:inline">Key:</span>{" "}
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

      <main
        ref={scrollContainerRef}
        className="flex-1 overflow-auto scroll-smooth p-4 md:p-12"
      >
        <div className="mx-auto max-w-5xl">
          {currentSong.lyrics ? (
            <pre
              style={{ fontSize: `${zoomLevel}rem` }}
              className="font-sans text-2xl leading-tight whitespace-pre-wrap transition-all duration-200 md:text-4xl lg:text-5xl"
            >
              {currentSong.lyrics}
            </pre>
          ) : (
            <div className="text-muted-foreground flex h-64 items-center justify-center text-lg italic md:text-xl">
              No lyrics available.
            </div>
          )}
        </div>
      </main>

      <div
        className={cn(
          "fixed right-4 bottom-24 z-50 flex flex-col gap-2 transition-all duration-300 md:right-6 md:bottom-28",
          showControls
            ? "translate-x-0"
            : "translate-x-[calc(100%-40px)] md:translate-x-[calc(100%-48px)]",
        )}
      >
        <div className="bg-card/90 flex items-center gap-1 rounded-xl border p-1 shadow-2xl backdrop-blur-lg md:gap-2 md:p-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowControls(!showControls)}
            className={cn(
              "h-8 w-8 rounded-lg md:h-10 md:w-10",
              !showControls && "text-primary",
            )}
          >
            <Settings2 className="h-4 w-4 md:h-5 md:w-5" />
          </Button>

          {showControls && (
            <div className="animate-in fade-in slide-in-from-right-2 flex items-center gap-2 border-l pl-1 md:gap-4 md:pl-2">
              <div className="bg-background/50 flex items-center rounded-lg border">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 md:h-10 md:w-10"
                  onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.2))}
                >
                  <ZoomOut className="h-3 w-3 md:h-4 md:w-4" />
                </Button>
                <span className="w-8 text-center font-mono text-[9px] md:w-10 md:text-[10px]">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 md:h-10 md:w-10"
                  onClick={() => setZoomLevel((z) => Math.min(3, z + 0.2))}
                >
                  <ZoomIn className="h-3 w-3 md:h-4 md:w-4" />
                </Button>
              </div>

              <div className="flex items-center gap-1 md:gap-2">
                <Button
                  variant={isAutoScroll ? "default" : "outline"}
                  size="sm"
                  onClick={() => setIsAutoScroll(!isAutoScroll)}
                  className="h-8 gap-1 px-2 md:h-9 md:gap-2 md:px-3"
                >
                  {isAutoScroll ? (
                    <Pause className="h-3 w-3 md:h-4 md:w-4" />
                  ) : (
                    <Play className="h-3 w-3 md:h-4 md:w-4" />
                  )}
                  <span className="hidden text-xs md:inline">Scroll</span>
                </Button>
                {isAutoScroll && (
                  <div className="bg-background/50 flex items-center rounded-lg border">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 md:h-9 md:w-9"
                      onClick={() =>
                        setScrollSpeed((s) => Math.max(0.5, s - 0.5))
                      }
                    >
                      <Minus className="h-3 w-3 md:h-4 md:w-4" />
                    </Button>
                    <span className="w-5 text-center font-mono text-[9px] md:w-6 md:text-[10px]">
                      {scrollSpeed}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 md:h-9 md:w-9"
                      onClick={() =>
                        setScrollSpeed((s) => Math.min(5, s + 0.5))
                      }
                    >
                      <Plus className="h-3 w-3 md:h-4 md:w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

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
              <span className="hidden sm:inline">PREV</span>
            </Button>
          </div>

          <div className="overflow-hidden px-1 text-center">
            <p className="text-muted-foreground text-[9px] font-bold tracking-[0.2em] uppercase md:text-[10px]">
              Next Song
            </p>
            <p className="truncate text-sm font-bold md:text-lg">
              {nextSong ? nextSong.title : "END OF SHOW"}
            </p>
          </div>

          <div className="flex justify-end">
            <Button
              size="lg"
              onClick={handleNext}
              disabled={currentIndex === songs.length - 1}
              className="bg-primary text-primary-foreground hover:bg-primary/90 h-12 gap-1 px-4 text-sm font-bold md:h-14 md:gap-2 md:px-8 md:text-lg"
            >
              <span className="hidden sm:inline">NEXT</span>
              <ChevronRight className="h-5 w-5 md:h-6 md:w-6" />
            </Button>
          </div>
        </div>
      </footer>
    </div>
  );
}
