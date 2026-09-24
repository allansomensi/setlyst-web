"use client";

import { useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { PublicSetlist } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Clock, Download, Eye, Flag, Music } from "lucide-react";
import { AppLogo } from "@/components/app-logo";
import { formatDuration } from "@/lib/utils";
import { apiPath } from "@/lib/api-endpoint";
import { ExportPdfDialog } from "@/components/setlists/export-pdf-dialog";
import { PublicPreferences } from "@/components/public/public-preferences";
import { LinkButtons } from "@/components/content/link-buttons";

interface PublicSetlistViewProps {
  setlist: PublicSetlist;
  token: string;
}

export function PublicSetlistView({ setlist, token }: PublicSetlistViewProps) {
  const t = useTranslations("publicPage");
  const tTable = useTranslations("setlists.songs.table");
  const tSetlists = useTranslations("setlists");
  const locale = useLocale();
  const [isPdfDialogOpen, setIsPdfDialogOpen] = useState(false);

  // Same-origin proxy (app/api/export/public/...); built with apiPath so a
  // crafted token can't walk to another route.
  const pdfEndpoint = apiPath`/api/export/public/setlists/${token}/pdf`;

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

        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div className="min-w-0">
            <h1 className="text-3xl font-bold tracking-tight break-words">
              {setlist.title}
            </h1>
            {setlist.description && (
              <p className="text-muted-foreground mt-1">
                {setlist.description}
              </p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <div className="text-muted-foreground bg-muted/50 flex w-fit items-center gap-1.5 rounded-md border px-2.5 py-1 text-sm font-medium">
                <Clock className="text-primary h-4 w-4" />
                <span>
                  {tSetlists("totalDuration")}:{" "}
                  <span className="text-foreground font-mono tabular-nums">
                    {formatDuration(setlist.total_duration)}
                  </span>
                </span>
              </div>
              <div className="text-muted-foreground bg-muted/50 flex w-fit items-center gap-1.5 rounded-md border px-2.5 py-1 text-sm font-medium">
                <Music className="text-primary h-4 w-4" />
                <span>
                  {tSetlists("songCount", { count: setlist.songs.length })}
                </span>
              </div>
            </div>
          </div>

          <Button
            size="lg"
            className="h-10 w-full gap-2 px-4 sm:w-auto"
            onClick={() => setIsPdfDialogOpen(true)}
          >
            <Download className="h-4 w-4" />
            {t("downloadPdf")}
          </Button>
        </div>

        {setlist.links && setlist.links.length > 0 && (
          <LinkButtons links={setlist.links} />
        )}

        <div className="bg-card overflow-hidden rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>{tTable("title")}</TableHead>
                <TableHead className="hidden md:table-cell">
                  {tTable("artist")}
                </TableHead>
                <TableHead className="text-right sm:text-left">
                  {tTable("duration")}
                </TableHead>
                <TableHead className="hidden sm:table-cell">
                  {tTable("bpm")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {setlist.songs.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-muted-foreground h-24 text-center"
                  >
                    {t("noSongs")}
                  </TableCell>
                </TableRow>
              ) : (
                setlist.songs.map((song, index) => (
                  <TableRow key={`${song.position}-${index}`}>
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
                      <p className="text-muted-foreground truncate text-xs md:hidden">
                        {song.artist_name}
                        {song.tempo ? (
                          <span className="sm:hidden">
                            {" · "}
                            {song.tempo} BPM
                          </span>
                        ) : null}
                      </p>
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden md:table-cell">
                      {song.artist_name}
                    </TableCell>
                    <TableCell className="text-right sm:text-left">
                      <span className="text-muted-foreground font-mono text-sm tabular-nums">
                        {song.duration ? formatDuration(song.duration) : "–"}
                      </span>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
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

        <div className="text-muted-foreground flex flex-col items-center gap-1 pt-2 text-center text-xs sm:flex-row sm:justify-between sm:text-left">
          <span className="flex items-center gap-1.5">
            <Eye className="h-3.5 w-3.5 shrink-0" />
            {t("readOnlyNotice")}
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

      <ExportPdfDialog
        endpoint={pdfEndpoint}
        publicLink
        publicNotice={t("pdfPublicNotice")}
        setlistTitle={setlist.title}
        isOpen={isPdfDialogOpen}
        onClose={() => setIsPdfDialogOpen(false)}
      />
    </div>
  );
}
