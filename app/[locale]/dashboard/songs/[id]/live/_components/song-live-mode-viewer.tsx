"use client";

import { useState, useEffect, useRef } from "react";
import { Song } from "@/types/api";
import { LiveLyricsArea } from "@/components/live/live-lyrics-area";
import { LiveHeader } from "@/components/live/live-header";
import { LiveSettingsSheet } from "@/components/live/live-settings-sheet";
import { LiveActiveControls } from "@/components/live/live-active-controls";
import { useLiveDisplayPrefs } from "@/hooks/use-live-display-prefs";
import { useLiveControls } from "@/hooks/use-live-controls";
import { useTranslations } from "next-intl";
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

interface SongLiveModeViewerProps {
  song: Song;
  initialFontSize?: number;
}

// This is the single-song counterpart to setlists' LiveModeViewer — same
// look and controls, minus everything that only makes sense with a running
// order (next/prev navigation and swiping, progress bar, "next song"
// preview).
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

  const [settingsOpen, setSettingsOpen] = useState(false);

  const fullscreen = useFullscreen();
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

  const scrollContainerRef = useRef<HTMLElement>(null);

  // Per device, not per account — see use-live-display-prefs.ts.
  const display = useLiveDisplayPrefs();
  const { fitToScreen } = display;

  const controls = useLiveControls({
    initialFontSize,
    scrollContainerRef,
    fitToScreen,
  });
  const { toggleAutoScroll, stepScrollSpeed } = controls;

  // Keyboard shortcuts (space to toggle auto-scroll, +/- for its speed —
  // no left/right since there's nothing to navigate between)
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
      if (settingsOpen) return;

      switch (e.key) {
        case " ":
          e.preventDefault();
          if (!fitToScreen) toggleAutoScroll();
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
    toggleMetronome,
    shiftTranspose,
    fitToScreen,
    toggleAutoScroll,
    stepScrollSpeed,
    settingsOpen,
  ]);

  // Base: 1.5rem (~text-2xl). Scaled by zoomLevel.
  const baseFontSize = 1.5 * controls.zoomLevel;

  return (
    <div
      data-live-contrast={display.highContrast ? "high" : undefined}
      className="bg-background text-foreground fixed inset-0 z-50 flex flex-col overflow-hidden"
    >
      <LiveHeader
        closeHref="/dashboard/songs"
        title={song.title}
        subtitle={t("singleSongMode")}
        isOnline={isOnline}
        tempo={song.tempo}
        playedKey={transpose.key}
        writtenKey={song.tonality}
        semitones={transpose.semitones}
        isFullscreen={fullscreen.isFullscreen}
        onToggleFullscreen={fullscreen.toggle}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <div className="relative flex min-h-0 flex-1 flex-col pb-[env(safe-area-inset-bottom)]">
        <LiveLyricsArea
          containerRef={scrollContainerRef}
          content={transpose.content}
          showChords={display.showChords}
          fontFamily={display.fontFamily}
          fontSize={baseFontSize}
          fitToScreen={fitToScreen}
        />

        <LiveActiveControls
          controls={controls}
          metronomeRunning={metronomeSettings.isRunning}
          metronomeBpm={metronomeSettings.bpm}
          onStopMetronome={toggleMetronome}
          className="absolute right-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] md:right-6 md:bottom-6"
        />
      </div>

      {/* The beat itself — see the setlist viewer for the reasoning. */}
      <MetronomeFlash
        metronome={metronome}
        isRunning={metronomeSettings.isRunning}
      />

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
        metronomeRunning={metronomeSettings.isRunning}
        onToggleMetronome={toggleMetronome}
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
