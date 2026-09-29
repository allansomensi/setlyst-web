"use client";

import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading state for the public share pages (/s/[token], /g/[token]): the
 * same frame as their views — logo row, title and meta, then the song
 * table. No visible text, since the page's translations arrive with the
 * page itself; only a "Loading…" for screen readers, from `common`, one
 * of the few namespaces the route layout carries. A client component so
 * it reads the layout's provider, in the visitor's locale (the server's
 * request config doesn't know it on these routes).
 */
export function PublicLinkSkeleton() {
  const tCommon = useTranslations("common");
  return (
    <div
      className="bg-background flex min-h-dvh flex-col items-center pt-[max(1.5rem,env(safe-area-inset-top))] pr-[max(1rem,env(safe-area-inset-right))] pb-10 pl-[max(1rem,env(safe-area-inset-left))] sm:pt-10"
      role="status"
      aria-busy="true"
    >
      <span className="sr-only">{tCommon("loading")}</span>
      <div className="w-full max-w-3xl space-y-6">
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-8 w-20" />
        </div>

        <div className="space-y-3">
          <Skeleton className="h-9 w-64 max-w-full" />
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-7 w-24" />
            <Skeleton className="h-7 w-24" />
          </div>
        </div>

        <div className="bg-card divide-y overflow-hidden rounded-xl border">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3">
              <Skeleton className="h-4 w-6 shrink-0" />
              <Skeleton className="h-4 w-48 max-w-[60%]" />
              <Skeleton className="ml-auto h-4 w-10" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
