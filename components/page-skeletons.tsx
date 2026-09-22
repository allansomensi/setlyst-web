import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * Building blocks for route-level `loading.tsx` files.
 *
 * Next.js shows the *nearest* `loading.tsx` up the tree, so a detail route
 * with none of its own (`setlists/[id]`, `bands/[id]/gigs`, the Live Mode
 * pages…) used to fall back to its parent list's skeleton — a table of
 * rows flashing up before a page that has no table at all. Each of those
 * routes now has its own loader, and they're all assembled from these
 * pieces so the placeholders line up with the real layout (same spacing,
 * same header shape) and with each other.
 */

/** Mirrors <PageBreadcrumbs>: home icon + a couple of crumbs. */
export function BreadcrumbSkeleton({ crumbs = 2 }: { crumbs?: number }) {
  return (
    <div className="flex items-center gap-1.5" aria-hidden="true">
      <Skeleton className="h-4 w-4 rounded-sm" />
      {Array.from({ length: crumbs }).map((_, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <Skeleton className="h-3 w-2 rounded-sm opacity-60" />
          <Skeleton className={cn("h-4", i === crumbs - 1 ? "w-28" : "w-20")} />
        </div>
      ))}
    </div>
  );
}

interface DetailHeaderSkeletonProps {
  /** Show a description line under the title. */
  withDescription?: boolean;
  /** Show a small meta pill (duration, date…) under the title. */
  withMeta?: boolean;
  /** Number of action buttons on the right; 0 for none. */
  actions?: number;
}

/** Back button + title block (+ optional actions), as used by every detail page. */
export function DetailHeaderSkeleton({
  withDescription = false,
  withMeta = false,
  actions = 0,
}: DetailHeaderSkeletonProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex items-start gap-3 sm:items-center sm:gap-4">
        <Skeleton className="h-8 w-8 shrink-0 rounded-lg" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-8 w-56 max-w-full" />
          {withDescription && <Skeleton className="h-4 w-72 max-w-full" />}
          {withMeta && <Skeleton className="h-7 w-40 max-w-full" />}
        </div>
      </div>
      {actions > 0 && (
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: actions }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-24" />
          ))}
        </div>
      )}
    </div>
  );
}

/** A bordered table with a header row, matching the list pages' tables. */
export function TableSkeleton({
  rows = 5,
  columns = 4,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <div className="bg-background overflow-hidden rounded-md border">
      <div className="flex items-center gap-4 border-b px-4 py-3">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton
            key={i}
            className={cn(
              "h-4",
              i === 0 ? "w-32" : "w-20",
              i >= 2 && "hidden md:block",
              i === columns - 1 && "ml-auto w-8",
            )}
          />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={r}
          className="flex items-center gap-4 border-b px-4 py-3 last:border-b-0"
        >
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton
              key={i}
              className={cn(
                "h-5",
                i === 0 ? "w-48 max-w-[40%]" : "w-24",
                i >= 2 && "hidden md:block",
                i === columns - 1 && "ml-auto h-8 w-8 rounded-md",
              )}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * An ordered list of items (songs in a setlist, members of a band):
 * a leading handle/avatar, two lines of text and a trailing control.
 */
export function ListSkeleton({
  rows = 6,
  leading = "handle",
}: {
  rows?: number;
  leading?: "handle" | "avatar";
}) {
  return (
    <div className="bg-card divide-y overflow-hidden rounded-xl border">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3">
          {leading === "avatar" ? (
            <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
          ) : (
            <>
              <Skeleton className="h-5 w-4 shrink-0 rounded-sm" />
              <Skeleton className="h-5 w-5 shrink-0 rounded-sm" />
            </>
          )}
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-4 w-48 max-w-[70%]" />
            <Skeleton className="h-3 w-28 max-w-[50%]" />
          </div>
          <Skeleton className="hidden h-6 w-14 rounded-full sm:block" />
          <Skeleton className="h-8 w-8 shrink-0 rounded-md" />
        </div>
      ))}
    </div>
  );
}

/**
 * Stand-in for the Live Mode viewer while its data loads. It covers the
 * whole viewport exactly like the viewer does (fixed, above the dashboard
 * chrome), so opening Live Mode goes straight from the dashboard to a
 * performance-shaped screen instead of flashing a dashboard table first.
 */
export function LiveModeSkeleton() {
  // Varying line lengths read as lyrics rather than as a table.
  const lines = [72, 58, 80, 44, 0, 66, 76, 52, 60, 0, 70, 48, 78, 56];

  return (
    <div
      className="bg-background fixed inset-0 z-50 flex flex-col overflow-hidden"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="bg-card/50 flex shrink-0 items-center justify-between border-b p-2 px-4 md:p-3 md:px-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <div className="space-y-1.5">
            <Skeleton className="h-6 w-48 md:h-7 md:w-64" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-7 w-16 rounded-full md:h-9 md:w-20" />
          <Skeleton className="h-7 w-12 rounded-full md:h-9 md:w-16" />
        </div>
      </div>

      <div className="flex-1 overflow-hidden p-4 md:p-12">
        <div className="mx-auto max-w-5xl space-y-4">
          {lines.map((width, i) =>
            width === 0 ? (
              <div key={i} className="h-4" />
            ) : (
              <div key={i} className="space-y-1.5">
                <Skeleton
                  className="h-3 opacity-60"
                  style={{ width: `${Math.max(20, width - 30)}%` }}
                />
                <Skeleton className="h-5" style={{ width: `${width}%` }} />
              </div>
            ),
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * The lyrics editor's shape: header bar, formatting toolbar, then the
 * text area. Used both by the route's `loading.tsx` and by the page itself
 * while it fetches the song client-side, so there's a single placeholder
 * rather than a table skeleton followed by a lone spinner.
 */
export function LyricsEditorSkeleton() {
  const lines = [64, 48, 72, 0, 56, 70, 40, 0, 66, 52, 74, 44];

  return (
    <div
      className="flex h-[calc(100vh-4rem)] flex-col"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-44" />
            <Skeleton className="h-3 w-28" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-7 w-20" />
          <Skeleton className="h-7 w-20" />
        </div>
      </div>

      <div className="bg-muted/30 flex items-center gap-1 border-b px-4 py-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-8" />
        ))}
        <div className="bg-border mx-1 h-5 w-px" />
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-24" />
        <Skeleton className="ml-auto h-8 w-24" />
      </div>

      <div className="flex-1 space-y-3 overflow-hidden p-4">
        {lines.map((width, i) =>
          width === 0 ? (
            <div key={i} className="h-3" />
          ) : (
            <Skeleton key={i} className="h-4" style={{ width: `${width}%` }} />
          ),
        )}
      </div>
    </div>
  );
}
