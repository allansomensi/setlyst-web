"use client";

import { useLocale, useTranslations } from "next-intl";
import { CalendarDays, Guitar, Mic2, Route } from "lucide-react";
import { Link } from "@/components/nav-link";
import { Badge } from "@/components/ui/badge";
import { PinButton } from "@/components/content/pin-button";
import { formatWallClock } from "@/lib/dates";
import { tourPhase, type TourPhase } from "@/lib/tours";
import { cn } from "@/lib/utils";
import type { Tour } from "@/types/content";

export const PHASE_STYLES: Record<TourPhase, string> = {
  current:
    "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  upcoming: "border-primary/40 bg-primary/10 text-primary",
  past: "border-border bg-muted text-muted-foreground",
};

/** "1 de out. de 2026 – 20 de out. de 2026" (calendar dates, no time zone). */
export function formatTourDates(
  tour: { start_date: string; end_date: string },
  locale: string,
): string {
  const day = (value: string) =>
    formatWallClock(`${value}T00:00:00`, locale, { dateStyle: "medium" });
  return tour.start_date === tour.end_date
    ? day(tour.start_date)
    : `${day(tour.start_date)} – ${day(tour.end_date)}`;
}

export function TourCard({ tour, today }: { tour: Tour; today: string }) {
  const t = useTranslations("tours");
  const locale = useLocale();
  const phase = tourPhase(tour, today);

  return (
    <article className="bg-card hover:border-primary/40 group relative flex flex-col gap-3 rounded-xl border p-4 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-3">
          <span className="bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
            <Route className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <h3 className="truncate font-semibold">
              <Link
                href={`/dashboard/tours/${tour.id}`}
                className="focus-visible:ring-ring/50 rounded-sm after:absolute after:inset-0 focus-visible:ring-3 focus-visible:outline-none"
              >
                {tour.name}
              </Link>
            </h3>
            <p className="text-muted-foreground text-sm">
              {formatTourDates(tour, locale)}
            </p>
          </div>
        </div>
        <PinButton
          type="tour"
          id={tour.id}
          name={tour.name}
          pinned={!!tour.is_pinned}
          className="relative z-10"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Badge variant="outline" className={cn(PHASE_STYLES[phase])}>
          {t(`phase.${phase}`)}
        </Badge>
        {tour.band_name && (
          <Badge variant="outline" className="gap-1 font-normal">
            <Guitar aria-hidden />
            {tour.band_name}
          </Badge>
        )}
        <span className="text-muted-foreground inline-flex items-center gap-1">
          <Mic2 className="h-3.5 w-3.5" aria-hidden />
          {t("gigCount", { count: tour.gig_count })}
        </span>
      </div>
      {tour.next_gig_at && phase !== "past" && (
        <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
          <CalendarDays className="h-3.5 w-3.5" aria-hidden />
          {t("nextGig", { date: formatWallClock(tour.next_gig_at, locale) })}
        </p>
      )}
    </article>
  );
}
