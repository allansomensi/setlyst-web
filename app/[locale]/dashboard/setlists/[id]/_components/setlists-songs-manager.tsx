"use client";

import { useMemo, useState, useTransition } from "react";
import type { Announcements, ScreenReaderInstructions } from "@dnd-kit/core";
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
import {
  Song,
  SetlistSong,
  SetlistItem,
  Setlist,
  Artist,
  BandCopyStatus,
} from "@/types/api";
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
import { ConfirmActionDialog } from "@/components/ui/confirm-action-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { toastActionError } from "@/lib/action-toast";
import { toastMovedToTrash } from "@/components/content/trash-toast";
import { SyncBandCopyDialog } from "@/components/songs/sync-band-copy-dialog";
import { AddSongDialog, type AddSongBandContext } from "./add-song-dialog";
import { BlockDialog, type BlockDraft } from "./block-dialog";
import { BreakDialog, type BreakDraft } from "./break-dialog";
import { SortableBlockRow } from "./rows/block-row";
import { SortableBreakRow } from "./rows/break-row";
import { SortableSongRow } from "./rows/song-row";
import {
  itemsToRows,
  songNumbersOf,
  type Row,
  type SongRow,
} from "./rows/types";
import type { RowMove } from "./rows/drag-handle";
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
  /**
   * Band setlists: band songs the person contributed whose original has
   * changed since (`GET /bands/{id}/song-updates`).
   */
  songUpdates?: BandCopyStatus[];
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
  songUpdates = [],
}: SetlistSongsManagerProps) {
  const router = useAppRouter();
  const t = useTranslations("setlists.songs");
  const tCommon = useTranslations("common");
  const tTrash = useTranslations("trash");
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
  const [copyToSync, setCopyToSync] = useState<BandCopyStatus | null>(null);
  // Updated from here: their badge goes away before the refreshed data
  // arrives.
  const [syncedIds, setSyncedIds] = useState<string[]>([]);
  const updatesBySong = useMemo(
    () =>
      new Map(
        songUpdates
          .filter(
            (copy) => copy.can_update && !syncedIds.includes(copy.song_id),
          )
          .map((copy) => [copy.song_id, copy]),
      ),
    [songUpdates, syncedIds],
  );
  // Out of the repertoire means out of the band (to its trash).
  const removingFromRepertoire = !!band?.isRepertoire;
  const [markerToDelete, setMarkerToDelete] = useState<string | null>(null);
  const [blockDraft, setBlockDraft] = useState<BlockDraft | null>(null);
  const [breakDraft, setBreakDraft] = useState<BreakDraft | null>(null);
  // Part of the marker dialogs' keys: each open starts from its draft.
  const [dialogSession, setDialogSession] = useState(0);

  const busy = isPending || reorder.isSaving;

  // Screen-reader support for reordering: dnd-kit's default announcements
  // are English and name rows by their UUID. These use the song (or block,
  // break) name and its position in the running order.
  const labelOf = (row: Row | undefined): string =>
    !row
      ? ""
      : row.kind === "song"
        ? row.song.title
        : row.kind === "block"
          ? row.name
          : row.label || t("breakDefaultLabel");
  const rowById = (id: string | number) =>
    displayRows.find((row) => row.id === String(id));
  const positionOf = (id: string | number) =>
    displayRows.findIndex((row) => row.id === String(id)) + 1;
  const total = displayRows.length;
  const screenReaderInstructions: ScreenReaderInstructions = {
    draggable: t("dnd.instructions"),
  };
  const announcements: Announcements = {
    onDragStart: ({ active }) =>
      t("dnd.pickedUp", {
        title: labelOf(rowById(active.id)),
        position: positionOf(active.id),
        total,
      }),
    onDragOver: ({ active, over }) =>
      over
        ? t("dnd.movedOver", {
            title: labelOf(rowById(active.id)),
            position: positionOf(over.id),
            total,
          })
        : undefined,
    onDragEnd: ({ active, over }) =>
      t("dnd.dropped", {
        title: labelOf(rowById(active.id)),
        position: positionOf(over?.id ?? active.id),
        total,
      }),
    onDragCancel: ({ active }) =>
      t("dnd.cancelled", {
        title: labelOf(rowById(active.id)),
        position: positionOf(active.id),
      }),
  };

  // What the "Move up/down" buttons did, for screen readers.
  const [moveAnnouncement, setMoveAnnouncement] = useState("");
  const moveOf = (row: Row, index: number): RowMove | undefined =>
    reorder.isReordering
      ? {
          canUp: index > 0 && !busy,
          canDown: index < displayRows.length - 1 && !busy,
          onMove: (delta) => {
            const to = reorder.move(row.id, delta);
            if (to === null) return;
            setMoveAnnouncement(
              t("dnd.moved", {
                title: labelOf(row),
                position: to + 1,
                total,
              }),
            );
          },
        }
      : undefined;

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
    const songId = songToRemove;
    startTransition(async () => {
      const result = await removeSongFromSetlist(setlistId, songId);
      if (!result.success) {
        toastActionError(result, result.error);
      } else if (removingFromRepertoire) {
        toastMovedToTrash(
          "song",
          songId,
          {
            message: t("removedFromRepertoire"),
            undoLabel: tTrash("undo"),
            restoring: tTrash("restoring"),
            restored: t("restoredToRepertoire"),
            restoreFailed: tTrash("restoreFailed"),
          },
          () => router.refresh(),
        );
      } else {
        toast.success(t("removed"));
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
          accessibility={{ announcements, screenReaderInstructions }}
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
                  {displayRows.map((row, index) => {
                    const move = moveOf(row, index);
                    if (row.kind === "song") {
                      return (
                        <SortableSongRow
                          key={row.id}
                          row={row}
                          songNumber={songNumbers.get(row.id) ?? 0}
                          onRemove={setSongToRemove}
                          onPlay={handlePlay}
                          update={
                            actionsDisabled
                              ? undefined
                              : updatesBySong.get(row.song.id)
                          }
                          onUpdate={setCopyToSync}
                          removeLabel={
                            removingFromRepertoire
                              ? t("removeFromRepertoire")
                              : undefined
                          }
                          isReordering={reorder.isReordering}
                          actionsDisabled={actionsDisabled}
                          move={move}
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
                          move={move}
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
                        move={move}
                      />
                    );
                  })}
                </SortableContext>
              )}
            </TableBody>
          </Table>
        </DndContext>
      </div>

      <p role="status" aria-live="polite" className="sr-only">
        {reorder.isReordering ? moveAnnouncement : ""}
      </p>

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
      <ConfirmActionDialog
        open={!!songToRemove}
        onOpenChange={(open) => !open && setSongToRemove(null)}
        title={
          removingFromRepertoire
            ? t("removeFromRepertoireTitle")
            : t("removeTitle")
        }
        description={
          removingFromRepertoire
            ? t("removeFromRepertoireConfirm")
            : band
              ? t("removeConfirmBand")
              : t("removeConfirm")
        }
        confirmLabel={
          removingFromRepertoire
            ? t("removeFromRepertoireAction")
            : tCommon("remove")
        }
        onConfirm={confirmRemove}
        pending={isPending}
      />

      <SyncBandCopyDialog
        copy={copyToSync}
        title={
          songsInSetlist.find((song) => song.id === copyToSync?.song_id)
            ?.title ?? ""
        }
        onClose={() => setCopyToSync(null)}
        onSynced={(copy) => setSyncedIds((prev) => [...prev, copy.song_id])}
      />

      {/* Marker (block/break) delete confirmation */}
      <ConfirmActionDialog
        open={!!markerToDelete}
        onOpenChange={(open) => !open && setMarkerToDelete(null)}
        title={tCommon("delete")}
        description={t("markerDeleteConfirm")}
        confirmLabel={tCommon("delete")}
        onConfirm={confirmDeleteMarker}
        pending={isPending}
      />
    </div>
  );
}
