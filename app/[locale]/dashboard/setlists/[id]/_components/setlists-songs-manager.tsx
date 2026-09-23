"use client";

import { useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  Check,
  ChevronDown,
  Coffee,
  Layers,
  ListOrdered,
  ListPlus,
  Plus,
  Send,
  X,
} from "lucide-react";
import { DndContext, closestCenter } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useAppRouter } from "@/hooks/use-app-router";
import { Song, SetlistSong, SetlistItem, Setlist, Artist } from "@/types/api";
import { useOfflineSetlistDetail } from "@/hooks/use-offline-setlist-detail";
import { useOfflineDisabled } from "@/components/offline-disabled";
import { removeSongFromSetlist, deleteSetlistMarker } from "../../actions";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { toastActionError } from "@/lib/action-toast";
import { AddSongDialog, type AddSongBandContext } from "./add-song-dialog";
import { BlockDialog, type BlockDraft } from "./block-dialog";
import { BreakDialog, type BreakDraft } from "./break-dialog";
import { SortableBlockRow } from "./rows/block-row";
import { SortableBreakRow } from "./rows/break-row";
import { SortableSongRow } from "./rows/song-row";
import { itemsToRows, songNumbersOf, type SongRow } from "./rows/types";
import { useSetlistReorder } from "./use-setlist-reorder";

interface SetlistSongsManagerProps {
  setlistId: string;
  /** The setlist itself, needed to keep the offline mirror current. */
  setlist: Setlist;
  setlistSongs: SetlistSong[];
  setlistItems: SetlistItem[];
  allSongs: Song[];
  artists: Artist[];
  /** Band setlists: permissions and repertoire (see AddSongDialog). */
  band?: AddSongBandContext;
}

/**
 * The running order of a setlist: songs, blocks and breaks, with
 * reordering (drag or keyboard), adding and removing.
 *
 * Pieces: rows/ (one component per row kind), block-dialog, break-dialog,
 * add-song-dialog and the use-setlist-reorder hook.
 */
export function SetlistSongsManager({
  setlistId,
  setlist,
  setlistSongs,
  setlistItems,
  allSongs,
  artists,
  band,
}: SetlistSongsManagerProps) {
  const router = useAppRouter();
  const t = useTranslations("setlists.songs");
  const tCommon = useTranslations("common");
  const offlineDisabled = useOfflineDisabled();
  // Members without `manage_setlists` see the running order read-only and
  // suggest songs instead of adding them.
  const canManage = !band || band.canManage;
  const actionsDisabled = !!offlineDisabled.disabled || !canManage;

  // Offline, the running order comes from the on-device mirror rather than
  // whatever was embedded in the cached HTML (see
  // hooks/use-offline-setlist-detail.ts).
  const { songs: availableSongs, items: availableItems } =
    useOfflineSetlistDetail(setlist, {
      songs: setlistSongs,
      items: setlistItems,
    });

  const baseRows = useMemo(() => itemsToRows(availableItems), [availableItems]);
  const reorder = useSetlistReorder(setlistId, baseRows);
  const displayRows = reorder.rows;
  const songNumbers = songNumbersOf(displayRows);

  const [isPending, startTransition] = useTransition();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [songToRemove, setSongToRemove] = useState<string | null>(null);
  const [markerToDelete, setMarkerToDelete] = useState<string | null>(null);
  const [blockDraft, setBlockDraft] = useState<BlockDraft | null>(null);
  const [breakDraft, setBreakDraft] = useState<BreakDraft | null>(null);
  // Part of the marker dialogs' keys: each open starts from its draft.
  const [dialogSession, setDialogSession] = useState(0);

  const busy = isPending || reorder.isSaving;

  const openBlockDialog = (draft: BlockDraft) => {
    setDialogSession((n) => n + 1);
    setBlockDraft(draft);
  };

  const openBreakDialog = (draft: BreakDraft) => {
    setDialogSession((n) => n + 1);
    setBreakDraft(draft);
  };

  const confirmRemove = () => {
    if (!songToRemove) return;
    startTransition(async () => {
      const result = await removeSongFromSetlist(setlistId, songToRemove);
      if (result.success) {
        toast.success(t("removed"));
      } else {
        toastActionError(result, result.error);
      }
      setSongToRemove(null);
    });
  };

  const confirmDeleteMarker = () => {
    if (!markerToDelete) return;
    startTransition(async () => {
      const result = await deleteSetlistMarker(setlistId, markerToDelete);
      if (result.success) {
        toast.success(t("markerDeleted"));
      } else {
        toastActionError(result, result.error);
      }
      setMarkerToDelete(null);
    });
  };

  const handlePlay = (songId: string) => {
    router.push(`/dashboard/setlists/${setlistId}/live?songId=${songId}`);
  };

  const songsInSetlist =
    availableSongs.length > 0
      ? availableSongs
      : baseRows
          .filter((row): row is SongRow => row.kind === "song")
          .map((row) => row.song);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-semibold">{t("title")}</h2>
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {reorder.isReordering ? (
            <>
              <Button
                variant="ghost"
                className="gap-2"
                onClick={reorder.cancel}
                disabled={busy}
              >
                <X className="h-4 w-4" aria-hidden />
                <span className="sr-only sm:not-sr-only">
                  {t("cancelReorder")}
                </span>
              </Button>
              <Button className="gap-2" onClick={reorder.save} disabled={busy}>
                <Check className="h-4 w-4" aria-hidden />
                <span className="sr-only sm:not-sr-only">{t("saveOrder")}</span>
              </Button>
            </>
          ) : (
            <>
              {canManage && (
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={reorder.start}
                  disabled={baseRows.length <= 1 || actionsDisabled}
                  title={offlineDisabled.title ?? t("reorder")}
                >
                  <ListOrdered className="h-4 w-4" aria-hidden />
                  <span className="sr-only sm:not-sr-only">{t("reorder")}</span>
                </Button>
              )}
              {canManage && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="gap-1.5"
                      title={offlineDisabled.title ?? t("addSection")}
                      disabled={actionsDisabled}
                    >
                      <ListPlus className="h-4 w-4" aria-hidden />
                      <span className="sr-only sm:not-sr-only">
                        {t("addSection")}
                      </span>
                      <ChevronDown
                        className="h-3.5 w-3.5 opacity-60"
                        aria-hidden
                      />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64">
                    <DropdownMenuItem
                      onClick={() => openBlockDialog({ name: "" })}
                      className="items-start gap-3 py-2"
                    >
                      <Layers
                        className="text-primary mt-0.5 h-4 w-4"
                        aria-hidden
                      />
                      <div>
                        <p className="font-medium">{t("addBlock")}</p>
                        <p className="text-muted-foreground text-xs">
                          {t("addBlockHint")}
                        </p>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        openBreakDialog({ label: "", durationMinutes: "" })
                      }
                      className="items-start gap-3 py-2"
                    >
                      <Coffee className="mt-0.5 h-4 w-4" aria-hidden />
                      <div>
                        <p className="font-medium">{t("addBreak")}</p>
                        <p className="text-muted-foreground text-xs">
                          {t("addBreakHint")}
                        </p>
                      </div>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              <Button
                className="gap-2"
                onClick={() => setIsAddOpen(true)}
                title={
                  offlineDisabled.title ??
                  (canManage ? t("addSong") : t("suggestSong"))
                }
                disabled={!!offlineDisabled.disabled}
              >
                {canManage ? (
                  <Plus className="h-4 w-4" aria-hidden />
                ) : (
                  <Send className="h-4 w-4" aria-hidden />
                )}
                <span className="sr-only sm:not-sr-only">
                  {canManage ? t("addSong") : t("suggestSong")}
                </span>
              </Button>
            </>
          )}
        </div>
      </div>

      <div
        className={cn(
          "bg-card overflow-hidden rounded-xl border",
          busy && "pointer-events-none opacity-60",
        )}
      >
        <DndContext
          sensors={reorder.sensors}
          collisionDetection={closestCenter}
          onDragEnd={reorder.onDragEnd}
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  {reorder.isReordering ? "" : "#"}
                </TableHead>
                <TableHead>{t("table.title")}</TableHead>
                <TableHead className="hidden md:table-cell">
                  {t("table.artist")}
                </TableHead>
                <TableHead className="hidden sm:table-cell">
                  {t("table.duration")}
                </TableHead>
                <TableHead>{t("table.bpm")}</TableHead>
                <TableHead className="w-12 text-right">
                  <span className="sr-only">{t("table.actions")}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayRows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-muted-foreground h-24 text-center"
                  >
                    {t("empty")}
                  </TableCell>
                </TableRow>
              ) : (
                <SortableContext
                  items={displayRows.map((row) => row.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {displayRows.map((row) => {
                    if (row.kind === "song") {
                      return (
                        <SortableSongRow
                          key={row.id}
                          row={row}
                          songNumber={songNumbers.get(row.id) ?? 0}
                          onRemove={setSongToRemove}
                          onPlay={handlePlay}
                          isReordering={reorder.isReordering}
                          actionsDisabled={actionsDisabled}
                        />
                      );
                    }
                    if (row.kind === "block") {
                      return (
                        <SortableBlockRow
                          key={row.id}
                          row={row}
                          isReordering={reorder.isReordering}
                          onEdit={() =>
                            openBlockDialog({ id: row.id, name: row.name })
                          }
                          onDelete={() => setMarkerToDelete(row.id)}
                          actionsDisabled={actionsDisabled}
                        />
                      );
                    }
                    return (
                      <SortableBreakRow
                        key={row.id}
                        row={row}
                        isReordering={reorder.isReordering}
                        onEdit={() =>
                          openBreakDialog({
                            id: row.id,
                            label: row.label ?? "",
                            durationMinutes:
                              row.durationMinutes != null
                                ? String(row.durationMinutes)
                                : "",
                          })
                        }
                        onDelete={() => setMarkerToDelete(row.id)}
                        actionsDisabled={actionsDisabled}
                      />
                    );
                  })}
                </SortableContext>
              )}
            </TableBody>
          </Table>
        </DndContext>
      </div>

      <AddSongDialog
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        setlistId={setlistId}
        songs={allSongs}
        artists={artists}
        excludedSongIds={songsInSetlist.flatMap((song) =>
          [song.id, song.forked_from].filter((id): id is string => !!id),
        )}
        band={band}
      />

      <BlockDialog
        key={`block:${dialogSession}`}
        setlistId={setlistId}
        draft={blockDraft}
        onClose={() => setBlockDraft(null)}
        onSaved={() => setBlockDraft(null)}
      />

      <BreakDialog
        key={`break:${dialogSession}`}
        setlistId={setlistId}
        draft={breakDraft}
        onClose={() => setBreakDraft(null)}
        onSaved={() => setBreakDraft(null)}
      />

      {/* Remove song confirmation */}
      <Dialog
        open={!!songToRemove}
        onOpenChange={(open) => !open && setSongToRemove(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("removeTitle")}</DialogTitle>
            <DialogDescription>{t("removeConfirm")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setSongToRemove(null)}
              disabled={isPending}
            >
              {tCommon("cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={confirmRemove}
              disabled={isPending}
            >
              {tCommon("remove")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Marker (block/break) delete confirmation */}
      <Dialog
        open={!!markerToDelete}
        onOpenChange={(open) => !open && setMarkerToDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tCommon("delete")}</DialogTitle>
            <DialogDescription>{t("markerDeleteConfirm")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setMarkerToDelete(null)}
              disabled={isPending}
            >
              {tCommon("cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteMarker}
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
