"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { CalendarDays, Clock, Eye, ListMusic, MapPin } from "lucide-react";
import { PublicGig, GigStatus } from "@/types/api";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AppLogo } from "@/components/app-logo";
import { PublicPreferences } from "@/components/public/public-preferences";
import { formatWallClock } from "@/lib/dates";
import { formatDuration } from "@/lib/utils";

interface PublicGigViewProps {
  gig: PublicGig;
}

const STATUS_VARIANT: Record<
  GigStatus,
  "default" | "destructive" | "secondary"
> = {
  confirmed: "default",
  cancelled: "destructive",
  completed: "secondary",
};

/**
 * The public, read-only page of a shared gig, in the visitor's language
 * (same locale resolution and preferences as the setlist share page).
 */
export function PublicGigView({ gig }: PublicGigViewProps) {
  const t = useTranslations("publicPage");
  const tStatus = useTranslations("gigs.dialog.status");
  const tTable = useTranslations("setlists.songs.table");
  const tSetlists = useTranslations("setlists");
  const locale = useLocale();

  // The venue's wall-clock time, shown as entered (see lib/dates.ts).
  const when = formatWallClock(gig.scheduled_at, locale, {
    dateStyle: "full",
    timeStyle: "short",
  });
  const setlist = gig.setlist;

  return (
    <div className="bg-background flex min-h-screen flex-col items-center px-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-10 sm:pt-10">
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
            <h1 className="text-3xl font-bold tracking-tight break-words">
              {gig.venue}
            </h1>
            <Badge variant={STATUS_VARIANT[gig.status] ?? "secondary"}>
              {tStatus(gig.status)}
            </Badge>
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
              <div className="min-w-0">
                <h2 className="text-xl font-semibold break-words">
                  {setlist.title}
                </h2>
                {setlist.description && (
                  <p className="text-muted-foreground mt-1 text-sm">
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

            <div className="bg-card overflow-hidden rounded-xl border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>{tTable("title")}</TableHead>
                    <TableHead className="hidden sm:table-cell">
                      {tTable("artist")}
                    </TableHead>
                    <TableHead className="text-right sm:text-left">
                      {tTable("bpm")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {setlist.songs.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-muted-foreground h-24 text-center"
                      >
                        {t("noSongs")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    setlist.songs.map((song, index) => (
                      <TableRow key={`${index}-${song.title}`}>
                        <TableCell className="text-muted-foreground font-mono text-xs font-medium tabular-nums">
                          {String(index + 1).padStart(2, "0")}
                        </TableCell>
                        <TableCell className="w-full max-w-0">
                          <div className="flex items-center gap-2">
                            <span className="truncate font-medium">
                              {song.title}
                            </span>
                            {song.tonality && (
                              <Badge
                                variant="outline"
                                className="h-5 shrink-0 px-1.5 font-mono text-[10px]"
                              >
                                {song.tonality}
                              </Badge>
                            )}
                          </div>
                          <p className="text-muted-foreground truncate text-xs sm:hidden">
                            {song.artist_name}
                          </p>
                        </TableCell>
                        <TableCell className="text-muted-foreground hidden sm:table-cell">
                          {song.artist_name}
                        </TableCell>
                        <TableCell className="text-right sm:text-left">
                          <span className="text-muted-foreground font-mono text-sm tabular-nums">
                            {song.tempo ?? "–"}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
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
          <Link
            href="/"
            className="hover:text-foreground underline-offset-4 transition-colors hover:underline"
          >
            {t("madeWith")}
          </Link>
        </div>
      </div>
    </div>
  );
}
