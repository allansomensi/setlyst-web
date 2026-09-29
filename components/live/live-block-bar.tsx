"use client";

import { useTranslations } from "next-intl";
import { Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LiveBlockPosition } from "@/lib/live-blocks";

/**
 * One line above Live Mode's footer saying which block is playing and how
 * far into it the band is: the block's name, one segment per song (filled
 * up to the current one) and "3/5". The last song of a block is called out,
 * so the change of block never comes as a surprise.
 *
 * Not a `role="status"` live region: its text changes with every song, so
 * it was announced on top of the viewer's own song-change announcement.
 * Screen readers get the same facts as one sentence, read when reached.
 */
export function LiveBlockBar({ position }: { position: LiveBlockPosition }) {
  const t = useTranslations("liveMode.block");
  const isLast = position.index === position.total;

  return (
    <div className="flex items-center gap-2 pt-2 pr-[max(0.75rem,env(safe-area-inset-right))] pl-[max(0.75rem,env(safe-area-inset-left))] md:gap-3 md:pr-[max(1rem,env(safe-area-inset-right))] md:pl-[max(1rem,env(safe-area-inset-left))]">
      <span className="sr-only">
        {t("status", {
          name: position.name,
          current: position.index,
          total: position.total,
        })}
      </span>
      <span
        className="text-primary flex min-w-0 shrink items-center gap-1.5"
        aria-hidden
      >
        <Layers className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span className="truncate text-[11px] font-bold tracking-wider uppercase md:text-xs">
          {position.blockCount > 1 && (
            <span className="opacity-70">
              {t("number", { number: position.blockNumber })}
              {" · "}
            </span>
          )}
          {position.name}
        </span>
      </span>

      <span
        className="flex h-1.5 min-w-12 flex-1 gap-0.5 md:max-w-80"
        aria-hidden
      >
        {Array.from({ length: position.total }, (_, i) => (
          <span
            key={i}
            className={cn(
              "flex-1 rounded-full transition-colors",
              i < position.index ? "bg-primary" : "bg-muted",
              i === position.index - 1 && isLast && "bg-amber-500",
            )}
          />
        ))}
      </span>

      <span
        className={cn(
          "shrink-0 text-xs font-bold tabular-nums",
          isLast
            ? "text-amber-700 in-data-[live-contrast=high]:text-amber-400 dark:text-amber-400"
            : "text-muted-foreground",
        )}
        aria-hidden
      >
        {isLast && position.total > 1 && (
          <span className="mr-1 text-[11px] tracking-wider uppercase">
            {t("last")}
          </span>
        )}
        {position.index}/{position.total}
      </span>
    </div>
  );
}
