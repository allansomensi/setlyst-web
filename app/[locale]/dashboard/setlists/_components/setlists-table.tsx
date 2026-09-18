"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Setlist } from "@/types/api";
import {
  deleteSetlist,
  duplicateSetlist,
  favoriteSetlist,
  unfavoriteSetlist,
} from "../actions";
import { SetlistDialog } from "./setlists-dialog";
import { SearchInput } from "@/components/ui/search-input";
import { SortableColumnHeader } from "@/components/ui/sortable-column-header";
import { useTableControls } from "@/hooks/use-table-controls";
import { useTranslations, useLocale } from "next-intl";
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
  ListMusic,
  ChevronRight,
  Guitar,
  Copy,
  Star,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { TablePagination } from "@/components/ui/table-pagination";
import { Link } from "@/i18n/routing";

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
}

export function SetlistsTable({
  initialSetlists,
  bandId,
  bandsById,
}: SetlistsTableProps) {
  const router = useRouter();
  const t = useTranslations("setlists");
  const tCommon = useTranslations("common");
  const locale = useLocale();

  const [isPending, startTransition] = useTransition();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSetlist, setEditingSetlist] = useState<Setlist | null>(null);

  const [setlistToDelete, setSetlistToDelete] = useState<Setlist | null>(null);
  const [isDuplicating, startDuplicateTransition] = useTransition();
  const [favoritePendingId, setFavoritePendingId] = useState<string | null>(
    null,
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
    totalItems,
  } = useTableControls(initialSetlists, SEARCHABLE_KEYS);

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
        toast.success(t("dialog.deleted"));
      } else {
        toast.error(result.error);
      }
      setSetlistToDelete(null);
    });
  };

  const handleDuplicate = (setlist: Setlist) => {
    startDuplicateTransition(async () => {
      const result = await duplicateSetlist(
        setlist.id,
        t("dialog.copyTitle", { title: setlist.title }),
      );
      if (result.success) {
        toast.success(t("dialog.duplicated"));
      } else {
        toast.error(result.error);
      }
    });
  };

  const handleToggleFavorite = async (setlist: Setlist) => {
    setFavoritePendingId(setlist.id);
    const result = setlist.is_favorite
      ? await unfavoriteSetlist(setlist.id)
      : await favoriteSetlist(setlist.id);
    if (!result.success) {
      toast.error(result.error);
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
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          {t("addSetlist")}
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
        className={cn(
          "bg-background rounded-md border",
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
                <TableCell
                  colSpan={4}
                  className="text-muted-foreground h-24 text-center"
                >
                  {search ? t("emptySearch", { search }) : t("empty")}
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
                        >
                          <Star
                            className={cn(
                              "h-4 w-4",
                              setlist.is_favorite &&
                                "fill-yellow-400 text-yellow-500",
                            )}
                          />
                        </button>
                        <ListMusic className="text-muted-foreground h-4 w-4 shrink-0" />
                        <span className="font-medium group-hover:underline">
                          {setlist.title}
                        </span>
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
                      {new Date(setlist.created_at).toLocaleDateString(locale)}
                    </TableCell>
                    <TableCell className="text-right" data-no-row-click>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="h-4 w-4" />
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
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteClick(setlist);
                                }}
                                className="text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                {t("menu.delete")}
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          {tCommon("showing", {
            count: setlists.length,
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

      <SetlistDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        setlist={editingSetlist}
        bandId={editingSetlist ? (editingSetlist.band_id ?? undefined) : bandId}
      />

      <Dialog
        open={!!setlistToDelete}
        onOpenChange={(open) => !open && setSetlistToDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tCommon("delete")}</DialogTitle>
            <DialogDescription>{t("dialog.deleteConfirm")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setSetlistToDelete(null)}
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
