"use client";

import { useState, useTransition, useMemo } from "react";
import { Song, Artist } from "@/types/api";
import { deleteSong } from "../actions";
import { SongDialog } from "./song-dialog";
import { SearchInput } from "@/components/ui/search-input";
import { SortableColumnHeader } from "@/components/ui/sortable-column-header";
import { useTableControls } from "@/hooks/use-table-controls";
import { useTranslations } from "next-intl";
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
import { MoreHorizontal, Plus, Pencil, Trash2, FileEdit } from "lucide-react";
import { toast } from "sonner";
import { TablePagination } from "@/components/ui/table-pagination";
import { Link } from "@/i18n/routing";

const SEARCHABLE_KEYS = ["title", "artist_name", "genre"] as const;

interface SongsTableProps {
  initialSongs: Song[];
  artists: Artist[];
}

export function SongsTable({ initialSongs, artists }: SongsTableProps) {
  const t = useTranslations("songs");
  const tCommon = useTranslations("common");

  const [isPending, startTransition] = useTransition();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSong, setEditingSong] = useState<Song | null>(null);

  const [songToDelete, setSongToDelete] = useState<string | null>(null);

  const songsWithArtistName = useMemo(() => {
    const getArtistName = (artistId: string) =>
      artists.find((a) => a.id === artistId)?.name ?? "—";

    return initialSongs.map((song) => ({
      ...song,
      artist_name: getArtistName(song.artist_id),
    }));
  }, [initialSongs, artists]);

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
        toast.error(result.error ?? t("dialog.deleteFailed"));
      } else {
        toast.success(t("dialog.deleted"));
      }
      setSongToDelete(null);
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          {t("addSong")}
        </Button>
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
                <TableCell
                  colSpan={6}
                  className="text-muted-foreground h-24 text-center"
                >
                  {search ? t("emptySearch", { search }) : t("empty")}
                </TableCell>
              </TableRow>
            ) : (
              songs.map((song) => (
                <TableRow key={song.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {song.title}
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
                    {song.genre ?? "—"}
                  </TableCell>
                  <TableCell className="hidden font-mono text-xs sm:table-cell">
                    {song.tempo ?? "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
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
