import { cn } from "@/lib/utils";

export interface BreakdownRow {
  key: string;
  label: string;
  count: number;
  /** CSS colour of the bar (defaults to the primary chart colour). */
  color?: string;
}

/**
 * A ranked list with proportional bars: label, bar and count on one line.
 * Plain HTML (readable by screen readers as a list, exported cleanly).
 */
export function BreakdownBars({
  rows,
  total,
  emptyText,
  className,
}: {
  rows: BreakdownRow[];
  /** Base for the percentages; defaults to the sum of the rows. */
  total?: number;
  emptyText: string;
  className?: string;
}) {
  const sum = total ?? rows.reduce((acc, row) => acc + row.count, 0);
  const max = Math.max(1, ...rows.map((row) => row.count));
  if (rows.length === 0 || sum === 0) {
    return <p className="text-muted-foreground py-4 text-sm">{emptyText}</p>;
  }
  return (
    <ul className={cn("space-y-2", className)}>
      {rows.map((row) => {
        const percent = Math.round((row.count / sum) * 100);
        return (
          <li
            key={row.key}
            className="grid grid-cols-[minmax(0,7rem)_1fr_auto] items-center gap-3 text-sm sm:grid-cols-[minmax(0,9rem)_1fr_auto]"
          >
            <span className="truncate" title={row.label}>
              {row.label}
            </span>
            <span
              className="bg-muted h-2.5 overflow-hidden rounded-full"
              aria-hidden
            >
              <span
                className="block h-full rounded-full"
                style={{
                  width: `${(row.count / max) * 100}%`,
                  background: row.color ?? "var(--chart-1)",
                }}
              />
            </span>
            <span className="text-muted-foreground w-16 text-right font-mono text-xs tabular-nums">
              {row.count} · {percent}%
            </span>
          </li>
        );
      })}
    </ul>
  );
}
