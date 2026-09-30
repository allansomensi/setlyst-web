"use client";

import { RefObject, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { FileText, ScrollText } from "lucide-react";
import { ChordProRenderer } from "@/components/lyrics/chord-pro-renderer";
import { ChordDiagramHost } from "@/components/chords/chord-diagram-popover";
import { useFitToScreen } from "@/hooks/use-fit-to-screen";
import { useSwipeNavigation } from "@/hooks/use-swipe-navigation";
import type { LiveFontFamily } from "@/hooks/use-live-display-prefs";
import { cn } from "@/lib/utils";

type FontFamily = LiveFontFamily;

interface SwipeOptions {
  canNext: boolean;
  canPrev: boolean;
  onNext: () => void;
  onPrev: () => void;
}

interface LiveLyricsAreaProps {
  /** The scrolling element; auto-scroll drives its scrollTop. */
  containerRef: RefObject<HTMLElement | null>;
  content: string;
  showChords: boolean;
  showSections: boolean;
  fontFamily: FontFamily;
  /** The reader's size (rem). In fit mode, the most the text may grow to. */
  fontSize: number;
  fitToScreen: boolean;
  /** The song's capo fret: a tag leads the lyrics when set (1+). */
  capo?: number | null;
  /**
   * Identifies the song on screen. A change replays the entry animation,
   * sliding in from the side the performer moved towards.
   */
  songKey?: string;
  /** Which way the running order last moved, for the entry animation. */
  direction?: "next" | "prev" | null;
  /** Swipe left/right to change song (touch only). Omit to disable. */
  swipe?: SwipeOptions;
  /** Accessible name of the lyrics region (the song title). */
  label?: string;
  /** Live Mode's high-contrast palette is on (see ChordDiagramHost). */
  highContrast?: boolean;
}

/**
 * The lyrics pane of both Live Mode viewers (setlist and single song).
 *
 * Normal mode: one centred column at the reader's size, scrolled by hand
 * or by auto-scroll. Fit mode: the whole song sized to the visible area —
 * see use-fit-to-screen.ts — with nothing to scroll unless the song is too
 * long to be readable on one screen, in which case it says so.
 */
export function LiveLyricsArea({
  containerRef,
  content,
  showChords,
  showSections,
  fontFamily,
  fontSize,
  fitToScreen,
  capo = null,
  songKey,
  direction = null,
  swipe,
  label,
  highContrast = false,
}: LiveLyricsAreaProps) {
  const t = useTranslations("liveMode.display");
  const contentRef = useRef<HTMLDivElement>(null);

  const fit = useFitToScreen({
    enabled: fitToScreen,
    containerRef,
    contentRef,
    maxFontSize: fontSize,
    // `songKey` too: the content element below is keyed by it, so a new
    // song mounts a fresh, unsized element — and two songs in a row with
    // the same text (the same chart twice in a set) would otherwise keep
    // the unfitted one. The capo tag adds a line of its own.
    contentKey: `${songKey}|${capo}|${showChords}|${showSections}|${fontFamily}|${content}`,
  });

  const overflows = fit?.overflows ?? false;
  // No lyrics at all: the renderer's one-line "no lyrics" note sat in
  // the top corner of an otherwise blank stage screen, at lyric size.
  const isEmpty = content.trim() === "";

  useSwipeNavigation({
    targetRef: containerRef,
    enabled: !!swipe,
    canNext: swipe?.canNext ?? false,
    canPrev: swipe?.canPrev ?? false,
    onNext: swipe?.onNext ?? noop,
    onPrev: swipe?.onPrev ?? noop,
  });

  // Focus the pane when Live Mode opens so the browser's own keyboard
  // scrolling (and a pedal sending arrow keys) works on it straight away,
  // without a first tap on the lyrics.
  useEffect(() => {
    const el = containerRef.current;
    if (
      el &&
      (document.activeElement === document.body || !document.activeElement)
    ) {
      // Browsers draw :focus-visible for a focus made by script on page
      // load, which framed the whole lyrics pane in a ring every time Live
      // Mode opened. Marked so the ring stays off until focus leaves and
      // comes back (by Tab, where it belongs).
      el.dataset.autofocused = "";
      el.focus({ preventScroll: true });
    }
  }, [containerRef]);

  return (
    // The only <main> on the page: Live Mode renders in its own bare
    // layout (app/[locale]/(live)), without the dashboard's.
    <main
      ref={containerRef}
      // Focusable so keyboard users can scroll it (a scrollable region must
      // be reachable) and so it can receive focus on mount.
      tabIndex={0}
      onBlur={(event) => {
        delete event.currentTarget.dataset.autofocused;
      }}
      aria-label={label}
      data-live-fit={fitToScreen ? "" : undefined}
      className={cn(
        // A visible ring when reached by keyboard (focus-visible: a tap or
        // click doesn't draw one), inset so the header and footer don't
        // clip it. `ring` is a token the high-contrast scope redefines to
        // stage yellow, so it stays visible on black.
        "focus-visible:ring-ring/60 min-h-0 flex-1 outline-none focus-visible:ring-2 focus-visible:ring-inset data-autofocused:focus-visible:ring-0",
        // Landscape phones: keep the lyrics clear of the notch / rounded
        // corners on either side.
        "pr-[env(safe-area-inset-right)] pl-[env(safe-area-inset-left)]",
        // Vertical scrolling and pinch-zoom stay native; horizontal
        // movement is left to the swipe handler.
        swipe && "touch-pan-y touch-pinch-zoom",
        fitToScreen
          ? cn(
              "[--pad:0.75rem] md:[--pad:1.5rem]",
              "py-(--pad) pr-[max(var(--pad),env(safe-area-inset-right))] pl-[max(var(--pad),env(safe-area-inset-left))]",
              overflows ? "overflow-y-auto" : "overflow-hidden",
            )
          : // No `scroll-smooth`: auto-scroll moves a pixel at a time, and
            // smooth scrolling turned each of those into its own animation.
            cn(
              "overflow-auto [--pad:1rem] md:[--pad:3rem]",
              // Short screens (a phone in landscape): the lyrics start
              // right under the header instead of 3rem below it.
              "[@media(max-height:500px)]:pt-4",
              "pt-(--pad) pr-[max(var(--pad),env(safe-area-inset-right))] pb-24 pl-[max(var(--pad),env(safe-area-inset-left))] md:pb-28",
            ),
      )}
    >
      {isEmpty && (
        <div
          key={songKey}
          className={cn(
            "flex min-h-full flex-col items-center justify-center gap-3 px-4 py-8 text-center",
            songKey &&
              direction &&
              "animate-in fade-in duration-200 motion-reduce:animate-none",
          )}
        >
          <span className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-full">
            <FileText className="size-6" aria-hidden />
          </span>
          <p className="text-lg font-semibold md:text-xl">{t("noLyrics")}</p>
          <p className="text-muted-foreground max-w-sm text-sm leading-relaxed">
            {t("noLyricsHint")}
          </p>
        </div>
      )}

      {fitToScreen && overflows && !isEmpty && (
        <p className="text-muted-foreground mb-3 flex items-center gap-1.5 text-xs">
          <ScrollText className="h-3.5 w-3.5 shrink-0" />
          {t("fitOverflow")}
        </p>
      )}

      {!isEmpty && (
        <div
          key={songKey}
          ref={contentRef}
          className={cn(
            songKey &&
              direction &&
              "animate-in fade-in duration-200 motion-reduce:animate-none",
            direction === "next" && "slide-in-from-right-8",
            direction === "prev" && "slide-in-from-left-8",
            fitToScreen
              ? "w-full [column-gap:2.5em] [column-fill:auto]"
              : "mx-auto max-w-5xl",
          )}
        >
          <ChordDiagramHost highContrast={highContrast}>
            <ChordProRenderer
              content={content}
              showChords={showChords}
              showSections={showSections}
              fontSize={fitToScreen ? "inherit" : fontSize}
              fontFamily={fontFamily}
              capo={capo}
              interactiveChords
              // From useTranspose, which normalized it already.
              normalized
              className={fitToScreen ? "max-w-none" : "mx-auto"}
            />
          </ChordDiagramHost>
        </div>
      )}
    </main>
  );
}

function noop() {}
