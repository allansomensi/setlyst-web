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

interface LiveHeaderProps {
  closeHref: string;
  title: string;
  subtitle: string;
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
}

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
  isOnline,
  tempo,
  playedKey,
  writtenKey,
  semitones,
  isFullscreen,
  canFullscreen = true,
  onToggleFullscreen,
  onOpenSettings,
}: LiveHeaderProps) {
  const t = useTranslations("liveMode");

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
        "[--px:0.5rem] [--py:0.5rem] md:[--px:1.5rem] md:[--py:0.75rem]",
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
        <div className="min-w-0">
          <h1 className="truncate text-base leading-tight font-bold sm:text-lg md:text-2xl">
            {title}
          </h1>
          <p className="text-muted-foreground truncate text-[11px] tracking-wider uppercase md:text-xs">
            {subtitle}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5 md:gap-2">
        {!isOnline && (
          <Badge
            variant="outline"
            className="h-7 gap-1 border-amber-500/40 bg-amber-500/10 px-2 text-xs font-bold text-amber-500 md:h-9 md:px-3 md:text-sm"
            title={t("offline")}
          >
            <WifiOff className="h-3.5 w-3.5 md:h-4 md:w-4" />
            <span className="hidden lg:inline">{t("offline")}</span>
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
            {semitones !== 0 && <span className="ml-0.5 opacity-70">*</span>}
          </Badge>
        )}

        {canFullscreen && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleFullscreen}
            className="h-10 w-10"
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

        <Button
          variant="outline"
          onClick={onOpenSettings}
          className="h-10 gap-2 px-2.5 md:px-3"
          aria-label={t("sheet.title")}
          title={t("sheet.title")}
        >
          <SlidersHorizontal className="h-5 w-5" />
          <span className="hidden text-sm lg:inline">{t("sheet.open")}</span>
        </Button>
      </div>
    </header>
  );
}
