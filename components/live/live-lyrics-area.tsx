"use client";

import { RefObject, useRef } from "react";
import { useTranslations } from "next-intl";
import { ScrollText } from "lucide-react";
import { ChordProRenderer } from "@/components/lyrics/chord-pro-renderer";
import { useFitToScreen } from "@/hooks/use-fit-to-screen";
import { cn } from "@/lib/utils";

type FontFamily = "sans" | "mono" | "serif";

interface LiveLyricsAreaProps {
  /** The scrolling element; auto-scroll drives its scrollTop. */
  containerRef: RefObject<HTMLElement | null>;
  content: string;
  showChords: boolean;
  fontFamily: FontFamily;
  /** The reader's size (rem). In fit mode, the most the text may grow to. */
  fontSize: number;
  fitToScreen: boolean;
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
  fontFamily,
  fontSize,
  fitToScreen,
}: LiveLyricsAreaProps) {
  const t = useTranslations("liveMode.display");
  const contentRef = useRef<HTMLDivElement>(null);

  const fit = useFitToScreen({
    enabled: fitToScreen,
    containerRef,
    contentRef,
    maxFontSize: fontSize,
    contentKey: `${showChords}|${fontFamily}|${content}`,
  });

  const overflows = fit?.overflows ?? false;

  return (
    <main
      ref={containerRef}
      data-live-fit={fitToScreen ? "" : undefined}
      className={cn(
        "flex-1",
        fitToScreen
          ? cn("p-3 md:p-6", overflows ? "overflow-y-auto" : "overflow-hidden")
          : "overflow-auto scroll-smooth p-4 md:p-12",
      )}
    >
      {fitToScreen && overflows && (
        <p className="text-muted-foreground mb-3 flex items-center gap-1.5 text-xs">
          <ScrollText className="h-3.5 w-3.5 shrink-0" />
          {t("fitOverflow")}
        </p>
      )}

      <div
        ref={contentRef}
        className={cn(
          fitToScreen
            ? "w-full [column-gap:2.5em] [column-fill:auto]"
            : "mx-auto max-w-5xl",
        )}
      >
        <ChordProRenderer
          content={content}
          showChords={showChords}
          fontSize={fitToScreen ? "inherit" : fontSize}
          fontFamily={fontFamily}
          className={fitToScreen ? "max-w-none" : undefined}
        />
      </div>
    </main>
  );
}
