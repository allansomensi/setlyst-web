"use client";

import { useRef, type KeyboardEvent, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, Coffee, Layers } from "lucide-react";
import { Popover as PopoverPrimitive } from "radix-ui";
import type { LiveRunningOrderRow } from "@/lib/live-blocks";
import type { SetlistSong } from "@/types/api";
import { cn } from "@/lib/utils";

interface LiveSongListProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rows: LiveRunningOrderRow[];
  /** Index (in the songs Live Mode navigates) of the song on screen. */
  currentIndex: number;
  onSelect: (index: number) => void;
  /** The key each song is played in, after the setlist's transposition. */
  keyFor: (song: SetlistSong) => string | null;
  /** What the list is of: the setlist's name. */
  heading: string;
  highContrast: boolean;
  /** The trigger's contents: the song title and the line under it. */
  children: ReactNode;
}

/**
 * The song title in Live Mode's header, which drops down the whole running
 * order to jump to any song — skip one the band dropped tonight, or go back
 * to one called for again.
 *
 * Kept deliberately hard to misfire mid-set: the list is modal, so a tap
 * outside only closes it and never lands on the controls underneath, and
 * nothing changes until a song is tapped. Opens scrolled to (and focused
 * on) the song playing, with the blocks and breaks where they fall.
 */
export type { LiveSongListProps };

export function LiveSongList({
  open,
  onOpenChange,
  rows,
  currentIndex,
  onSelect,
  keyFor,
  heading,
  highContrast,
  children,
}: LiveSongListProps) {
  const t = useTranslations("liveMode.songList");
  const listRef = useRef<HTMLOListElement>(null);
  const songCount = rows.filter((row) => row.kind === "song").length;

  const songButtons = () =>
    Array.from(
      listRef.current?.querySelectorAll<HTMLButtonElement>(
        "button[data-song-index]",
      ) ?? [],
    );

  // Up/Down (and Home/End) move between songs, like any menu.
  const onListKeyDown = (event: KeyboardEvent<HTMLOListElement>) => {
    const buttons = songButtons();
    const at = buttons.indexOf(document.activeElement as HTMLButtonElement);
    let target: number | null = null;
    if (event.key === "ArrowDown")
      target = Math.min(buttons.length - 1, at + 1);
    else if (event.key === "ArrowUp") target = Math.max(0, at - 1);
    else if (event.key === "Home") target = 0;
    else if (event.key === "End") target = buttons.length - 1;
    if (target === null) return;
    event.preventDefault();
    buttons[target]?.focus();
    buttons[target]?.scrollIntoView({ block: "nearest" });
  };

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={onOpenChange} modal>
      <PopoverPrimitive.Trigger
        className={cn(
          "group flex max-w-full min-w-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-left transition-colors",
          "hover:bg-accent/60 focus-visible:ring-ring/50 outline-none focus-visible:ring-[3px]",
          "data-[state=open]:bg-accent/60",
        )}
        title={t("open")}
      >
        <span className="min-w-0">
          {children}
          <span className="sr-only"> ({t("open")})</span>
        </span>
        <ChevronDown
          className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0 self-start transition-transform group-data-[state=open]:rotate-180 sm:mt-0.5 md:mt-1.5 md:h-5 md:w-5"
          aria-hidden
        />
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          sideOffset={8}
          collisionPadding={8}
          // Land on the song playing instead of the first one, and bring
          // it into view: in a long set it's rarely at the top.
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            const current = listRef.current?.querySelector<HTMLButtonElement>(
              "button[aria-current]",
            );
            current?.focus({ preventScroll: true });
            current?.scrollIntoView({ block: "center" });
          }}
          // Portalled out of the Live Mode root, so it re-applies the
          // high-contrast scope itself (like the settings sheet).
          data-live-contrast={highContrast ? "high" : undefined}
          // Focus goes back to the page, not to the title: page-turner
          // pedals send the arrow keys, which Live Mode leaves alone on a
          // focused button — the next song must be one tap of the pedal
          // away right after a jump.
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            if (document.activeElement instanceof HTMLElement) {
              document.activeElement.blur();
            }
          }}
          className={cn(
            "bg-popover text-popover-foreground ring-foreground/10 z-50 flex flex-col overflow-hidden rounded-xl shadow-xl ring-1 outline-none",
            "max-h-[min(36rem,var(--radix-popover-content-available-height))] w-[min(26rem,calc(100vw-1rem))]",
            "data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 origin-(--radix-popover-content-transform-origin) duration-100",
          )}
        >
          <div className="flex items-baseline justify-between gap-3 border-b px-4 py-2.5">
            <p className="text-muted-foreground truncate text-[11px] font-bold tracking-wider uppercase">
              {heading}
            </p>
            <p className="text-muted-foreground shrink-0 text-xs tabular-nums">
              {t("count", { count: songCount })}
            </p>
          </div>

          <ol
            ref={listRef}
            aria-label={t("label")}
            onKeyDown={onListKeyDown}
            className="min-h-0 flex-1 [scrollbar-width:thin] overflow-y-auto overscroll-contain py-1"
          >
            {rows.map((row) => {
              if (row.kind === "block") {
                return (
                  <li
                    key={row.key}
                    role="presentation"
                    className="bg-popover text-primary sticky top-0 z-10 flex items-center gap-1.5 px-4 pt-3 pb-1.5 text-[11px] font-bold tracking-wider uppercase"
                  >
                    <Layers className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    <span className="truncate">{row.name}</span>
                  </li>
                );
              }

              if (row.kind === "break") {
                return (
                  <li
                    key={row.key}
                    role="presentation"
                    className="text-muted-foreground flex items-center gap-2 px-4 py-1.5 text-xs"
                  >
                    <span className="h-px flex-1 border-t border-dashed" />
                    <Coffee className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    <span className="truncate">
                      {row.label || t("break")}
                      {row.minutes
                        ? ` · ${t("minutes", { minutes: row.minutes })}`
                        : ""}
                    </span>
                    <span className="h-px flex-1 border-t border-dashed" />
                  </li>
                );
              }

              const { song, index } = row;
              const isCurrent = index === currentIndex;
              const isPast = index < currentIndex;
              const key = keyFor(song);

              return (
                <li key={row.key}>
                  <button
                    type="button"
                    data-song-index={index}
                    aria-current={isCurrent ? "true" : undefined}
                    onClick={() => onSelect(index)}
                    className={cn(
                      "relative flex min-h-12 w-full items-center gap-3 px-4 py-2 text-left transition-colors outline-none",
                      "hover:bg-accent focus-visible:bg-accent",
                      isCurrent &&
                        "bg-primary/10 hover:bg-primary/15 focus-visible:bg-primary/15",
                    )}
                  >
                    {isCurrent && (
                      <span
                        className="bg-primary absolute inset-y-1.5 left-0 w-1 rounded-r-full"
                        aria-hidden
                      />
                    )}
                    <span
                      className={cn(
                        "w-6 shrink-0 text-right text-sm tabular-nums",
                        isCurrent
                          ? "text-primary font-bold"
                          : "text-muted-foreground",
                      )}
                    >
                      {index + 1}
                    </span>
                    <span
                      className={cn(
                        "min-w-0 flex-1",
                        // Already played: still there to go back to, but
                        // quieter than what's still ahead.
                        isPast && "opacity-55",
                      )}
                    >
                      <span
                        className={cn(
                          "block truncate text-sm leading-snug font-semibold md:text-base",
                          isCurrent && "text-primary",
                        )}
                      >
                        {song.title}
                        {song.version_label && (
                          <span className="text-muted-foreground font-normal">
                            {" · "}
                            {song.version_label}
                          </span>
                        )}
                      </span>
                      {(song.artist_name || isCurrent) && (
                        <span className="text-muted-foreground block truncate text-xs">
                          {isCurrent && (
                            <span className="text-primary font-bold tracking-wider uppercase">
                              {t("nowPlaying")}
                              {song.artist_name && " · "}
                            </span>
                          )}
                          {song.artist_name}
                        </span>
                      )}
                    </span>
                    {key && (
                      <span
                        className={cn(
                          "text-muted-foreground shrink-0 text-xs font-semibold tabular-nums",
                          isPast && "opacity-55",
                        )}
                        title={t("key", { key })}
                      >
                        {key}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ol>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
