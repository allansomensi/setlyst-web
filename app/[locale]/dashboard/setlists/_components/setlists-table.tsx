"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Setlist } from "@/types/api";
import { deleteSetlist } from "../actions";
import { SetlistDialog } from "./setlists-dialog";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal,
  Plus,
  Pencil,
  Trash2,
  ListMusic,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { TablePagination } from "@/components/ui/table-pagination";
import { Link } from "@/i18n/routing";

const SEARCHABLE_KEYS = ["title", "description"] as const;

interface SetlistsTableProps {
  initialSetlists: Setlist[];
}

export function SetlistsTable({ initialSetlists }: SetlistsTableProps) {
  const router = useRouter();
  const t = useTranslations("setlists");
  const tCommon = useTranslations("common");

  const [isPending, startTransition] = useTransition();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSetlist, setEditingSetlist] = useState<Setlist | null>(null);

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

  const handleDelete = (id: string) => {
    if (!confirm(t("dialog.deleteConfirm"))) return;
    startTransition(async () => {
      const result = await deleteSetlist(id);
      if (result.success) {
        toast.success(t("dialog.deleted"));
      } else {
        toast.error(result.error);
      }
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
              setlists.map((setlist) => (
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
                      <ListMusic className="text-muted-foreground h-4 w-4 shrink-0" />
                      <span className="font-medium group-hover:underline">
                        {setlist.title}
                      </span>
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
                    {new Date(setlist.created_at).toLocaleDateString("en-US")}
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
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/setlists/${setlist.id}`}>
                            <ListMusic className="mr-2 h-4 w-4" />
                            {t("menu.manageSongs")}
                          </Link>
                        </DropdownMenuItem>
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
                            handleDelete(setlist.id);
                          }}
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
      />
    </div>
  );
}
