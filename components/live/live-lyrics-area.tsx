"use client";

import { RefObject, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { ScrollText } from "lucide-react";
import { ChordProRenderer } from "@/components/lyrics/chord-pro-renderer";
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
  songKey,
  direction = null,
  swipe,
  label,
}: LiveLyricsAreaProps) {
  const t = useTranslations("liveMode.display");
  const contentRef = useRef<HTMLDivElement>(null);

  const fit = useFitToScreen({
    enabled: fitToScreen,
    containerRef,
    contentRef,
    maxFontSize: fontSize,
    contentKey: `${showChords}|${showSections}|${fontFamily}|${content}`,
  });

  const overflows = fit?.overflows ?? false;

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
      aria-label={label}
      data-live-fit={fitToScreen ? "" : undefined}
      className={cn(
        "min-h-0 flex-1 outline-none",
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
              "pt-(--pad) pr-[max(var(--pad),env(safe-area-inset-right))] pb-24 pl-[max(var(--pad),env(safe-area-inset-left))] md:pb-28",
            ),
      )}
    >
      {fitToScreen && overflows && (
        <p className="text-muted-foreground mb-3 flex items-center gap-1.5 text-xs">
          <ScrollText className="h-3.5 w-3.5 shrink-0" />
          {t("fitOverflow")}
        </p>
      )}

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
        <ChordProRenderer
          content={content}
          showChords={showChords}
          showSections={showSections}
          fontSize={fitToScreen ? "inherit" : fontSize}
          fontFamily={fontFamily}
          className={fitToScreen ? "max-w-none" : "mx-auto"}
        />
      </div>
    </main>
  );
}

function noop() {}
