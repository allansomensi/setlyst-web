import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { GigStatus } from "@/types/api";

/**
 * Soft tints rather than solid fills: nearly every show on a list is
 * "confirmed", and a column of solid primary pills was the loudest thing
 * on the page for the least news. The dot keeps the three apart at a
 * glance, and in a greyscale print too.
 */
const STATUS_STYLES: Record<GigStatus, string> = {
  confirmed: "border-primary/30 bg-primary/10 text-primary",
  completed:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  cancelled: "border-destructive/30 bg-destructive/10 text-destructive",
};

const DOT_STYLES: Record<GigStatus, string> = {
  confirmed: "bg-primary",
  completed: "bg-emerald-500",
  cancelled: "bg-destructive",
};

/**
 * A show's status, the same on every page that lists shows (the shows
 * list, a show, a tour, a band, the public share page). `label` is the
 * status already translated by the caller, whose namespace differs.
 */
export function GigStatusBadge({
  status,
  label,
  className,
}: {
  status: GigStatus;
  label: string;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn("gap-1.5 font-medium", STATUS_STYLES[status], className)}
    >
      <span
        aria-hidden
        className={cn("size-1.5 shrink-0 rounded-full", DOT_STYLES[status])}
      />
      {label}
    </Badge>
  );
}
