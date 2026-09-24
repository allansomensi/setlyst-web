"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CalendarDays, Guitar, ListMusic, MapPin, Play } from "lucide-react";
import { Link } from "@/components/nav-link";
import { Button } from "@/components/ui/button";
import { useMounted } from "@/hooks/use-mounted";
import { formatWallClock, parseWallClock, wallClockNow } from "@/lib/dates";
import { SetlistOfflineStatus } from "../setlists/[id]/_components/setlist-offline-status";
import type { Gig } from "@/types/api";

export interface NextGigCandidate {
  gig: Gig;
  setlistTitle: string | null;
  bandName: string | null;
}

/** A show that started this long ago still counts as "the next one". */
const IN_PROGRESS_MS = 6 * 60 * 60 * 1000;

/**
 * The next show on the calendar, on the dashboard home: when and where,
 * the setlist, and one tap into Live Mode, with the offline copy's state
 * next to it (the thing to check before leaving for the venue).
 *
 * "Next" depends on the viewer's clock, so the choice is made after mount
 * from a few candidates the server picked.
 */
export function NextGigCard({
  candidates,
}: {
  candidates: NextGigCandidate[];
}) {
  const t = useTranslations("dashboard.nextGig");
  const locale = useLocale();
  const mounted = useMounted();
  const [now] = useState(() =>
    typeof window === "undefined" ? 0 : wallClockNow(),
  );

  const next = useMemo(
    () =>
      mounted
        ? (candidates.find(
            ({ gig }) =>
              parseWallClock(gig.scheduled_at).getTime() >=
              now - IN_PROGRESS_MS,
          ) ?? null)
        : null,
    [candidates, mounted, now],
  );

  if (!next) return null;
  const { gig, setlistTitle, bandName } = next;
  const when = formatWallClock(gig.scheduled_at, locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <section
      aria-labelledby="next-gig-title"
      className="bg-card overflow-hidden rounded-xl border"
    >
      <div className="bg-primary/5 flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="min-w-0 space-y-1.5">
          <h2
            id="next-gig-title"
            className="text-primary text-xs font-semibold tracking-wider uppercase"
          >
            {t("title")}
          </h2>
          <p className="truncate text-lg font-semibold">
            <Link
              href={`/dashboard/gigs/${gig.id}`}
              className="focus-visible:ring-ring/50 rounded-sm outline-none hover:underline focus-visible:ring-3"
            >
              {gig.venue}
            </Link>
          </p>
          <ul className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-sm">
            <li className="flex items-center gap-1.5">
              <CalendarDays className="size-4 shrink-0" aria-hidden />
              <span className="first-letter:uppercase">{when}</span>
            </li>
            {gig.location && (
              <li className="flex min-w-0 items-center gap-1.5">
                <MapPin className="size-4 shrink-0" aria-hidden />
                <span className="truncate">{gig.location}</span>
              </li>
            )}
            {bandName && (
              <li className="flex items-center gap-1.5">
                <Guitar className="size-4 shrink-0" aria-hidden />
                {bandName}
              </li>
            )}
            <li className="flex min-w-0 items-center gap-1.5">
              <ListMusic className="size-4 shrink-0" aria-hidden />
              <span className="truncate">
                {gig.setlist_id
                  ? (setlistTitle ?? t("setlistLinked"))
                  : t("noSetlist")}
              </span>
            </li>
          </ul>
        </div>
        <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
          {gig.setlist_id ? (
            <>
              <Button asChild size="lg">
                <Link href={`/dashboard/setlists/${gig.setlist_id}/live`}>
                  <Play className="mr-2 size-4" aria-hidden />
                  {t("openLive")}
                </Link>
              </Button>
              <SetlistOfflineStatus setlistId={gig.setlist_id} />
            </>
          ) : (
            <Button asChild variant="outline">
              <Link href={`/dashboard/gigs/${gig.id}`}>{t("linkSetlist")}</Link>
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
