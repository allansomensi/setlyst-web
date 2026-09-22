"use client";

import { useMemo, useState, useTransition } from "react";
import { useAppRouter } from "@/hooks/use-app-router";
import { Song, SetlistSong, SetlistItem, Setlist, Artist } from "@/types/api";
import { useOfflineSetlistDetail } from "@/hooks/use-offline-setlist-detail";
import { useOfflineDisabled } from "@/components/offline-disabled";
import {
  removeSongFromSetlist,
  reorderSetlistItems,
  createSetlistBlock,
  updateSetlistBlock,
  createSetlistBreak,
  updateSetlistBreak,
  deleteSetlistMarker,
} from "../../actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Plus,
  Trash2,
  GripVertical,
  ListOrdered,
  Check,
  X,
  Layers,
  Coffee,
  Pencil,
  ListPlus,
  ChevronDown,
} from "lucide-react";
import { cn, formatDuration } from "@/lib/utils";
import { toast } from "sonner";
import { toastActionError } from "@/lib/action-toast";
import { AddSongDialog } from "./add-song-dialog";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface SetlistSongsManagerProps {
  setlistId: string;
  /** The setlist itself, needed to keep the offline mirror current. */
  setlist: Setlist;
  setlistSongs: SetlistSong[];
  setlistItems: SetlistItem[];
  allSongs: Song[];
  artists: Artist[];
}

/** Local, UI-only shape the manager renders — one row per song, block or break. */
type Row =
  | { kind: "song"; id: string; song: SetlistSong }
  | { kind: "block"; id: string; name: string }
  | {
      kind: "break";
      id: string;
      label: string | null;
      durationMinutes: number | null;
    };

function itemsToRows(items: SetlistItem[]): Row[] {
  return items.map((item) => {
    if (item.item_type === "song") {
      return { kind: "song", id: item.song.id, song: item.song };
    }
    if (item.item_type === "block") {
      return { kind: "block", id: item.id, name: item.name };
    }
    return {
      kind: "break",
      id: item.id,
      label: item.label,
      durationMinutes: item.duration_minutes,
    };
  });
}

function SortableSongRow({
  row,
  songNumber,
  handleRemove,
  handlePlay,
  isReordering,
  actionsDisabled,
}: {
  row: Extract<Row, { kind: "song" }>;
  songNumber: number;
  handleRemove: (id: string) => void;
  handlePlay: (id: string) => void;
  isReordering: boolean;
  actionsDisabled: boolean;
}) {
  const t = useTranslations("setlists.songs");
  const { song } = row;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: row.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : "auto",
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className={cn(
        isDragging && "bg-muted",
        !isReordering && "hover:bg-muted/50 group cursor-pointer",
      )}
      onClick={() => {
        if (!isReordering) {
          handlePlay(song.id);
        }
      }}
      title={isReordering ? undefined : t("playFromHere")}
    >
      <TableCell className="w-12">
        {isReordering ? (
          <DragHandle attributes={attributes} listeners={listeners} />
        ) : (
          <span className="text-muted-foreground font-mono text-xs font-medium tabular-nums">
            {String(songNumber).padStart(2, "0")}
          </span>
        )}
      </TableCell>
      <TableCell className="w-full max-w-0">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium">{song.title}</span>
          {song.tonality && (
            <Badge
              variant="outline"
              className="h-5 shrink-0 px-1.5 font-mono text-[10px]"
            >
              {song.tonality}
            </Badge>
          )}
        </div>
        {/* The artist column is dropped on phones; keep the name visible. */}
        <p className="text-muted-foreground truncate text-xs md:hidden">
          {song.artist_name}
        </p>
      </TableCell>
      <TableCell className="text-muted-foreground hidden md:table-cell">
        {song.artist_name}
      </TableCell>
      <TableCell className="hidden sm:table-cell">
        <span className="text-muted-foreground font-mono text-sm tabular-nums">
          {song.duration ? formatDuration(song.duration) : "–"}
        </span>
      </TableCell>
      <TableCell>
        <span className="text-muted-foreground font-mono text-sm tabular-nums">
          {song.tempo ?? "–"}
        </span>
      </TableCell>
      <TableCell className="w-12 text-right">
        {!isReordering && (
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive relative z-10"
            onClick={(e) => {
              e.stopPropagation();
              handleRemove(song.id);
            }}
            disabled={actionsDisabled}
            aria-label={t("removeSong")}
            title={t("removeSong")}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}

function DragHandle({
  attributes,
  listeners,
}: {
  attributes: ReturnType<typeof useSortable>["attributes"];
  listeners: ReturnType<typeof useSortable>["listeners"];
}) {
  return (
    <div
      {...attributes}
      {...listeners}
      className="hover:bg-accent flex h-8 w-8 cursor-grab touch-none items-center justify-center rounded active:cursor-grabbing"
      onClick={(e) => e.stopPropagation()}
    >
      <GripVertical className="text-muted-foreground h-4 w-4" />
    </div>
  );
}

/**
 * Edit/delete buttons shared by block and break rows. Offline these are
 * disabled like every other write in the manager.
 */
function MarkerActions({
  onEdit,
  onDelete,
  disabled,
}: {
  onEdit: () => void;
  onDelete: () => void;
  disabled: boolean;
}) {
  const tCommon = useTranslations("common");
  return (
    <div className="flex justify-end gap-0.5">
      <Button
        variant="ghost"
        size="icon"
        className="text-muted-foreground"
        onClick={onEdit}
        disabled={disabled}
        aria-label={tCommon("edit")}
        title={tCommon("edit")}
      >
        <Pencil className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        onClick={onDelete}
        disabled={disabled}
        aria-label={tCommon("delete")}
        title={tCommon("delete")}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

function SortableBlockRow({
  row,
  isReordering,
  onEdit,
  onDelete,
  actionsDisabled,
}: {
  row: Extract<Row, { kind: "block" }>;
  isReordering: boolean;
  onEdit: () => void;
  onDelete: () => void;
  actionsDisabled: boolean;
}) {
  const t = useTranslations("setlists.songs");
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: row.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : "auto",
    opacity: isDragging ? 0.5 : 1,
  };

  // Same cells (and the same responsive hiding) as a song row, so the
  // columns line up at every width; the name simply sits in the title
  // column.
  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className={cn(
        "bg-primary/5 hover:bg-primary/10",
        isDragging && "bg-primary/20",
      )}
    >
      <TableCell className="w-12">
        {isReordering ? (
          <DragHandle attributes={attributes} listeners={listeners} />
        ) : (
          <Layers className="text-primary h-4 w-4" />
        )}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2 py-0.5">
          <span className="text-primary truncate font-semibold tracking-wide uppercase">
            {row.name}
          </span>
          <span className="text-muted-foreground text-xs font-normal normal-case">
            {t("blockLabel")}
          </span>
        </div>
      </TableCell>
      <TableCell className="hidden md:table-cell" />
      <TableCell className="hidden sm:table-cell" />
      <TableCell />
      <TableCell className="text-right">
        {!isReordering && (
          <MarkerActions
            onEdit={onEdit}
            onDelete={onDelete}
            disabled={actionsDisabled}
          />
        )}
      </TableCell>
    </TableRow>
  );
}

function SortableBreakRow({
  row,
  isReordering,
  onEdit,
  onDelete,
  actionsDisabled,
}: {
  row: Extract<Row, { kind: "break" }>;
  isReordering: boolean;
  onEdit: () => void;
  onDelete: () => void;
  actionsDisabled: boolean;
}) {
  const t = useTranslations("setlists.songs");
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: row.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : "auto",
    opacity: isDragging ? 0.5 : 1,
  };

  const hasDuration =
    typeof row.durationMinutes === "number" && row.durationMinutes > 0;

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className={cn(
        "bg-muted/40 border-y border-dashed",
        isDragging && "bg-muted",
      )}
    >
      <TableCell className="w-12">
        {isReordering ? (
          <DragHandle attributes={attributes} listeners={listeners} />
        ) : (
          <Coffee className="text-muted-foreground h-4 w-4" />
        )}
      </TableCell>
      <TableCell>
        <div className="text-muted-foreground flex items-center gap-2 py-0.5 italic">
          <span className="truncate">
            {row.label || t("breakDefaultLabel")}
          </span>
          {hasDuration && (
            <span className="text-xs not-italic sm:hidden">
              ({t("breakMinutes", { count: row.durationMinutes ?? 0 })})
            </span>
          )}
        </div>
      </TableCell>
      <TableCell className="hidden md:table-cell" />
      <TableCell className="hidden sm:table-cell">
        {hasDuration && (
          <span className="text-muted-foreground font-mono text-sm">
            {t("breakMinutes", { count: row.durationMinutes ?? 0 })}
          </span>
        )}
      </TableCell>
      <TableCell />
      <TableCell className="text-right">
        {!isReordering && (
          <MarkerActions
            onEdit={onEdit}
            onDelete={onDelete}
            disabled={actionsDisabled}
          />
        )}
      </TableCell>
    </TableRow>
  );
}

export function SetlistSongsManager({
  setlistId,
  setlist,
  setlistSongs,
  setlistItems,
  allSongs,
  artists,
}: SetlistSongsManagerProps) {
  const router = useAppRouter();
  const t = useTranslations("setlists.songs");
  const tCommon = useTranslations("common");
  const offlineDisabled = useOfflineDisabled();

  // Offline, the running order comes from the on-device mirror rather than
  // whatever was embedded in the cached HTML — see
  // hooks/use-offline-setlist-detail.ts.
  const { songs: availableSongs, items: availableItems } =
    useOfflineSetlistDetail(setlist, {
      songs: setlistSongs,
      items: setlistItems,
    });

  const [isPending, startTransition] = useTransition();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isReordering, setIsReordering] = useState(false);
  const [songToRemove, setSongToRemove] = useState<string | null>(null);
  const [items, setItems] = useState<Row[]>([]);

  const [blockDialog, setBlockDialog] = useState<{
    id?: string;
    name: string;
  } | null>(null);
  const [breakDialog, setBreakDialog] = useState<{
    id?: string;
    label: string;
    durationMinutes: string;
  } | null>(null);
  const [markerToDelete, setMarkerToDelete] = useState<string | null>(null);

  const baseRows = useMemo(() => itemsToRows(availableItems), [availableItems]);
  const displayRows = isReordering ? items : baseRows;

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setItems((prev) => {
        const oldIndex = prev.findIndex((i) => i.id === active.id);
        const newIndex = prev.findIndex((i) => i.id === over.id);
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  };

  const handleSaveOrder = () => {
    startTransition(async () => {
      const refs = items.map((row) => ({
        item_type: row.kind,
        id: row.id,
      }));
      const result = await reorderSetlistItems(setlistId, refs);

      if (result.success) {
        toast.success(t("orderSaved"));
        setIsReordering(false);
        router.refresh();
      } else {
        toastActionError(result, result.error);
      }
    });
  };

  const handleCancel = () => {
    setIsReordering(false);
    setItems([]);
  };

  const handleRemoveClick = (songId: string) => {
    setSongToRemove(songId);
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

  const handlePlay = (songId: string) => {
    router.push(`/dashboard/setlists/${setlistId}/live?songId=${songId}`);
  };

  const saveBlock = () => {
    if (!blockDialog || !blockDialog.name.trim()) return;

    startTransition(async () => {
      const result = blockDialog.id
        ? await updateSetlistBlock(setlistId, blockDialog.id, blockDialog.name)
        : await createSetlistBlock(setlistId, blockDialog.name);

      if (result.success) {
        toast.success(blockDialog.id ? t("blockUpdated") : t("blockAdded"));
        setBlockDialog(null);
        router.refresh();
      } else {
        toastActionError(result, result.error);
      }
    });
  };

  const saveBreak = () => {
    if (!breakDialog) return;

    const minutes = breakDialog.durationMinutes
      ? Number(breakDialog.durationMinutes)
      : null;

    startTransition(async () => {
      const result = breakDialog.id
        ? await updateSetlistBreak(setlistId, breakDialog.id, {
            label: breakDialog.label,
            duration_minutes: minutes,
          })
        : await createSetlistBreak(setlistId, {
            label: breakDialog.label,
            duration_minutes: minutes,
          });

      if (result.success) {
        toast.success(breakDialog.id ? t("breakUpdated") : t("breakAdded"));
        setBreakDialog(null);
        router.refresh();
      } else {
        toastActionError(result, result.error);
      }
    });
  };

  const confirmDeleteMarker = () => {
    if (!markerToDelete) return;

    startTransition(async () => {
      const result = await deleteSetlistMarker(setlistId, markerToDelete);
      if (result.success) {
        toast.success(t("markerDeleted"));
        router.refresh();
      } else {
        toastActionError(result, result.error);
      }
      setMarkerToDelete(null);
    });
  };

  const songNumbers = new Map<string, number>();
  let counter = 0;
  for (const row of displayRows) {
    if (row.kind === "song") {
      counter += 1;
      songNumbers.set(row.id, counter);
    }
  }

  const songRowsOnly = baseRows.filter(
    (r): r is Extract<Row, { kind: "song" }> => r.kind === "song",
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-semibold">{t("title")}</h2>
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {isReordering ? (
            <>
              <Button
                variant="ghost"
                className="gap-2"
                onClick={handleCancel}
                disabled={isPending}
              >
                <X className="h-4 w-4" />
                <span className="hidden sm:inline">{t("cancelReorder")}</span>
              </Button>
              <Button
                className="gap-2"
                onClick={handleSaveOrder}
                disabled={isPending}
              >
                <Check className="h-4 w-4" />
                <span className="hidden sm:inline">{t("saveOrder")}</span>
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => {
                  setItems(baseRows);
                  setIsReordering(true);
                }}
                disabled={baseRows.length <= 1 || offlineDisabled.disabled}
                title={offlineDisabled.title ?? t("reorder")}
              >
                <ListOrdered className="h-4 w-4" />
                <span className="hidden sm:inline">{t("reorder")}</span>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="gap-1.5"
                    title={offlineDisabled.title ?? t("addSection")}
                    aria-label={t("addSection")}
                    disabled={offlineDisabled.disabled}
                  >
                    <ListPlus className="h-4 w-4" />
                    <span className="hidden sm:inline">{t("addSection")}</span>
                    <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuItem
                    onClick={() => setBlockDialog({ name: "" })}
                    className="items-start gap-3 py-2"
                  >
                    <Layers className="text-primary mt-0.5 h-4 w-4" />
                    <div>
                      <p className="font-medium">{t("addBlock")}</p>
                      <p className="text-muted-foreground text-xs">
                        {t("addBlockHint")}
                      </p>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      setBreakDialog({ label: "", durationMinutes: "" })
                    }
                    className="items-start gap-3 py-2"
                  >
                    <Coffee className="mt-0.5 h-4 w-4" />
                    <div>
                      <p className="font-medium">{t("addBreak")}</p>
                      <p className="text-muted-foreground text-xs">
                        {t("addBreakHint")}
                      </p>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                className="gap-2"
                onClick={() => setIsDialogOpen(true)}
                title={offlineDisabled.title ?? t("addSong")}
                disabled={offlineDisabled.disabled}
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">{t("addSong")}</span>
              </Button>
            </>
          )}
        </div>
      </div>

      <div
        className={cn(
          "bg-card overflow-hidden rounded-xl border",
          isPending && "pointer-events-none opacity-60",
        )}
      >
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  {isReordering ? "" : "#"}
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
                  items={displayRows.map((r) => r.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {displayRows.map((row) => {
                    if (row.kind === "song") {
                      return (
                        <SortableSongRow
                          key={row.id}
                          row={row}
                          songNumber={songNumbers.get(row.id) ?? 0}
                          handleRemove={handleRemoveClick}
                          handlePlay={handlePlay}
                          isReordering={isReordering}
                          actionsDisabled={!!offlineDisabled.disabled}
                        />
                      );
                    }
                    if (row.kind === "block") {
                      return (
                        <SortableBlockRow
                          key={row.id}
                          row={row}
                          isReordering={isReordering}
                          onEdit={() =>
                            setBlockDialog({ id: row.id, name: row.name })
                          }
                          onDelete={() => setMarkerToDelete(row.id)}
                          actionsDisabled={!!offlineDisabled.disabled}
                        />
                      );
                    }
                    return (
                      <SortableBreakRow
                        key={row.id}
                        row={row}
                        isReordering={isReordering}
                        onEdit={() =>
                          setBreakDialog({
                            id: row.id,
                            label: row.label ?? "",
                            durationMinutes:
                              row.durationMinutes != null
                                ? String(row.durationMinutes)
                                : "",
                          })
                        }
                        onDelete={() => setMarkerToDelete(row.id)}
                        actionsDisabled={!!offlineDisabled.disabled}
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
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        setlistId={setlistId}
        allSongs={allSongs}
        artists={artists}
        existingSongIds={(availableSongs.length > 0
          ? availableSongs
          : songRowsOnly.map((r) => r.song)
        ).flatMap((s) =>
          [s.id, s.forked_from].filter((id): id is string => !!id),
        )}
      />

      {/* Remove song confirmation */}
      <Dialog
        open={!!songToRemove}
        onOpenChange={(open) => !open && setSongToRemove(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tCommon("delete")}</DialogTitle>
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
              {tCommon("delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Block create/edit dialog */}
      <Dialog
        open={!!blockDialog}
        onOpenChange={(open) => !open && setBlockDialog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {blockDialog?.id ? t("editBlockTitle") : t("addBlockTitle")}
            </DialogTitle>
            <DialogDescription>{t("blockDialogDescription")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="block-name">{t("blockNameLabel")}</Label>
            <Input
              id="block-name"
              value={blockDialog?.name ?? ""}
              onChange={(e) =>
                setBlockDialog((prev) =>
                  prev ? { ...prev, name: e.target.value } : prev,
                )
              }
              placeholder={t("blockNamePlaceholder")}
              maxLength={255}
              disabled={isPending}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBlockDialog(null)}
              disabled={isPending}
            >
              {tCommon("cancel")}
            </Button>
            <Button
              onClick={saveBlock}
              disabled={isPending || !blockDialog?.name.trim()}
            >
              {tCommon("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Break create/edit dialog */}
      <Dialog
        open={!!breakDialog}
        onOpenChange={(open) => !open && setBreakDialog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {breakDialog?.id ? t("editBreakTitle") : t("addBreakTitle")}
            </DialogTitle>
            <DialogDescription>{t("breakDialogDescription")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="break-label">{t("breakLabelLabel")}</Label>
              <Input
                id="break-label"
                value={breakDialog?.label ?? ""}
                onChange={(e) =>
                  setBreakDialog((prev) =>
                    prev ? { ...prev, label: e.target.value } : prev,
                  )
                }
                placeholder={t("breakDefaultLabel")}
                maxLength={255}
                disabled={isPending}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="break-duration">{t("breakDurationLabel")}</Label>
              <Input
                id="break-duration"
                type="number"
                min={0}
                max={1440}
                value={breakDialog?.durationMinutes ?? ""}
                onChange={(e) =>
                  setBreakDialog((prev) =>
                    prev ? { ...prev, durationMinutes: e.target.value } : prev,
                  )
                }
                placeholder="15"
                disabled={isPending}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBreakDialog(null)}
              disabled={isPending}
            >
              {tCommon("cancel")}
            </Button>
            <Button onClick={saveBreak} disabled={isPending}>
              {tCommon("save")}
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
