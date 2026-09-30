"use client";

import { useTranslations } from "next-intl";
import {
  Maximize,
  Minimize,
  SlidersHorizontal,
  WifiOff,
  X,
} from "lucide-react";
import { Link } from "@/components/nav-link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  LiveSongList,
  type LiveSongListProps,
} from "@/components/live/live-song-list";

interface LiveHeaderProps {
  closeHref: string;
  title: string;
  subtitle: string;
  /**
   * Where this song falls in the set ("3 of 14"). Kept apart from the
   * subtitle so it never truncates: on a phone a long setlist name used
   * to push it off the end, and it is the part a performer glances for.
   */
  position?: string;
  isOnline: boolean;
  tempo?: number | null;
  /** The key being played (after transposing), if the song has one. */
  playedKey: string | null;
  writtenKey?: string | null;
  semitones: number;
  isFullscreen: boolean;
  /** Hidden where the Fullscreen API isn't available (iOS Safari). */
  canFullscreen?: boolean;
  onToggleFullscreen: () => void;
  onOpenSettings: () => void;
  /** Turns the title into a drop-down of the setlist's songs to jump to. */
  songList?: Omit<LiveSongListProps, "children">;
}

// Short screens (a phone in landscape) step the title back down: the
// header there competes with the lyrics for ~350px of height.
const titleClass =
  "truncate text-base leading-tight font-bold sm:text-lg md:text-2xl [@media(max-height:500px)]:text-lg";
const subtitleClass =
  "text-muted-foreground flex min-w-0 gap-[0.4em] text-[11px] font-normal tracking-wider uppercase md:text-xs";

/**
 * Top bar shared by both Live Mode viewers: leave, what's playing, the
 * song's tempo and key, and the one entry point to every setting.
 *
 * The header sits under the notch/status bar when installed as a PWA
 * (`viewport-fit=cover` + a translucent iOS status bar), hence the
 * safe-area padding.
 */
export function LiveHeader({
  closeHref,
  title,
  subtitle,
  position,
  isOnline,
  tempo,
  playedKey,
  writtenKey,
  semitones,
  isFullscreen,
  canFullscreen = true,
  onToggleFullscreen,
  onOpenSettings,
  songList,
}: LiveHeaderProps) {
  const t = useTranslations("liveMode");

  const subtitleContent = (
    <>
      <span className="truncate">{subtitle}</span>
      {position && (
        <span className="shrink-0 tabular-nums">
          <span aria-hidden>·{"\u00A0"}</span>
          {position}
        </span>
      )}
    </>
  );

  return (
    <header
      className={cn(
        // Near-opaque instead of a backdrop blur: blurring the lyrics that
        // scroll underneath costs a repaint per frame on weaker devices.
        "bg-card/95 flex shrink-0 items-center justify-between gap-2 border-b md:gap-4",
        // Each side keeps its own minimum and never drops below the
        // safe-area inset (notch, status bar, landscape corners). The
        // breakpoint variants restate the insets instead of a plain
        // `md:py-3`, which used to override the top inset on iPad.
        "[--px:0.5rem] [--py:0.5rem] md:[--px:1.5rem] md:[--py:0.75rem] [@media(max-height:500px)]:[--py:0.375rem]",
        "pt-[max(var(--py),env(safe-area-inset-top))] pb-(--py)",
        "pr-[max(var(--px),env(safe-area-inset-right))] pl-[max(var(--px),env(safe-area-inset-left))]",
      )}
    >
      <div className="flex min-w-0 items-center gap-1 md:gap-3">
        <Button
          variant="ghost"
          size="icon"
          asChild
          className="h-10 w-10 shrink-0"
        >
          <Link href={closeHref} aria-label={t("back")}>
            <X className="h-5 w-5 md:h-6 md:w-6" />
          </Link>
        </Button>
        {songList ? (
          <h1 className="min-w-0">
            <LiveSongList {...songList}>
              <span className={cn("block", titleClass)}>{title}</span>
              <span className={subtitleClass}>{subtitleContent}</span>
            </LiveSongList>
          </h1>
        ) : (
          <div className="min-w-0">
            <h1 className={titleClass}>{title}</h1>
            <p className={subtitleClass}>{subtitleContent}</p>
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1.5 md:gap-2">
        {!isOnline && (
          <Badge
            variant="outline"
            className="h-7 gap-1 border-amber-500/40 bg-amber-500/10 px-2 text-xs font-bold text-amber-700 in-data-[live-contrast=high]:text-amber-400 md:h-9 md:px-3 md:text-sm dark:text-amber-400"
            title={t("offline")}
          >
            <WifiOff className="h-3.5 w-3.5 md:h-4 md:w-4" aria-hidden />
            {/* Icon-only below lg, but still read out: `title` alone
                reaches neither touch screens nor most screen readers. */}
            <span className="sr-only lg:not-sr-only">{t("offline")}</span>
          </Badge>
        )}
        {tempo ? (
          <Badge
            variant="secondary"
            className="h-7 px-2 text-xs font-bold tabular-nums md:h-9 md:px-3 md:text-base"
          >
            {tempo}
            <span className="ml-1 text-[11px] opacity-70 md:text-xs">
              {t("bpm")}
            </span>
          </Badge>
        ) : null}
        {playedKey && (
          <Badge
            variant="default"
            className="h-7 px-2 text-xs font-bold md:h-9 md:px-3 md:text-base"
            title={
              semitones !== 0 && writtenKey
                ? `${writtenKey} ${semitones > 0 ? "+" : ""}${semitones}`
                : undefined
            }
          >
            <span className="mr-1 hidden opacity-70 sm:inline">{t("key")}</span>
            {playedKey}
            {/* Marks the key as moved, so nobody reads the header as the
                written key and calls it out wrong to the band. */}
            {semitones !== 0 && (
              <>
                <span className="ml-0.5 opacity-70" aria-hidden>
                  *
                </span>
                {/* What the asterisk means, for those who can't hover the
                    badge for its title. */}
                <span className="sr-only"> ({t("transposed")})</span>
              </>
            )}
          </Badge>
        )}

        {canFullscreen && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleFullscreen}
            // On a phone the song title needs the room more: full screen
            // is one tap away in the settings sheet there.
            className="hidden h-10 w-10 sm:inline-flex"
            aria-label={t("fullscreen")}
            aria-pressed={isFullscreen}
            title={t("fullscreen")}
          >
            {isFullscreen ? (
              <Minimize className="h-5 w-5" />
            ) : (
              <Maximize className="h-5 w-5" />
            )}
          </Button>
        )}

        {/* Named by its own visible text ("Settings", read out below lg
            too) rather than a different aria-label, so what voice-control
            users say matches what they see. */}
        <Button
          variant="outline"
          onClick={onOpenSettings}
          className="h-10 gap-2 px-2.5 md:px-3"
          aria-haspopup="dialog"
          title={t("sheet.title")}
        >
          <SlidersHorizontal className="h-5 w-5" aria-hidden />
          <span className="sr-only text-sm lg:not-sr-only">
            {t("sheet.open")}
          </span>
        </Button>
      </div>
    </header>
  );
}
