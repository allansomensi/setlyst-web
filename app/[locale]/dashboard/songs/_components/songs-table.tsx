"use client";

import { useState, useTransition, useMemo } from "react";
import { useAppRouter } from "@/hooks/use-app-router";
import { Song, Artist, formatGenre } from "@/types/api";
import { deleteSong } from "../actions";
import { SongDialog } from "./song-dialog";
import { SearchInput } from "@/components/ui/search-input";
import { LoadErrorNotice } from "@/components/load-error-notice";
import { SortableColumnHeader } from "@/components/ui/sortable-column-header";
import { useTableControls } from "@/hooks/use-table-controls";
import {
  useOfflineArtists,
  useOfflineSongs,
} from "@/hooks/use-offline-library";
import { useTranslations } from "next-intl";
import { OfflineIndicator } from "@/components/offline-indicator";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import {
  MoreHorizontal,
  Plus,
  Pencil,
  Trash2,
  FileEdit,
  Loader2,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { toastActionError } from "@/lib/action-toast";
import { TablePagination } from "@/components/ui/table-pagination";
import { Link } from "@/components/nav-link";
import { useOfflineDisabled } from "@/components/offline-disabled";
import { useSession } from "next-auth/react";

const SEARCHABLE_KEYS = ["title", "artist_name", "genre"] as const;

interface SongsTableProps {
  initialSongs: Song[];
  artists: Artist[];
  /**
   * True when the page's server-side fetch failed rather than genuinely
   * returning zero songs. Shows a retrying state instead of the "no songs
   * yet" empty state so a transient failure never looks like an empty
   * account. See components/load-error-notice.tsx.
   */
  loadError?: boolean;
}

export function SongsTable({
  initialSongs,
  artists,
  loadError,
}: SongsTableProps) {
  const t = useTranslations("songs");
  const tCommon = useTranslations("common");
  const { data: session } = useSession();
  const router = useAppRouter();
  const offlineDisabled = useOfflineDisabled();

  const [isPending, startTransition] = useTransition();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSong, setEditingSong] = useState<Song | null>(null);
  const [songToDelete, setSongToDelete] = useState<string | null>(null);

  const [isExporting, setIsExporting] = useState(false);

  // See hooks/use-offline-records.ts: with no connection, or when this
  // page's own fetch failed, both lists come from the on-device mirror
  // instead of the (empty or stale) server-rendered props.
  const { records: availableSongs, isFromCache } = useOfflineSongs({
    fallback: initialSongs,
    loadError,
  });
  const { records: availableArtists } = useOfflineArtists({
    fallback: artists,
    loadError,
  });

  const songsWithArtistName = useMemo(() => {
    const getArtistName = (artistId: string) =>
      availableArtists.find((a) => a.id === artistId)?.name ?? "—";

    return availableSongs.map((song) => ({
      ...song,
      artist_name: getArtistName(song.artist_id),
    }));
  }, [availableSongs, availableArtists]);

  const {
    search,
    setSearch,
    sortConfig,
    handleSort,
    processedData,
    currentPage,
    totalPages,
    setCurrentPage,
    totalItems,
  } = useTableControls(songsWithArtistName, SEARCHABLE_KEYS);

  const songs = processedData;

  const handleOpenDialog = (song?: Song) => {
    setEditingSong(song ?? null);
    setIsDialogOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setSongToDelete(id);
  };

  const confirmDelete = () => {
    if (!songToDelete) return;
    startTransition(async () => {
      const result = await deleteSong(songToDelete);
      if (!result.success) {
        toastActionError(result, result.error ?? t("dialog.deleteFailed"));
      } else {
        toast.success(t("dialog.deleted"));
      }
      setSongToDelete(null);
    });
  };

  const handleExportChordpro = async () => {
    try {
      setIsExporting(true);
      const token = session?.user?.apiToken;
      const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";

      const response = await fetch(`${baseUrl}/songs/export/chordpro`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to export ChordPro");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      const disposition = response.headers.get("content-disposition");
      let filename = "setlyst-songs.cho";
      if (disposition && disposition.includes("filename=")) {
        filename = disposition.split("filename=")[1].replace(/"/g, "");
      }

      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success(t("exportSuccess"));
    } catch (error) {
      console.error(error);
      toast.error(t("exportFailed"));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Export */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={isExporting}>
                {isExporting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                <span className="hidden sm:inline">{t("export")}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem
                onClick={handleExportChordpro}
                className="cursor-pointer"
              >
                {t("exportChordpro")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button onClick={() => handleOpenDialog()} {...offlineDisabled}>
            <Plus className="mr-2 h-4 w-4" />
            {t("addSong")}
          </Button>
        </div>
      </div>

      {/* Search */}
      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder={t("searchPlaceholder")}
        className="max-w-sm"
      />

      {/* Table */}
      <div
        className={`bg-background rounded-md border ${isPending ? "pointer-events-none opacity-60" : ""}`}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <SortableColumnHeader
                label={t("table.title")}
                sortKey="title"
                sortConfig={sortConfig}
                onSort={handleSort}
              />
              <SortableColumnHeader
                label={t("table.artist")}
                sortKey="artist_name"
                sortConfig={sortConfig}
                onSort={handleSort}
              />
              <SortableColumnHeader
                label={t("table.key")}
                sortKey="tonality"
                sortConfig={sortConfig}
                onSort={handleSort}
                className="hidden md:table-cell"
              />
              <SortableColumnHeader
                label={t("table.genre")}
                sortKey="genre"
                sortConfig={sortConfig}
                onSort={handleSort}
                className="hidden lg:table-cell"
              />
              <SortableColumnHeader
                label={t("table.bpm")}
                sortKey="tempo"
                sortConfig={sortConfig}
                onSort={handleSort}
                className="hidden sm:table-cell"
              />
              <TableHead className="text-right">{t("table.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {songs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  {/* Only a failure the local copy couldn't cover. */}
                  {loadError && !isFromCache ? (
                    <LoadErrorNotice />
                  ) : (
                    <span className="text-muted-foreground">
                      {search ? t("emptySearch", { search }) : t("empty")}
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              songs.map((song) => (
                <TableRow
                  key={song.id}
                  className="cursor-pointer"
                  onClick={(e) => {
                    if (
                      (e.target as HTMLElement).closest("[data-no-row-click]")
                    )
                      return;
                    router.push(`/dashboard/songs/${song.id}/live`);
                  }}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {song.title}
                      <OfflineIndicator kind="song" id={song.id} />
                      {song.lyrics && (
                        <span
                          className="bg-primary/10 text-primary rounded px-1 py-0.5 text-[10px] font-medium"
                          title={t("dialog.lyricsTitle")}
                        >
                          {t("lyricsTag")}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{song.artist_name}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    {song.tonality ? (
                      <Badge variant="secondary" className="px-1.5 font-mono">
                        {song.tonality}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground hidden text-xs lg:table-cell">
                    {song.genre ? formatGenre(song.genre) : "—"}
                  </TableCell>
                  <TableCell className="hidden font-mono text-xs sm:table-cell">
                    {song.tempo ?? "—"}
                  </TableCell>
                  <TableCell className="text-right" data-no-row-click>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" data-no-row-click>
                        <DropdownMenuItem
                          onClick={() => handleOpenDialog(song)}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          {t("menu.editDetails")}
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/songs/${song.id}/lyrics`}>
                            <FileEdit className="mr-2 h-4 w-4" />
                            {t("menu.editLyrics")}
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDeleteClick(song.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          {t("menu.delete")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          {tCommon("showing", {
            count: songs.length,
            total: totalItems,
            entity: totalItems !== 1 ? tCommon("results") : tCommon("result"),
          })}
          {search && ` ${tCommon("showingFor", { search })}`}
        </p>

        <TablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          setCurrentPage={setCurrentPage}
        />
      </div>

      <SongDialog
        key={editingSong?.id ?? "new"}
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        song={editingSong}
        artists={artists}
      />

      <Dialog
        open={!!songToDelete}
        onOpenChange={(open) => !open && setSongToDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tCommon("delete")}</DialogTitle>
            <DialogDescription>{t("dialog.deleteConfirm")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setSongToDelete(null)}
              disabled={isPending}
            >
              {tCommon("cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={isPending}
            >
              {tCommon("delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
