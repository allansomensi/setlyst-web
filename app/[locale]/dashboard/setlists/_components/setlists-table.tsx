"use client";

import { useMemo, useState, useTransition, type ReactNode } from "react";
import { useAppRouter } from "@/hooks/use-app-router";
import { QuotaReport, Setlist } from "@/types/api";
import {
  deleteSetlist,
  duplicateSetlist,
  favoriteSetlist,
  unfavoriteSetlist,
} from "../actions";
import { SetlistDialog } from "./setlists-dialog";
import { ImportSharedButton } from "@/components/shared-files/import-shared-dialog";
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
  UsersRound,
} from "lucide-react";
import { toast } from "@/lib/toast";
import { toastMovedToTrash } from "@/components/content/trash-toast";
import { PinButton } from "@/components/content/pin-button";
import { setlistDisplayTitle } from "@/lib/repertoire";
import { toastActionError } from "@/lib/action-toast";
import { TablePagination } from "@/components/ui/table-pagination";
import { Link } from "@/components/nav-link";
import { useOfflineDisabled } from "@/components/offline-disabled";
import { OfflineIndicator } from "@/components/offline-indicator";
import { ClientDate } from "@/components/client-date";
import { PageHeader } from "@/components/page-header";
import { DetailBackButton, DetailHeader } from "@/components/detail-header";
import { cn, formatDuration } from "@/lib/utils";

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
  /** Shown under the page header (pending invitations), above the search. */
  notice?: ReactNode;
  /**
   * Whether "New setlist" is offered. A band member without the right to
   * manage its setlists (`manage_setlists`) would only get a refusal from
   * the API, so the buttons are hidden rather than left to fail.
   */
  canCreate?: boolean;
  /**
   * A band's page: its own title (and the way back to the band) instead
   * of the "Setlists" page header, with the actions on the same row.
   */
  heading?: {
    title: string;
    description?: string;
    backHref?: string;
    backLabel?: string;
  };
}

export function SetlistsTable({
  initialSetlists,
  bandId,
  bandsById,
  loadError,
  quotas = null,
  notice,
  canCreate = true,
  heading,
}: SetlistsTableProps) {
  const router = useAppRouter();
  const offlineDisabled = useOfflineDisabled();
  const t = useTranslations("setlists");
  const tCommon = useTranslations("common");
  const tApi = useTranslations("apiErrors");
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
    // A band's page lists that band's setlists only; the mirror has them
    // all (personal ones and every other band's).
    filter: bandId ? (setlist) => setlist.band_id === bandId : undefined,
  });
  // The repertoire is stored as "Repertoire": search and sort by the
  // translated name people actually see.
  //
  // Favourites first: that's what the star is for. The list is personal,
  // shared and band setlists concatenated, so a starred band setlist used
  // to stay at the bottom with nothing to show for the star. The sort is
  // stable (the API's order is kept within each group), and a column
  // sort the person picks still takes over.
  const availableSetlists = useMemo(
    () =>
      cachedSetlists
        .map((setlist) =>
          setlist.is_repertoire
            ? { ...setlist, title: repertoireName }
            : setlist,
        )
        // `!!`: an older offline copy may lack the field.
        .sort((a, b) => Number(!!b.is_favorite) - Number(!!a.is_favorite)),
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
      if (!result.success) {
        // The dialog stays open so the person can retry or cancel.
        toastActionError(result, result.error);
        return;
      }
      toastMovedToTrash("setlist", setlistToDelete.id, {
        message: t("dialog.deleted"),
        undoLabel: tTrash("undo"),
        restoring: tTrash("restoring"),
        restored: t("dialog.restored"),
        restoreFailed: tTrash("restoreFailed"),
      });
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
        bandId,
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
    try {
      const result = setlist.is_favorite
        ? await unfavoriteSetlist(setlist.id)
        : await favoriteSetlist(setlist.id);
      if (!result.success) {
        toastActionError(result, result.error);
      }
    } catch {
      toast.error(tApi("generic"));
    } finally {
      setFavoritePendingId(null);
    }
  };

  const headerActions =
    quota || !bandId || canCreate ? (
      <>
        <QuotaChip usage={quota} resource="setlists" />
        {!bandId && <ImportSharedButton kind="setlist" disabled={quotaFull} />}
        {canCreate && (
          <Button
            onClick={() => handleOpenDialog()}
            {...offlineDisabled}
            disabled={offlineDisabled.disabled || quotaFull}
          >
            <Plus className="mr-2 h-4 w-4" aria-hidden />
            {t("addSetlist")}
          </Button>
        )}
      </>
    ) : undefined;

  return (
    <div className="space-y-6">
      {heading ? (
        // A band's page: back to the band, its title, and the band's
        // "New setlist" on the title's row (it used to float alone on a
        // row of its own between the title and the search).
        <DetailHeader actions={headerActions}>
          {heading.backHref && (
            <DetailBackButton
              href={heading.backHref}
              label={heading.backLabel ?? heading.title}
            />
          )}
          <div className="min-w-0 space-y-1">
            <h1 className="text-2xl font-bold tracking-tight break-words sm:text-3xl">
              {heading.title}
            </h1>
            {heading.description && (
              <p className="text-muted-foreground max-w-2xl text-pretty">
                {heading.description}
              </p>
            )}
          </div>
        </DetailHeader>
      ) : (
        <PageHeader
          title={t("title")}
          description={t("subtitle")}
          actions={headerActions}
        />
      )}
      <QuotaLimitNotice usage={quota} resource="setlists" className="-mt-3" />
      {notice}

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
          "bg-card overflow-hidden rounded-xl border shadow-(--shadow-surface)",
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
              {/* Songs and running time, the two things that tell one
                  setlist from another at a glance. They replace a
                  "Description" column that was an em dash on almost every
                  row; a description now sits under the title instead. */}
              <SortableColumnHeader
                label={t("table.songs")}
                sortKey="song_count"
                sortConfig={sortConfig}
                onSort={handleSort}
                className="hidden md:table-cell"
              />
              <SortableColumnHeader
                label={t("table.duration")}
                sortKey="total_duration"
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
                <TableCell colSpan={5} className="h-24 text-center">
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
                        canCreate ? (
                          <Button
                            onClick={() => handleOpenDialog()}
                            {...offlineDisabled}
                            disabled={offlineDisabled.disabled || quotaFull}
                          >
                            <Plus className="mr-2 h-4 w-4" aria-hidden />
                            {t("addSetlist")}
                          </Button>
                        ) : undefined
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
                // Someone else's setlist shared with this account: a
                // manager edits its details, nobody but the owner deletes.
                const sharedRole = setlist.collaborator_role;
                const canManage = sharedRole
                  ? false
                  : !isBandSetlist || bandInfo?.canManage === true;
                const canEdit = canManage || sharedRole === "manager";

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
                    <TableCell className="w-full max-w-0">
                      <div className="flex min-w-0 items-center gap-2">
                        <button
                          type="button"
                          data-no-row-click
                          onClick={() => handleToggleFavorite(setlist)}
                          disabled={
                            offlineDisabled.disabled ||
                            favoritePendingId === setlist.id
                          }
                          // A real tap target (it was the 16px star alone),
                          // the same as the band cards' star; -mx-2 keeps the
                          // row's layout as it was.
                          className="text-muted-foreground focus-visible:ring-ring/50 -mx-2 flex size-8 shrink-0 items-center justify-center rounded-md outline-none hover:text-yellow-500 focus-visible:ring-3 disabled:opacity-50 pointer-coarse:size-10"
                          // Offline, the tooltip says why it's off instead.
                          // Says what the star does (keeps the setlist at
                          // the top of this list), so it doesn't read as a
                          // second pin: the pin puts it on the home page.
                          title={
                            offlineDisabled.title ??
                            (setlist.is_favorite
                              ? t("unfavorite")
                              : t("favoriteHint"))
                          }
                          aria-label={
                            setlist.is_favorite
                              ? t("unfavorite")
                              : t("favorite")
                          }
                          aria-pressed={setlist.is_favorite}
                        >
                          <Star
                            aria-hidden
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
                          // Truncated beside the badges on narrow screens.
                          title={setlist.title}
                          className="focus-visible:ring-ring min-w-0 truncate rounded-sm font-medium group-hover:underline focus-visible:ring-2 focus-visible:outline-none"
                        >
                          {setlist.title}
                        </Link>
                        <OfflineIndicator kind="setlist" id={setlist.id} />
                        {/* The tags give way to the title on a phone; the
                            line under it says the same in fewer pixels. */}
                        {setlist.is_repertoire && (
                          <Badge
                            variant="secondary"
                            className="hidden text-xs sm:inline-flex"
                            title={t("repertoire.tooltip")}
                          >
                            {t("repertoire.badge")}
                          </Badge>
                        )}
                        {/* Not on the band's own page, where every row
                            would repeat the name in the title above. */}
                        {isBandSetlist && !bandId && (
                          <Badge
                            variant="outline"
                            className="hidden gap-1 text-xs font-normal sm:inline-flex"
                            title={t("bandSetlistTooltip", {
                              name: bandInfo?.name ?? "",
                            })}
                          >
                            <Guitar className="h-3 w-3" />
                            <span className="max-w-32 truncate">
                              {bandInfo?.name ?? t("bandSetlist")}
                            </span>
                          </Badge>
                        )}
                        {sharedRole ? (
                          <Badge
                            variant="outline"
                            className="hidden gap-1 text-xs font-normal sm:inline-flex"
                            title={t("collaborators.sharedByTooltip", {
                              username: setlist.owner_username ?? "",
                              role: t(`collaborators.roles.${sharedRole}`),
                            })}
                          >
                            <UsersRound className="h-3 w-3" aria-hidden />
                            <span className="max-w-40 truncate">
                              {t("collaborators.sharedBy", {
                                username: setlist.owner_username ?? "",
                              })}
                            </span>
                          </Badge>
                        ) : (
                          !!setlist.collaborator_count && (
                            <Badge
                              variant="secondary"
                              className="gap-1 text-xs font-normal"
                              title={t("collaborators.countTooltip", {
                                count: setlist.collaborator_count,
                              })}
                            >
                              <UsersRound className="h-3 w-3" aria-hidden />
                              {setlist.collaborator_count}
                            </Badge>
                          )
                        )}
                        <ChevronRight className="text-muted-foreground h-3.5 w-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
                      </div>
                      <SetlistMetaLine
                        setlist={setlist}
                        bandName={
                          isBandSetlist && !bandId ? bandInfo?.name : undefined
                        }
                      />
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden text-sm tabular-nums md:table-cell">
                      {setlist.song_count ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden font-mono text-sm tabular-nums md:table-cell">
                      {setlist.total_duration
                        ? formatDuration(setlist.total_duration)
                        : "—"}
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
                              disabled={
                                isDuplicating || offlineDisabled.disabled
                              }
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDuplicate(setlist);
                              }}
                            >
                              <Copy className="mr-2 h-4 w-4" />
                              {t("menu.duplicate")}
                            </DropdownMenuItem>
                            {canEdit && (
                              <>
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenDialog(setlist);
                                  }}
                                  disabled={offlineDisabled.disabled}
                                >
                                  <Pencil className="mr-2 h-4 w-4" />
                                  {t("menu.edit")}
                                </DropdownMenuItem>
                                {canManage && !setlist.is_repertoire && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteClick(setlist);
                                      }}
                                      variant="destructive"
                                      disabled={offlineDisabled.disabled}
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

/**
 * The line under a setlist's title: its description, when it has one,
 * and on a phone (where the songs and duration columns and the tags are
 * hidden) how many songs, how long, and whose. Indented to line up with
 * the title, past the star and the icon.
 */
function SetlistMetaLine({
  setlist,
  bandName,
}: {
  setlist: Setlist;
  bandName?: string;
}) {
  const t = useTranslations("setlists");
  const compact = [
    setlist.song_count != null
      ? t("songCount", { count: setlist.song_count })
      : null,
    setlist.total_duration ? formatDuration(setlist.total_duration) : null,
    bandName ?? null,
    setlist.collaborator_role
      ? t("collaborators.sharedBy", { username: setlist.owner_username ?? "" })
      : null,
  ].filter(Boolean);
  const description = setlist.description?.trim();
  if (compact.length === 0 && !description) return null;

  return (
    <p
      className={cn(
        "text-muted-foreground mt-0.5 truncate pl-12 text-xs pointer-coarse:pl-14",
        !description && "md:hidden",
      )}
    >
      {compact.length > 0 && (
        <span className="md:hidden">
          {compact.join(" · ")}
          {description && " · "}
        </span>
      )}
      {description && <span title={description}>{description}</span>}
    </p>
  );
}
