"use client";

import { useState, useTransition, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useAppRouter } from "@/hooks/use-app-router";
import { Song, Artist, QuotaReport, formatGenre } from "@/types/api";
import { deleteSong } from "../actions";
import { SongDialog } from "./song-dialog";
import { TagChip } from "@/components/tags/tag-chip";
import { ManageTagsDialog } from "./manage-tags-dialog";
import { SearchInput } from "@/components/ui/search-input";
import { LoadErrorNotice } from "@/components/load-error-notice";
import { SortableColumnHeader } from "@/components/ui/sortable-column-header";
import { useTableControls } from "@/hooks/use-table-controls";
import { useSyncSearchParams } from "@/hooks/use-url-state";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmActionDialog } from "@/components/ui/confirm-action-dialog";
import {
  QuotaChip,
  QuotaLimitNotice,
  quotaState,
  quotaUsageOf,
} from "@/components/quota-usage-list";
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
import { cn } from "@/lib/utils";
import { SongsExportMenu } from "./songs-export-menu";
import { TagFilterBar } from "./tag-filter-bar";
import {
  MoreHorizontal,
  Plus,
  Pencil,
  Trash2,
  FileEdit,
  Tags,
  FileDown,
  FileMusic,
  FileUp,
  Play,
  Eye,
  Music,
  SearchX,
} from "lucide-react";
import { toastActionError } from "@/lib/action-toast";
import { toastMovedToTrash } from "@/components/content/trash-toast";
import { PinButton } from "@/components/content/pin-button";
import { EnergyMeter } from "@/components/content/energy";
import { SongPdfDialog } from "@/components/songs/song-pdf-dialog";
import { useSongChordProExport } from "@/components/songs/use-song-chordpro-export";
import { ImportChordProDialog } from "./import-chordpro-dialog";
import { TablePagination } from "@/components/ui/table-pagination";
import { Link } from "@/components/nav-link";
import { useOfflineDisabled } from "@/components/offline-disabled";

// `lyrics` too: people often remember a line, not the title.
const SEARCHABLE_KEYS = [
  "title",
  "artist_name",
  "genre",
  "tags_text",
  "lyrics_text",
] as const;

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
  /** Plan features, resolved by the page (`hasFeature`). */
  features?: { chordproImport: boolean; advancedPdf: boolean };
  /** `GET /users/me/quotas`, for the usage chip next to "Add song". */
  quotas?: QuotaReport | null;
}

export function SongsTable({
  initialSongs,
  artists,
  loadError,
  features = { chordproImport: true, advancedPdf: true },
  quotas = null,
}: SongsTableProps) {
  const t = useTranslations("songs");
  const tCommon = useTranslations("common");
  const router = useAppRouter();
  const offlineDisabled = useOfflineDisabled();

  const [isPending, startTransition] = useTransition();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSong, setEditingSong] = useState<Song | null>(null);
  const [songToDelete, setSongToDelete] = useState<Song | null>(null);
  const [pdfSong, setPdfSong] = useState<Song | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const { exportSong, pendingId: chordproPendingId } = useSongChordProExport();
  const tTrash = useTranslations("trash");

  // In the URL (`?tag=`) with the search, sort and page, so Back from a
  // song returns to the same filtered view.
  const initialTag = useSearchParams()?.get("tag") ?? null;
  const [tagFilter, setTagFilter] = useState<string | null>(initialTag);
  useSyncSearchParams({ tag: tagFilter });
  const songQuota = quotaUsageOf(quotas, "songs");
  const songsFull = quotaState(songQuota).full;
  const [managingTags, setManagingTags] = useState(false);

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
      tags_text: (song.tags ?? []).join(" "),
      // Chord brackets and directives out, so "[G]Amazing [D]grace"
      // matches "amazing grace".
      lyrics_text: (song.lyrics ?? "")
        .replace(/\[[^\]]*\]/g, "")
        .replace(/\{[^}]*\}/g, " ")
        .replace(/\s+/g, " "),
    }));
  }, [availableSongs, availableArtists]);

  // The library's tag vocabulary, most used first — quick filters here and
  // suggestions in the song dialog.
  const tagsByUse = useMemo(() => {
    const counts = new Map<string, number>();
    for (const song of availableSongs) {
      for (const tag of song.tags ?? []) {
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      }
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([tag]) => tag);
  }, [availableSongs]);

  const filteredSongs = useMemo(
    () =>
      tagFilter
        ? songsWithArtistName.filter((song) => song.tags?.includes(tagFilter))
        : songsWithArtistName,
    [songsWithArtistName, tagFilter],
  );

  const {
    search,
    setSearch,
    sortConfig,
    handleSort,
    processedData,
    currentPage,
    totalPages,
    setCurrentPage,
    pageSize,
    setPageSize,
    totalItems,
  } = useTableControls(filteredSongs, SEARCHABLE_KEYS);

  const songs = processedData;

  const clearFilters = () => {
    setSearch("");
    setTagFilter(null);
    setCurrentPage(1);
  };

  const handleOpenDialog = (song?: Song) => {
    setEditingSong(song ?? null);
    setIsDialogOpen(true);
  };

  const confirmDelete = () => {
    if (!songToDelete) return;
    const target = songToDelete;
    startTransition(async () => {
      const result = await deleteSong(target.id);
      if (!result.success) {
        toastActionError(result, result.error ?? t("dialog.deleteFailed"));
      } else {
        toastMovedToTrash("song", target.id, {
          message: t("dialog.deleted"),
          undoLabel: tTrash("undo"),
          restored: t("dialog.restored"),
          restoreFailed: tTrash("restoreFailed"),
        });
      }
      setSongToDelete(null);
    });
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
          <SongsExportMenu />

          <Button
            variant="outline"
            onClick={() => setIsImportOpen(true)}
            {...offlineDisabled}
          >
            <FileUp className="h-4 w-4 sm:mr-2" aria-hidden />
            <span className="sr-only sm:not-sr-only">
              {t("importChordpro")}
            </span>
          </Button>

          <Button
            variant="outline"
            onClick={() => setManagingTags(true)}
            {...offlineDisabled}
          >
            <Tags className="h-4 w-4 sm:mr-2" aria-hidden />
            <span className="sr-only sm:not-sr-only">{t("manageTags")}</span>
          </Button>

          <QuotaChip usage={songQuota} resource="songs" />
          <Button
            onClick={() => handleOpenDialog()}
            {...offlineDisabled}
            disabled={offlineDisabled.disabled || songsFull}
          >
            <Plus className="mr-2 h-4 w-4" aria-hidden />
            {t("addSong")}
          </Button>
        </div>
      </div>
      <QuotaLimitNotice usage={songQuota} resource="songs" className="-mt-3" />

      {/* Search */}
      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder={t("searchPlaceholder")}
        className="max-w-sm"
      />

      <TagFilterBar
        tags={tagsByUse}
        active={tagFilter}
        onChange={(tag) => {
          setTagFilter(tag);
          setCurrentPage(1);
        }}
      />

      {/* Table */}
      <div
        className={cn(
          "bg-card rounded-md border",
          isPending && "pointer-events-none opacity-60",
        )}
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
                className="hidden sm:table-cell"
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
              <SortableColumnHeader
                label={t("table.timeSignature")}
                sortKey="time_signature"
                sortConfig={sortConfig}
                onSort={handleSort}
                className="hidden xl:table-cell"
              />
              <SortableColumnHeader
                label={t("table.energy")}
                sortKey="energy"
                sortConfig={sortConfig}
                onSort={handleSort}
                className="hidden md:table-cell"
              />
              <TableHead className="text-right">{t("table.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {songs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  {/* Only a failure the local copy couldn't cover. */}
                  {loadError && !isFromCache ? (
                    <LoadErrorNotice />
                  ) : search || tagFilter ? (
                    <EmptyState
                      compact
                      icon={SearchX}
                      title={
                        search
                          ? t("emptySearch", { search })
                          : t("emptyTagFilter", { tag: tagFilter ?? "" })
                      }
                      actions={
                        <Button variant="outline" onClick={clearFilters}>
                          {search
                            ? tCommon("clearSearch")
                            : t("clearTagFilter")}
                        </Button>
                      }
                    />
                  ) : (
                    <EmptyState
                      icon={Music}
                      title={t("emptyState.title")}
                      description={t("emptyState.description")}
                      actions={
                        <>
                          <Button
                            onClick={() => handleOpenDialog()}
                            {...offlineDisabled}
                            disabled={offlineDisabled.disabled || songsFull}
                          >
                            <Plus className="mr-2 h-4 w-4" aria-hidden />
                            {t("addSong")}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => setIsImportOpen(true)}
                            {...offlineDisabled}
                          >
                            <FileUp className="mr-2 h-4 w-4" aria-hidden />
                            {t("importChordpro")}
                          </Button>
                        </>
                      }
                    />
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
                    router.push(`/dashboard/songs/${song.id}`);
                  }}
                >
                  <TableCell className="w-full max-w-0 font-medium">
                    <div className="flex min-w-0 items-center gap-2">
                      <Link
                        href={`/dashboard/songs/${song.id}`}
                        data-no-row-click
                        className="focus-visible:ring-ring block min-w-0 truncate rounded-sm hover:underline focus-visible:ring-2 focus-visible:outline-none"
                      >
                        {song.title}
                      </Link>
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
                    {song.tags?.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {song.tags.slice(0, 3).map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            data-no-row-click
                            title={t("filterByTag", { tag })}
                            onClick={() => {
                              setTagFilter(tag);
                              setCurrentPage(1);
                            }}
                            className="rounded-full focus-visible:ring-2 focus-visible:outline-none"
                          >
                            <TagChip
                              tag={tag}
                              className="hover:bg-secondary/70 h-5"
                            />
                          </button>
                        ))}
                        {song.tags.length > 3 && (
                          <span className="text-muted-foreground text-[10px]">
                            +{song.tags.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                    {/* The artist column is dropped on phones. */}
                    <p className="text-muted-foreground truncate text-xs font-normal sm:hidden">
                      {song.artist_name}
                    </p>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {song.artist_name}
                  </TableCell>
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
                  <TableCell className="text-muted-foreground hidden font-mono text-xs xl:table-cell">
                    {song.time_signature ?? "—"}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <EnergyMeter energy={song.energy} />
                  </TableCell>
                  <TableCell className="text-right" data-no-row-click>
                    <div className="flex items-center justify-end gap-0.5">
                      <PinButton
                        type="song"
                        id={song.id}
                        name={song.title}
                        pinned={!!song.is_pinned}
                        className="hidden sm:inline-flex"
                      />
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" aria-hidden />
                            <span className="sr-only">
                              {tCommon("moreActionsFor", { name: song.title })}
                            </span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" data-no-row-click>
                          <DropdownMenuItem asChild>
                            <Link href={`/dashboard/songs/${song.id}`}>
                              <Eye className="mr-2 h-4 w-4" />
                              {t("menu.details")}
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/dashboard/songs/${song.id}/live`}>
                              <Play className="mr-2 h-4 w-4" />
                              {t("menu.liveMode")}
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleOpenDialog(song)}
                            disabled={offlineDisabled.disabled}
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
                            onClick={() => setPdfSong(song)}
                            disabled={offlineDisabled.disabled}
                          >
                            <FileDown className="mr-2 h-4 w-4" />
                            {t("menu.exportPdf")}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => void exportSong(song.id, song.title)}
                            disabled={
                              offlineDisabled.disabled ||
                              chordproPendingId === song.id
                            }
                          >
                            <FileMusic className="mr-2 h-4 w-4" />
                            {t("menu.exportChordpro")}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setSongToDelete(song)}
                            variant="destructive"
                            disabled={offlineDisabled.disabled}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            {t("menu.delete")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <TablePagination
        currentPage={currentPage}
        totalPages={totalPages}
        setCurrentPage={setCurrentPage}
        totalItems={totalItems}
        pageSize={pageSize}
        setPageSize={setPageSize}
        search={search}
      />

      <ManageTagsDialog
        open={managingTags}
        onOpenChange={(open) => {
          setManagingTags(open);
          if (!open) setTagFilter(null);
        }}
      />

      <SongDialog
        key={editingSong?.id ?? "new"}
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        song={editingSong}
        artists={artists}
        tagSuggestions={tagsByUse}
      />

      <SongPdfDialog
        songId={pdfSong?.id ?? ""}
        songTitle={pdfSong?.title ?? ""}
        isOpen={!!pdfSong}
        onClose={() => setPdfSong(null)}
        canUseAdvanced={features.advancedPdf}
      />

      <ImportChordProDialog
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        artists={availableArtists}
        allowed={features.chordproImport}
      />

      <ConfirmActionDialog
        open={!!songToDelete}
        onOpenChange={(open) => !open && setSongToDelete(null)}
        title={t("dialog.deleteTitle")}
        description={t("dialog.deleteConfirm", {
          title: songToDelete?.title ?? "",
        })}
        confirmLabel={t("dialog.moveToTrash")}
        onConfirm={confirmDelete}
        pending={isPending}
      />
    </div>
  );
}
