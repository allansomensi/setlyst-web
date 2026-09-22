"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Setlist, SetlistSong } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { LiveLyricsArea } from "@/components/live/live-lyrics-area";
import { LiveHeader } from "@/components/live/live-header";
import { LiveSettingsSheet } from "@/components/live/live-settings-sheet";
import { LiveActiveControls } from "@/components/live/live-active-controls";
import { useLiveDisplayPrefs } from "@/hooks/use-live-display-prefs";
import { useLiveControls } from "@/hooks/use-live-controls";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, Hand } from "lucide-react";
import { Link } from "@/components/nav-link";
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

interface LiveModeViewerProps {
  setlist: Setlist;
  songs: SetlistSong[];
  initialSongId?: string;
  initialFontSize?: number;
}

/** Shown once per device, the first time Live Mode opens on a touch screen. */
const SWIPE_HINT_KEY = "setlyst:live-swipe-hint-seen";
const SWIPE_HINT_MS = 3500;

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
  const [direction, setDirection] = useState<"next" | "prev" | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showSwipeHint, setShowSwipeHint] = useState(false);

  const fullscreen = useFullscreen();
  useWakeLock();

  const scrollContainerRef = useRef<HTMLElement>(null);

  // High contrast, whole-song fit, typeface and chords. Per device, not per
  // account — see use-live-display-prefs.ts.
  const display = useLiveDisplayPrefs();
  const { fitToScreen, toggle: toggleDisplay } = display;

  const controls = useLiveControls({
    initialFontSize,
    scrollContainerRef,
    fitToScreen,
  });
  const { setAutoScroll, toggleAutoScroll, stepScrollSpeed } = controls;

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
  const canPrev = safeIndex > 0;
  const canNext = safeIndex < songs.length - 1;

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
      setDirection("next");
      setCurrentIndex(safeIndex + 1);
      setAutoScroll(false);
    }
  }, [safeIndex, songs.length, setAutoScroll]);

  const handlePrev = useCallback(() => {
    if (safeIndex > 0) {
      setDirection("prev");
      setCurrentIndex(safeIndex - 1);
      setAutoScroll(false);
    }
  }, [safeIndex, setAutoScroll]);

  // Scroll to top on song change

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [safeIndex]);

  // First-run hint for the swipe gesture — touch screens only, once.

  useEffect(() => {
    if (songs.length < 2) return;
    if (!window.matchMedia("(pointer: coarse)").matches) return;
    try {
      if (window.localStorage.getItem(SWIPE_HINT_KEY)) return;
    } catch {
      return;
    }
    // Marked as seen only once actually shown, so a remount before the
    // delay elapses (Strict Mode, a fast back-navigation) doesn't use it up.
    const show = window.setTimeout(() => {
      setShowSwipeHint(true);
      try {
        window.localStorage.setItem(SWIPE_HINT_KEY, "1");
      } catch {
        // Not remembered; it'll show again next time. Harmless.
      }
    }, 600);
    const hide = window.setTimeout(
      () => setShowSwipeHint(false),
      600 + SWIPE_HINT_MS,
    );
    return () => {
      window.clearTimeout(show);
      window.clearTimeout(hide);
    };
  }, [songs.length]);

  // Keyboard shortcuts

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.metaKey ||
        e.ctrlKey ||
        e.altKey
      )
        return;
      // The settings sheet owns the keyboard while it's open (its own
      // buttons, Escape to close).
      if (settingsOpen) return;

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
          if (!fitToScreen) toggleAutoScroll();
          break;
        case "m":
        case "M":
          toggleMetronome();
          break;
        case "c":
        case "C":
          toggleDisplay("showChords");
          break;
        case "s":
        case "S":
          toggleDisplay("showSections");
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
          stepScrollSpeed(1);
          break;
        case "-":
          stepScrollSpeed(-1);
          break;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    handleNext,
    handlePrev,
    toggleMetronome,
    shiftTranspose,
    fitToScreen,
    toggleAutoScroll,
    stepScrollSpeed,
    settingsOpen,
    toggleDisplay,
  ]);

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

  // Base: 1.5rem (~text-2xl). Scaled by zoomLevel.
  const baseFontSize = 1.5 * controls.zoomLevel;

  return (
    <div
      data-live-contrast={display.highContrast ? "high" : undefined}
      className="bg-background text-foreground fixed inset-0 z-50 flex flex-col overflow-hidden"
    >
      <LiveHeader
        closeHref={`/dashboard/setlists/${setlist.id}`}
        title={currentSong.title}
        subtitle={`${setlist.title} · ${t("songPosition", {
          current: safeIndex + 1,
          total: songs.length,
        })}`}
        isOnline={isOnline}
        tempo={currentSong.tempo}
        playedKey={transpose.key}
        writtenKey={currentSong.tonality}
        semitones={transpose.semitones}
        isFullscreen={fullscreen.isFullscreen}
        onToggleFullscreen={fullscreen.toggle}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <div className="relative flex min-h-0 flex-1 flex-col">
        <LiveLyricsArea
          containerRef={scrollContainerRef}
          content={transpose.content}
          showChords={display.showChords}
          showSections={display.showSections}
          fontFamily={display.fontFamily}
          fontSize={baseFontSize}
          fitToScreen={fitToScreen}
          songKey={currentSong.id}
          direction={direction}
          swipe={{
            canNext,
            canPrev,
            onNext: handleNext,
            onPrev: handlePrev,
          }}
        />

        {showSwipeHint && (
          <div
            role="status"
            className="bg-foreground text-background animate-in fade-in zoom-in-95 pointer-events-none absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium whitespace-nowrap shadow-xl"
          >
            <ChevronLeft className="h-4 w-4 opacity-70" />
            <Hand className="h-4 w-4" />
            {t("swipeHint")}
            <ChevronRight className="h-4 w-4 opacity-70" />
          </div>
        )}

        <LiveActiveControls
          controls={controls}
          metronomeRunning={metronomeSettings.isRunning}
          metronomeBpm={metronomeSettings.bpm}
          onStopMetronome={toggleMetronome}
          className="absolute right-3 bottom-3 md:right-6 md:bottom-5"
        />
      </div>

      {/* The beat itself — a pulse at the edge of the screen, outside the
          scrolling area so it never moves with the lyrics. */}
      <MetronomeFlash
        metronome={metronome}
        isRunning={metronomeSettings.isRunning}
      />

      {/* Footer */}
      <footer className="bg-card/80 shrink-0 border-t pb-[env(safe-area-inset-bottom)] backdrop-blur-md">
        <Progress
          value={progress}
          className="h-1 rounded-none bg-transparent"
        />
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2 p-2 md:grid-cols-3 md:gap-4 md:p-4">
          <div>
            <Button
              variant="outline"
              size="lg"
              onClick={handlePrev}
              disabled={!canPrev}
              aria-label={t("prev")}
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
              disabled={!canNext}
              aria-label={t("next")}
              className="h-12 gap-1 px-4 text-sm font-bold md:h-14 md:gap-2 md:px-8 md:text-lg"
            >
              <span className="hidden sm:inline">{t("next")}</span>
              <ChevronRight className="h-5 w-5 md:h-6 md:w-6" />
            </Button>
          </div>
        </div>
      </footer>

      <LiveSettingsSheet
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        controls={controls}
        highContrast={display.highContrast}
        onToggleHighContrast={() => display.toggle("highContrast")}
        fitToScreen={fitToScreen}
        onToggleFitToScreen={() => display.toggle("fitToScreen")}
        fontFamily={display.fontFamily}
        onFontFamilyChange={(font) => display.setPref("fontFamily", font)}
        showChords={display.showChords}
        onToggleChords={() => display.toggle("showChords")}
        showSections={display.showSections}
        onToggleSections={() => display.toggle("showSections")}
        metronomeRunning={metronomeSettings.isRunning}
        onToggleMetronome={toggleMetronome}
        hasNavigation
        fullscreen={
          fullscreen.isSupported
            ? { active: fullscreen.isFullscreen, onToggle: fullscreen.toggle }
            : null
        }
        transpose={
          <TransposeControls
            semitones={transpose.semitones}
            onShift={transpose.shift}
            onReset={transpose.reset}
            transposedKey={transpose.key}
            capoFret={transpose.capoFret}
          />
        }
        metronome={
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
        }
      />
    </div>
  );
}
