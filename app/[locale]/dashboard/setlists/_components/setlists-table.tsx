"use client";

import { useMemo, useState, useTransition } from "react";
import { useAppRouter } from "@/hooks/use-app-router";
import { QuotaReport, Setlist } from "@/types/api";
import {
  deleteSetlist,
  duplicateSetlist,
  favoriteSetlist,
  unfavoriteSetlist,
} from "../actions";
import { SetlistDialog } from "./setlists-dialog";
import { SearchInput } from "@/components/ui/search-input";
import { LoadErrorNotice } from "@/components/load-error-notice";
import { SortableColumnHeader } from "@/components/ui/sortable-column-header";
import { useTableControls } from "@/hooks/use-table-controls";
import { useOfflineSetlists } from "@/hooks/use-offline-library";
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
import { ConfirmActionDialog } from "@/components/ui/confirm-action-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import {
  QuotaChip,
  QuotaLimitNotice,
  quotaState,
  quotaUsageOf,
} from "@/components/quota-usage-list";
import {
  MoreHorizontal,
  Plus,
  Pencil,
  Trash2,
  ListMusic,
  ChevronRight,
  Guitar,
  Copy,
  Star,
  Library,
  SearchX,
} from "lucide-react";
import { toast } from "@/lib/toast";
import { toastMovedToTrash } from "@/components/content/trash-toast";
import { PinButton } from "@/components/content/pin-button";
import { setlistDisplayTitle } from "@/lib/repertoire";
import { toastActionError } from "@/lib/action-toast";
import { cn } from "@/lib/utils";
import { TablePagination } from "@/components/ui/table-pagination";
import { Link } from "@/components/nav-link";
import { useOfflineDisabled } from "@/components/offline-disabled";
import { OfflineIndicator } from "@/components/offline-indicator";
import { ClientDate } from "@/components/client-date";

const SEARCHABLE_KEYS = ["title", "description"] as const;

interface BandLookupEntry {
  name: string;
  canManage: boolean;
}

interface SetlistsTableProps {
  initialSetlists: Setlist[];
  /** Target band for setlists created from this table. Omit for personal setlists. */
  bandId?: string;
  /**
   * Context for any band-owned setlist in `initialSetlists` (e.g. band name,
   * whether the current user is allowed to edit/delete it). A setlist with a
   * `band_id` missing from this map is treated as non-manageable.
   */
  bandsById?: Record<string, BandLookupEntry>;
  /**
   * True when the page's server-side fetch failed rather than genuinely
   * returning zero setlists. Shows a retrying state instead of the "no
   * setlists yet" empty state so a transient failure never looks like an
   * empty account. See components/load-error-notice.tsx.
   */
  loadError?: boolean;
  /**
   * `GET /users/me/quotas`, for the usage chip next to "New setlist"
   * (personal setlists only; a band's limit is per band).
   */
  quotas?: QuotaReport | null;
}

export function SetlistsTable({
  initialSetlists,
  bandId,
  bandsById,
  loadError,
  quotas = null,
}: SetlistsTableProps) {
  const router = useAppRouter();
  const offlineDisabled = useOfflineDisabled();
  const t = useTranslations("setlists");
  const tCommon = useTranslations("common");
  const tTrash = useTranslations("trash");
  const repertoireName = t("repertoire.name");
  const quota = bandId ? null : quotaUsageOf(quotas, "setlists");
  const quotaFull = quotaState(quota).full;

  const [isPending, startTransition] = useTransition();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSetlist, setEditingSetlist] = useState<Setlist | null>(null);

  const [setlistToDelete, setSetlistToDelete] = useState<Setlist | null>(null);
  const [isDuplicating, startDuplicateTransition] = useTransition();
  const [favoritePendingId, setFavoritePendingId] = useState<string | null>(
    null,
  );

  // Falls back to the on-device copy when there's no connection, or when
  // the page's own fetch failed — so this list is never blank at a venue,
  // and a transient API failure shows the library instead of an error.
  // See hooks/use-offline-records.ts.
  const { records: cachedSetlists, isFromCache } = useOfflineSetlists({
    fallback: initialSetlists,
    loadError,
  });
  // The repertoire is stored as "Repertoire": search and sort by the
  // translated name people actually see.
  const availableSetlists = useMemo(
    () =>
      cachedSetlists.map((setlist) =>
        setlist.is_repertoire ? { ...setlist, title: repertoireName } : setlist,
      ),
    [cachedSetlists, repertoireName],
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
  } = useTableControls(availableSetlists, SEARCHABLE_KEYS);

  const setlists = processedData;

  const handleOpenDialog = (setlist?: Setlist) => {
    setEditingSetlist(setlist ?? null);
    setIsDialogOpen(true);
  };

  const handleDeleteClick = (setlist: Setlist) => {
    setSetlistToDelete(setlist);
  };

  const confirmDelete = () => {
    if (!setlistToDelete) return;
    startTransition(async () => {
      const result = await deleteSetlist(
        setlistToDelete.id,
        setlistToDelete.band_id ?? undefined,
      );
      if (result.success) {
        toastMovedToTrash("setlist", setlistToDelete.id, {
          message: t("dialog.deleted"),
          undoLabel: tTrash("undo"),
          restoring: tTrash("restoring"),
          restored: t("dialog.restored"),
          restoreFailed: tTrash("restoreFailed"),
        });
      } else {
        toastActionError(result, result.error);
      }
      setSetlistToDelete(null);
    });
  };

  const handleDuplicate = (setlist: Setlist) => {
    startDuplicateTransition(async () => {
      const result = await duplicateSetlist(
        setlist.id,
        t("dialog.copyTitle", {
          title: setlistDisplayTitle(setlist, repertoireName),
        }),
      );
      if (result.success) {
        const skipped = result.data?.skipped_band_songs ?? 0;
        if (skipped > 0) {
          toast.info(t("dialog.duplicatedSkipped", { count: skipped }), {
            duration: 10000,
          });
        } else {
          toast.success(t("dialog.duplicated"));
        }
      } else {
        toastActionError(result, result.error);
      }
    });
  };

  const handleToggleFavorite = async (setlist: Setlist) => {
    setFavoritePendingId(setlist.id);
    const result = setlist.is_favorite
      ? await unfavoriteSetlist(setlist.id)
      : await favoriteSetlist(setlist.id);
    if (!result.success) {
      toastActionError(result, result.error);
    }
    setFavoritePendingId(null);
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
          <QuotaChip usage={quota} resource="setlists" />
          <Button
            onClick={() => handleOpenDialog()}
            {...offlineDisabled}
            disabled={offlineDisabled.disabled || quotaFull}
          >
            <Plus className="mr-2 h-4 w-4" aria-hidden />
            {t("addSetlist")}
          </Button>
        </div>
      </div>
      <QuotaLimitNotice usage={quota} resource="setlists" className="-mt-3" />

      {/* Search */}
      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder={t("searchPlaceholder")}
        className="max-w-sm"
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
                label={t("table.description")}
                sortKey="description"
                sortConfig={sortConfig}
                onSort={handleSort}
                className="hidden md:table-cell"
              />
              <SortableColumnHeader
                label={t("table.createdAt")}
                sortKey="created_at"
                sortConfig={sortConfig}
                onSort={handleSort}
                className="hidden sm:table-cell"
              />
              <TableHead className="w-12 text-right">
                {t("table.actions")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {setlists.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  {/* Only a failure we couldn't paper over with the local
                      copy is worth showing as one — see isFromCache. */}
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
                      icon={ListMusic}
                      title={t("emptyState.title")}
                      description={t("emptyState.description")}
                      actions={
                        <Button
                          onClick={() => handleOpenDialog()}
                          {...offlineDisabled}
                          disabled={offlineDisabled.disabled || quotaFull}
                        >
                          <Plus className="mr-2 h-4 w-4" aria-hidden />
                          {t("addSetlist")}
                        </Button>
                      }
                    />
                  )}
                </TableCell>
              </TableRow>
            ) : (
              setlists.map((setlist) => {
                const bandInfo = setlist.band_id
                  ? bandsById?.[setlist.band_id]
                  : undefined;
                const isBandSetlist = !!setlist.band_id;
                const canManage =
                  !isBandSetlist || bandInfo?.canManage === true;

                return (
                  <TableRow
                    key={setlist.id}
                    className="group cursor-pointer"
                    onClick={(e) => {
                      if (
                        (e.target as HTMLElement).closest("[data-no-row-click]")
                      )
                        return;
                      router.push(`/dashboard/setlists/${setlist.id}`);
                    }}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          data-no-row-click
                          onClick={() => handleToggleFavorite(setlist)}
                          disabled={favoritePendingId === setlist.id}
                          className="text-muted-foreground shrink-0 hover:text-yellow-500 disabled:opacity-50"
                          title={
                            setlist.is_favorite
                              ? t("unfavorite")
                              : t("favorite")
                          }
                          aria-label={
                            setlist.is_favorite
                              ? t("unfavorite")
                              : t("favorite")
                          }
                          aria-pressed={setlist.is_favorite}
                        >
                          <Star
                            className={cn(
                              "h-4 w-4",
                              setlist.is_favorite &&
                                "fill-yellow-400 text-yellow-500",
                            )}
                          />
                        </button>
                        {setlist.is_repertoire ? (
                          <Library className="text-primary h-4 w-4 shrink-0" />
                        ) : (
                          <ListMusic className="text-muted-foreground h-4 w-4 shrink-0" />
                        )}
                        <Link
                          href={`/dashboard/setlists/${setlist.id}`}
                          data-no-row-click
                          className="focus-visible:ring-ring rounded-sm font-medium group-hover:underline focus-visible:ring-2 focus-visible:outline-none"
                        >
                          {setlist.title}
                        </Link>
                        <OfflineIndicator kind="setlist" id={setlist.id} />
                        {setlist.is_repertoire && (
                          <Badge
                            variant="secondary"
                            className="text-xs"
                            title={t("repertoire.tooltip")}
                          >
                            {t("repertoire.badge")}
                          </Badge>
                        )}
                        {isBandSetlist && (
                          <Badge
                            variant="outline"
                            className="gap-1 text-xs font-normal"
                            title={t("bandSetlistTooltip", {
                              name: bandInfo?.name ?? "",
                            })}
                          >
                            <Guitar className="h-3 w-3" />
                            {bandInfo?.name ?? t("bandSetlist")}
                          </Badge>
                        )}
                        <ChevronRight className="text-muted-foreground h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
                      </div>
                    </TableCell>
                    <TableCell
                      className="text-muted-foreground hidden max-w-xs truncate text-sm md:table-cell"
                      title={setlist.description ?? ""}
                    >
                      {setlist.description ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden text-sm sm:table-cell">
                      <ClientDate value={setlist.created_at} />
                    </TableCell>
                    <TableCell className="text-right" data-no-row-click>
                      <div className="flex items-center justify-end gap-0.5">
                        <PinButton
                          type="setlist"
                          id={setlist.id}
                          name={setlist.title}
                          pinned={!!setlist.is_pinned}
                          className="hidden sm:inline-flex"
                        />
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => e.stopPropagation()}
                              aria-label={tCommon("moreActionsFor", {
                                name: setlist.title,
                              })}
                            >
                              <MoreHorizontal className="h-4 w-4" aria-hidden />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" data-no-row-click>
                            <DropdownMenuItem asChild>
                              <Link href={`/dashboard/setlists/${setlist.id}`}>
                                <ListMusic className="mr-2 h-4 w-4" />
                                {t("menu.manageSongs")}
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              disabled={isDuplicating}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDuplicate(setlist);
                              }}
                            >
                              <Copy className="mr-2 h-4 w-4" />
                              {t("menu.duplicate")}
                            </DropdownMenuItem>
                            {canManage && (
                              <>
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenDialog(setlist);
                                  }}
                                >
                                  <Pencil className="mr-2 h-4 w-4" />
                                  {t("menu.edit")}
                                </DropdownMenuItem>
                                {!setlist.is_repertoire && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteClick(setlist);
                                      }}
                                      variant="destructive"
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      {t("menu.delete")}
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
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

      <SetlistDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        setlist={editingSetlist}
        bandId={editingSetlist ? (editingSetlist.band_id ?? undefined) : bandId}
      />

      <ConfirmActionDialog
        open={!!setlistToDelete}
        onOpenChange={(open) => !open && setSetlistToDelete(null)}
        title={t("dialog.deleteTitle")}
        description={t("dialog.deleteConfirm", {
          title: setlistToDelete?.title ?? "",
        })}
        confirmLabel={t("dialog.moveToTrash")}
        onConfirm={confirmDelete}
        pending={isPending}
      />
    </div>
  );
}
