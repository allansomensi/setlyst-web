"use client";

import { PageHeader } from "@/components/page-header";
import { useState, useTransition } from "react";
import { Artist, QuotaReport } from "@/types/api";
import { deleteArtist } from "../actions";
import { ArtistDialog } from "./artist-dialog";
import { SearchInput } from "@/components/ui/search-input";
import { SortableColumnHeader } from "@/components/ui/sortable-column-header";
import { useTableControls } from "@/hooks/use-table-controls";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmActionDialog } from "@/components/ui/confirm-action-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadErrorNotice } from "@/components/load-error-notice";
import {
  QuotaChip,
  QuotaLimitNotice,
  quotaState,
  quotaUsageOf,
} from "@/components/quota-usage-list";
import { useOfflineDisabled } from "@/components/offline-disabled";
import { useOfflineArtists } from "@/hooks/use-offline-library";
import {
  Disc3,
  MoreHorizontal,
  Music,
  Plus,
  Pencil,
  SearchX,
  Trash2,
} from "lucide-react";
import { toastActionError } from "@/lib/action-toast";
import { toastMovedToTrash } from "@/components/content/trash-toast";
import { TablePagination } from "@/components/ui/table-pagination";
import { ClientDate } from "@/components/client-date";
import { Link } from "@/components/nav-link";

const SEARCHABLE_KEYS = ["name"] as const;

interface ArtistsTableProps {
  initialArtists: Artist[];
  /**
   * True when the page's server-side fetch failed rather than genuinely
   * returning zero artists — see components/load-error-notice.tsx.
   */
  loadError?: boolean;
  /** `GET /users/me/quotas`, for the usage chip next to "New artist". */
  quotas?: QuotaReport | null;
}

export function ArtistsTable({
  initialArtists,
  loadError,
  quotas = null,
}: ArtistsTableProps) {
  const t = useTranslations("artists");
  const tCommon = useTranslations("common");
  const tTrash = useTranslations("trash");
  const offlineDisabled = useOfflineDisabled();
  const quota = quotaUsageOf(quotas, "artists");
  const quotaFull = quotaState(quota).full;

  const [isPending, startTransition] = useTransition();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingArtist, setEditingArtist] = useState<Artist | null>(null);

  const [artistToDelete, setArtistToDelete] = useState<string | null>(null);

  // As on the songs and setlists pages: with no connection, or when the
  // page's own fetch failed, the list comes from the on-device mirror
  // instead of the (empty or stale) server-rendered props. See
  // hooks/use-offline-records.ts.
  const { records: availableArtists, isFromCache } = useOfflineArtists({
    fallback: initialArtists,
    loadError,
  });

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
  } = useTableControls(availableArtists, SEARCHABLE_KEYS);

  const artists = processedData;

  const handleOpenDialog = (artist?: Artist) => {
    setEditingArtist(artist ?? null);
    setIsDialogOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setArtistToDelete(id);
  };

  const confirmDelete = () => {
    if (!artistToDelete) return;
    startTransition(async () => {
      const result = await deleteArtist(artistToDelete);
      if (!result.success) {
        // The dialog stays open so the person can retry or cancel.
        toastActionError(result, result.error ?? t("dialog.deleteFailed"));
        return;
      }
      toastMovedToTrash("artist", artistToDelete, {
        message: t("dialog.deleted"),
        undoLabel: tTrash("undo"),
        restoring: tTrash("restoring"),
        restored: t("dialog.restored"),
        restoreFailed: tTrash("restoreFailed"),
      });
      setArtistToDelete(null);
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        description={t("subtitle")}
        actions={
          <>
            <QuotaChip usage={quota} resource="artists" />
            <Button
              onClick={() => handleOpenDialog()}
              {...offlineDisabled}
              disabled={offlineDisabled.disabled || quotaFull}
            >
              <Plus className="mr-2 h-4 w-4" aria-hidden />
              {t("addArtist")}
            </Button>
          </>
        }
      />
      <QuotaLimitNotice usage={quota} resource="artists" className="-mt-3" />

      {/* Search */}
      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder={t("searchPlaceholder")}
        className="max-w-sm"
      />

      {/* Table */}
      <div
        className={`bg-card overflow-hidden rounded-xl border shadow-(--shadow-surface) ${isPending ? "pointer-events-none opacity-60" : ""}`}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <SortableColumnHeader
                label={t("table.name")}
                sortKey="name"
                sortConfig={sortConfig}
                onSort={handleSort}
              />
              <SortableColumnHeader
                label={t("table.songs")}
                sortKey="song_count"
                sortConfig={sortConfig}
                onSort={handleSort}
              />
              <SortableColumnHeader
                label={t("table.registeredOn")}
                sortKey="created_at"
                sortConfig={sortConfig}
                onSort={handleSort}
                className="hidden sm:table-cell"
              />
              <TableHead className="text-right">{t("table.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {artists.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  {/* Only a failure the local copy couldn't cover. */}
                  {loadError && !isFromCache ? (
                    <LoadErrorNotice />
                  ) : search ? (
                    <EmptyState
                      compact
                      icon={SearchX}
                      title={t("emptySearch", { search })}
                      actions={
                        <Button variant="outline" onClick={() => setSearch("")}>
                          {tCommon("clearSearch")}
                        </Button>
                      }
                    />
                  ) : (
                    <EmptyState
                      icon={Disc3}
                      title={t("emptyState.title")}
                      description={t("emptyState.description")}
                      actions={
                        <Button
                          onClick={() => handleOpenDialog()}
                          {...offlineDisabled}
                          disabled={offlineDisabled.disabled || quotaFull}
                        >
                          <Plus className="mr-2 h-4 w-4" aria-hidden />
                          {t("addArtist")}
                        </Button>
                      }
                    />
                  )}
                </TableCell>
              </TableRow>
            ) : (
              artists.map((artist) => (
                <TableRow key={artist.id}>
                  <TableCell
                    className="w-full max-w-0 truncate font-medium"
                    title={artist.name}
                  >
                    {artist.name}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {/* The artist's songs, one tap away: the songs list
                        searched by the artist's name. */}
                    {artist.song_count ? (
                      <Link
                        href={`/dashboard/songs?q=${encodeURIComponent(artist.name)}`}
                        className="text-primary focus-visible:ring-ring/50 inline-flex items-center gap-1.5 rounded-sm font-medium outline-none hover:underline focus-visible:ring-3"
                        aria-label={t("table.songsOf", { name: artist.name })}
                      >
                        <Music className="h-3.5 w-3.5" aria-hidden />
                        {artist.song_count}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground hidden sm:table-cell">
                    <ClientDate value={artist.created_at} />
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={tCommon("moreActionsFor", {
                            name: artist.name,
                          })}
                        >
                          <MoreHorizontal className="h-4 w-4" aria-hidden />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleOpenDialog(artist)}
                          disabled={offlineDisabled.disabled}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          {tCommon("edit")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDeleteClick(artist.id)}
                          variant="destructive"
                          disabled={offlineDisabled.disabled}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          {tCommon("delete")}
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

      <TablePagination
        currentPage={currentPage}
        totalPages={totalPages}
        setCurrentPage={setCurrentPage}
        totalItems={totalItems}
        pageSize={pageSize}
        setPageSize={setPageSize}
        search={search}
      />

      <ArtistDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        artist={editingArtist}
      />

      <ConfirmActionDialog
        open={!!artistToDelete}
        onOpenChange={(open) => !open && setArtistToDelete(null)}
        title={t("dialog.deleteTitle")}
        description={t("dialog.deleteConfirm")}
        confirmLabel={tCommon("delete")}
        onConfirm={confirmDelete}
        pending={isPending}
      />
    </div>
  );
}
