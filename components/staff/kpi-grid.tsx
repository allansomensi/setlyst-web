import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The staff console's headline numbers (Financeiro, Planos e cobrança):
 * one surface divided by hairlines, like the app's `StatGrid`, plus a
 * hint line under each value ("ARR R$ …", "Churn de 2%") that StatGrid
 * doesn't carry.
 *
 * Both pages used to show one floating card per number: eight cards in
 * two rows read as eight separate things rather than one summary, and
 * looked unlike the stat panels everywhere else in the app.
 */
export function KpiGrid({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <dl
      className={cn(
        // The dividers are the 1px gap showing the border colour behind
        // the cells, so they stay right at every column count.
        "bg-border grid grid-cols-2 gap-px overflow-hidden rounded-xl border shadow-(--shadow-surface) lg:grid-cols-4",
        className,
      )}
    >
      {children}
    </dl>
  );
}

export function Kpi({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  /** Text colour of the value (a warning, an "off" state). */
  tone?: string;
}) {
  return (
    <div className="bg-card flex min-w-0 flex-col gap-1 p-4">
      <dt className="text-muted-foreground text-xs font-medium">{label}</dt>
      <dd
        className={cn(
          "text-2xl font-semibold tracking-tight break-words tabular-nums",
          tone,
        )}
      >
        {value}
      </dd>
      {hint && (
        <dd className="text-muted-foreground text-xs text-pretty">{hint}</dd>
      )}
    </div>
  );
}
