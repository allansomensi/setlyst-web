"use client";

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
import {
  QuotaChip,
  QuotaLimitNotice,
  quotaState,
  quotaUsageOf,
} from "@/components/quota-usage-list";
import { useOfflineDisabled } from "@/components/offline-disabled";
import {
  Disc3,
  MoreHorizontal,
  Plus,
  Pencil,
  SearchX,
  Trash2,
} from "lucide-react";
import { toastActionError } from "@/lib/action-toast";
import { toastMovedToTrash } from "@/components/content/trash-toast";
import { TablePagination } from "@/components/ui/table-pagination";
import { ClientDate } from "@/components/client-date";

const SEARCHABLE_KEYS = ["name"] as const;

interface ArtistsTableProps {
  initialArtists: Artist[];
  /** `GET /users/me/quotas`, for the usage chip next to "New artist". */
  quotas?: QuotaReport | null;
}

export function ArtistsTable({
  initialArtists,
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
  } = useTableControls(initialArtists, SEARCHABLE_KEYS);

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
        toastActionError(result, result.error ?? t("dialog.deleteFailed"));
      } else {
        toastMovedToTrash("artist", artistToDelete, {
          message: t("dialog.deleted"),
          undoLabel: tTrash("undo"),
          restoring: tTrash("restoring"),
          restored: t("dialog.restored"),
          restoreFailed: tTrash("restoreFailed"),
        });
      }
      setArtistToDelete(null);
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
          <QuotaChip usage={quota} resource="artists" />
          <Button
            onClick={() => handleOpenDialog()}
            {...offlineDisabled}
            disabled={offlineDisabled.disabled || quotaFull}
          >
            <Plus className="mr-2 h-4 w-4" aria-hidden />
            {t("addArtist")}
          </Button>
        </div>
      </div>
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
        className={`bg-card rounded-md border ${isPending ? "pointer-events-none opacity-60" : ""}`}
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
                label={t("table.registeredOn")}
                sortKey="created_at"
                sortConfig={sortConfig}
                onSort={handleSort}
              />
              <TableHead className="text-right">{t("table.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {artists.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="h-24 text-center">
                  {search ? (
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
                  <TableCell className="font-medium">{artist.name}</TableCell>
                  <TableCell>
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
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          {tCommon("edit")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDeleteClick(artist.id)}
                          variant="destructive"
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
