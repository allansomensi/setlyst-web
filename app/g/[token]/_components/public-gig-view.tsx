"use client";

import { GigStatusBadge } from "@/components/content/gig-status-badge";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import {
  CalendarDays,
  Clock,
  Eye,
  Flag,
  ListMusic,
  MapPin,
} from "lucide-react";
import { PublicGig } from "@/types/api";
import { Card } from "@/components/ui/card";
import { PublicRunningOrder } from "@/components/public/public-running-order";
import { AppLogo } from "@/components/app-logo";
import { PublicPreferences } from "@/components/public/public-preferences";
import { formatWallClock } from "@/lib/dates";
import { formatDuration } from "@/lib/utils";

interface PublicGigViewProps {
  gig: PublicGig;
}

/**
 * The public, read-only page of a shared gig, in the visitor's language
 * (same locale resolution and preferences as the setlist share page).
 */
export function PublicGigView({ gig }: PublicGigViewProps) {
  const t = useTranslations("publicPage");
  const tStatus = useTranslations("gigs.dialog.status");
  const tSetlists = useTranslations("setlists");
  const locale = useLocale();

  // The venue's wall-clock time, shown as entered (see lib/dates.ts).
  const when = formatWallClock(gig.scheduled_at, locale, {
    dateStyle: "full",
    timeStyle: "short",
  });
  const setlist = gig.setlist;

  return (
    // Side padding clears the notch / rounded corners of a phone held
    // sideways (viewport-fit=cover), like the dashboard.
    <main className="bg-background flex min-h-dvh flex-col items-center pt-[max(1.5rem,env(safe-area-inset-top))] pr-[max(1rem,env(safe-area-inset-right))] pb-10 pl-[max(1rem,env(safe-area-inset-left))] sm:pt-10">
      <div className="w-full max-w-3xl space-y-6">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/"
            aria-label="Setlyst"
            className="text-muted-foreground hover:text-foreground flex items-center gap-2 text-sm font-semibold transition-colors"
          >
            <AppLogo size={24} className="rounded-[5px]" />
            <span className="hidden sm:inline">Setlyst</span>
          </Link>
          <PublicPreferences />
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="min-w-0 text-3xl font-bold tracking-tight break-words">
              {gig.venue}
            </h1>
            <GigStatusBadge status={gig.status} label={tStatus(gig.status)} />
          </div>

          <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            {when && (
              <span className="flex items-center gap-1.5">
                <CalendarDays className="text-primary h-4 w-4" aria-hidden />
                <time dateTime={gig.scheduled_at}>{when}</time>
              </span>
            )}
            {gig.location && (
              <span className="flex items-center gap-1.5">
                <MapPin className="text-primary h-4 w-4" aria-hidden />
                {gig.location}
              </span>
            )}
          </div>
        </div>

        {setlist ? (
          <div className="space-y-4">
            <div className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
              <div className="max-w-full min-w-0">
                <h2 className="text-xl font-semibold break-words">
                  {setlist.title}
                </h2>
                {setlist.description && (
                  <p className="text-muted-foreground mt-1 text-sm break-words">
                    {setlist.description}
                  </p>
                )}
              </div>
              <div className="text-muted-foreground bg-muted/50 flex w-fit items-center gap-1.5 rounded-md border px-2.5 py-1 text-sm font-medium">
                <Clock className="text-primary h-4 w-4" aria-hidden />
                <span>
                  {tSetlists("totalDuration")}:{" "}
                  <span className="text-foreground font-mono tabular-nums">
                    {formatDuration(setlist.total_duration)}
                  </span>
                </span>
              </div>
            </div>

            <PublicRunningOrder setlist={setlist} emptyText={t("noSongs")} />
          </div>
        ) : (
          <Card className="text-muted-foreground flex flex-row items-center gap-2 px-4 py-6 text-sm">
            <ListMusic className="h-4 w-4 shrink-0" aria-hidden />
            <span>{t("gigNoSetlist")}</span>
          </Card>
        )}

        <div className="text-muted-foreground flex flex-col items-center gap-1 pt-2 text-center text-xs sm:flex-row sm:justify-between sm:text-left">
          <span className="flex items-center gap-1.5">
            <Eye className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {t("gigReadOnlyNotice")}
          </span>
          <span className="flex items-center gap-3">
            {/* Copyright and abuse notices (Copyright Policy §5). */}
            <Link
              href={`/${locale}/contato#report`}
              className="hover:text-foreground flex items-center gap-1 underline-offset-4 transition-colors hover:underline"
            >
              <Flag className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {t("report")}
            </Link>
            <Link
              href="/"
              className="hover:text-foreground underline-offset-4 transition-colors hover:underline"
            >
              {t("madeWith")}
            </Link>
          </span>
        </div>
      </div>
    </main>
  );
}
