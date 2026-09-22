import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StatItem {
  label: string;
  value: number | string;
  icon?: LucideIcon;
}

/**
 * A row of headline numbers as one surface divided by hairlines, rather
 * than one floating card per number. Five separate cards for five numbers
 * read as five things competing for attention; one panel reads as one
 * summary.
 *
 * The dividers come from the 1px gap showing the border colour behind the
 * cells, which keeps them correct at every column count without per-cell
 * border bookkeeping.
 */
export function StatGrid({
  items,
  className,
}: {
  items: StatItem[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        "bg-border grid gap-px overflow-hidden rounded-xl border",
        "grid-cols-2",
        items.length === 4 && "sm:grid-cols-4",
        items.length === 5 && "sm:grid-cols-3 lg:grid-cols-5",
        items.length === 3 && "sm:grid-cols-3",
        className,
      )}
    >
      {items.map(({ label, value, icon: Icon }, index) => (
        <div
          key={label}
          className={cn(
            "bg-card flex flex-col gap-1 p-4",
            // An odd count leaves a hole in the 2-column phone layout;
            // let the last cell take the whole row instead.
            items.length % 2 === 1 &&
              index === items.length - 1 &&
              "col-span-2 sm:col-span-1",
          )}
        >
          <span className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
            {Icon && <Icon className="h-3.5 w-3.5" />}
            {label}
          </span>
          <span className="text-2xl font-semibold tracking-tight tabular-nums">
            {value}
          </span>
        </div>
      ))}
    </div>
  );
}
