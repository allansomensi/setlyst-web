"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  ChevronDown,
  ChevronLeft,
  Download,
  FileDown,
  FileEdit,
  FileMusic,
  Guitar,
  ListMusic,
  Loader2,
  NotebookPen,
  Pencil,
  Play,
  Trash2,
  WifiOff,
} from "lucide-react";
import { useAppRouter } from "@/hooks/use-app-router";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { Link } from "@/components/nav-link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AuditStamp } from "@/components/audit-stamp";
import { ClientDate } from "@/components/client-date";
import { TagChip } from "@/components/tags/tag-chip";
import { ChordProRenderer } from "@/components/lyrics/chord-pro-renderer";
import { LinkButtons } from "@/components/content/link-buttons";
import { EnergyMeter } from "@/components/content/energy";
import { PinButton } from "@/components/content/pin-button";
import { toastMovedToTrash } from "@/components/content/trash-toast";
import { SongPdfDialog } from "@/components/songs/song-pdf-dialog";
import { useSongChordProExport } from "@/components/songs/use-song-chordpro-export";
import { toastActionError } from "@/lib/action-toast";
import { formatDuration } from "@/lib/utils";
import { Artist, Song, SongSetlistRef, formatGenre } from "@/types/api";
import { setlistDisplayTitle } from "@/lib/repertoire";
import { deleteSong } from "../../actions";
import { SongDialog } from "../../_components/song-dialog";

interface SongDetailProps {
  song: Song;
  artistName: string | null;
  /** For the edit dialog's artist picker. */
  artists: Artist[];
  band: { id: string; name: string } | null;
  /** Setlists that contain the song (`null` when they couldn't load). */
  setlists: SongSetlistRef[] | null;
  canEdit: boolean;
  /** Band songs need the band's `export_pdf` permission. */
  canExport: boolean;
  canUseAdvancedPdf: boolean;
}

/**
 * Everything about one song on one page: the facts a musician checks
 * before playing (key, BPM, time signature, capo, tuning...), reference
 * links, stage notes and the lyrics, plus the actions (edit, Live Mode,
 * export, move to the trash).
 */
export function SongDetail({
  song,
  artistName,
  artists,
  band,
  setlists,
  canEdit,
  canExport,
  canUseAdvancedPdf,
}: SongDetailProps) {
  const t = useTranslations("songDetail");
  const tRepertoire = useTranslations("setlists.repertoire");
  const tSongs = useTranslations("songs");
  const tTrash = useTranslations("trash");
  const tCommon = useTranslations("common");
  const router = useAppRouter();
  const isOnline = useOnlineStatus();
  const { exportSong, pendingId } = useSongChordProExport();

  const [isEditing, setIsEditing] = useState(false);
  const [isPdfOpen, setIsPdfOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPending, startTransition] = useTransition();

  const facts: Array<{ label: string; value: React.ReactNode }> = [
    { label: t("facts.key"), value: song.tonality },
    { label: t("facts.bpm"), value: song.tempo ?? null },
    { label: t("facts.timeSignature"), value: song.time_signature },
    {
      label: t("facts.capo"),
      value:
        song.capo == null
          ? null
          : song.capo === 0
            ? tSongs("capo.none")
            : tSongs("capo.fret", { fret: song.capo }),
    },
    { label: t("facts.tuning"), value: song.tuning },
    {
      label: t("facts.duration"),
      value: song.duration ? formatDuration(song.duration) : null,
    },
    {
      label: t("facts.energy"),
      value:
        song.energy != null ? (
          <EnergyMeter energy={song.energy} showLabel />
        ) : null,
    },
    {
      label: t("facts.genre"),
      value: song.genre ? formatGenre(song.genre) : null,
    },
  ];

  const confirmDelete = () => {
    startTransition(async () => {
      const result = await deleteSong(song.id);
      if (!result.success) {
        toastActionError(result, result.error ?? tSongs("dialog.deleteFailed"));
        return;
      }
      setIsDeleting(false);
      toastMovedToTrash(
        "song",
        song.id,
        {
          message: tSongs("dialog.deleted"),
          undoLabel: tTrash("undo"),
          restoring: tTrash("restoring"),
          restored: tSongs("dialog.restored"),
          restoreFailed: tTrash("restoreFailed"),
        },
        () => router.push(`/dashboard/songs/${song.id}`),
      );
      router.push("/dashboard/songs");
    });
  };

  const lineCount = song.lyrics?.trim() ? song.lyrics.split("\n").length : 0;

  return (
    <div className="space-y-6">
      {!isOnline && (
        <p
          role="status"
          className="bg-muted/60 flex items-start gap-2 rounded-lg border px-3 py-2 text-sm"
        >
          <WifiOff className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {t("offlineNotice")}
        </p>
      )}

      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <Button
            variant="outline"
            size="icon"
            asChild
            className="shrink-0"
            aria-label={tCommon("back")}
          >
            <Link href="/dashboard/songs">
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </Link>
          </Button>
          <div className="min-w-0 space-y-1.5">
            <h1 className="text-2xl font-bold tracking-tight break-words sm:text-3xl">
              {song.title}
            </h1>
            <p className="text-muted-foreground flex flex-wrap items-center gap-2 text-base">
              <span>{artistName ?? t("unknownArtist")}</span>
              {band && (
                <Badge variant="outline" className="gap-1 font-normal" asChild>
                  <Link href={`/dashboard/bands/${band.id}`}>
                    <Guitar className="h-3 w-3" aria-hidden />
                    {band.name}
                  </Link>
                </Badge>
              )}
            </p>
            {song.tags.length > 0 && (
              <ul className="flex flex-wrap gap-1" aria-label={t("tags")}>
                {song.tags.map((tag) => (
                  <li key={tag}>
                    <TagChip tag={tag} />
                  </li>
                ))}
              </ul>
            )}
            <AuditStamp
              updatedAt={song.updated_at}
              updatedBy={song.updated_by_username}
            />
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button asChild className="h-10 gap-2 px-4">
            <Link href={`/dashboard/songs/${song.id}/live`}>
              <Play className="h-4 w-4" aria-hidden />
              {t("actions.liveMode")}
            </Link>
          </Button>
          {canEdit && (
            <>
              <Button
                variant="outline"
                className="h-10 gap-2"
                onClick={() => setIsEditing(true)}
                disabled={!isOnline}
              >
                <Pencil className="h-4 w-4" aria-hidden />
                <span className="sr-only sm:not-sr-only">
                  {t("actions.edit")}
                </span>
              </Button>
              <Button asChild variant="outline" className="h-10 gap-2">
                <Link href={`/dashboard/songs/${song.id}/lyrics`}>
                  <FileEdit className="h-4 w-4" aria-hidden />
                  <span className="sr-only sm:not-sr-only">
                    {t("actions.editLyrics")}
                  </span>
                </Link>
              </Button>
            </>
          )}
          {canExport && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="h-10 gap-1.5"
                  disabled={!isOnline}
                >
                  {pendingId === song.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    <Download className="h-4 w-4" aria-hidden />
                  )}
                  <span className="sr-only sm:not-sr-only">
                    {t("actions.export")}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 opacity-60" aria-hidden />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onSelect={() => setIsPdfOpen(true)}>
                  <FileDown className="mr-2 h-4 w-4" aria-hidden />
                  {t("actions.exportPdf")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => void exportSong(song.id, song.title)}
                >
                  <FileMusic className="mr-2 h-4 w-4" aria-hidden />
                  {t("actions.exportChordpro")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <PinButton
            type="song"
            id={song.id}
            name={song.title}
            pinned={!!song.is_pinned}
            variant="default"
            className="h-10"
          />
          {canEdit && (
            <Button
              variant="outline"
              className="text-destructive hover:text-destructive h-10 gap-2"
              onClick={() => setIsDeleting(true)}
              disabled={!isOnline}
            >
              <Trash2 className="h-4 w-4" aria-hidden />
              <span className="sr-only sm:not-sr-only">
                {t("actions.delete")}
              </span>
            </Button>
          )}
        </div>
      </header>

      <section aria-labelledby="song-facts">
        <h2 id="song-facts" className="sr-only">
          {t("facts.title")}
        </h2>
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {facts.map(({ label, value }) => (
            <div key={label} className="bg-card rounded-lg border px-3 py-2.5">
              <dt className="text-muted-foreground text-xs">{label}</dt>
              <dd className="mt-0.5 truncate text-sm font-semibold">
                {value ?? (
                  <span className="text-muted-foreground font-normal">
                    {t("notInformed")}
                  </span>
                )}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Card className="order-2 lg:order-1">
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div>
              <CardTitle>{t("lyrics.title")}</CardTitle>
              <CardDescription>
                {lineCount > 0
                  ? tSongs("dialog.lyricsLines", { count: lineCount })
                  : tSongs("dialog.noLyrics")}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {song.lyrics?.trim() ? (
              <ChordProRenderer content={song.lyrics} fontSize={1} />
            ) : (
              <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed px-4 py-10 text-center">
                <p className="text-muted-foreground text-sm">
                  {t("lyrics.empty")}
                </p>
                {canEdit && (
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/dashboard/songs/${song.id}/lyrics`}>
                      <FileEdit className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                      {t("lyrics.add")}
                    </Link>
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="order-1 space-y-6 lg:order-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("links.title")}</CardTitle>
            </CardHeader>
            <CardContent>
              {song.links && song.links.length > 0 ? (
                <LinkButtons
                  links={song.links}
                  className="flex-col [&_a]:w-full"
                />
              ) : (
                <p className="text-muted-foreground text-sm">
                  {t("links.empty")}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <NotebookPen className="h-4 w-4" aria-hidden />
                {t("notes.title")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {song.performance_notes?.trim() ? (
                <p className="text-sm whitespace-pre-wrap">
                  {song.performance_notes}
                </p>
              ) : (
                <p className="text-muted-foreground text-sm">
                  {t("notes.empty")}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ListMusic className="h-4 w-4" aria-hidden />
                {t("setlists.title")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {setlists === null ? (
                <p className="text-muted-foreground text-sm">
                  {t("setlists.loadError")}
                </p>
              ) : setlists.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  {t("setlists.empty")}
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {setlists.map((setlist) => (
                    <li key={setlist.id}>
                      <Link
                        href={`/dashboard/setlists/${setlist.id}`}
                        className="hover:bg-muted/60 -mx-2 flex items-center justify-between gap-3 rounded-md px-2 py-1.5 text-sm"
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-medium">
                            {setlistDisplayTitle(setlist, tRepertoire("name"))}
                          </span>
                          {setlist.band_name && (
                            <span className="text-muted-foreground block truncate text-xs">
                              {setlist.band_name}
                            </span>
                          )}
                        </span>
                        <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                          {t("setlists.position", {
                            position: setlist.position,
                          })}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <p className="text-muted-foreground text-xs">
            {t("created")} <ClientDate value={song.created_at} />
          </p>
        </div>
      </div>

      {canEdit && (
        <SongDialog
          key={isEditing ? "open" : "closed"}
          song={song}
          artists={artists}
          isOpen={isEditing}
          onClose={() => setIsEditing(false)}
          lockArtist={!!song.band_id}
        />
      )}

      <SongPdfDialog
        songId={song.id}
        songTitle={song.title}
        isOpen={isPdfOpen}
        onClose={() => setIsPdfOpen(false)}
        canUseAdvanced={canUseAdvancedPdf}
      />

      <Dialog open={isDeleting} onOpenChange={setIsDeleting}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tSongs("dialog.deleteTitle")}</DialogTitle>
            <DialogDescription>
              {tSongs("dialog.deleteConfirm", { title: song.title })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setIsDeleting(false)}
              disabled={isPending}
            >
              {tCommon("cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={isPending}
            >
              {isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
              )}
              {tSongs("dialog.moveToTrash")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
