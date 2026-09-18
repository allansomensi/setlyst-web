"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "@/i18n/routing";
import { Song, SetlistSong, SetlistItem, Artist } from "@/types/api";
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
  MoreHorizontal,
} from "lucide-react";
import { toast } from "sonner";
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
}: {
  row: Extract<Row, { kind: "song" }>;
  songNumber: number;
  handleRemove: (id: string) => void;
  handlePlay: (id: string) => void;
  isReordering: boolean;
}) {
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
      className={` ${isDragging ? "bg-muted" : ""} ${!isReordering ? "hover:bg-muted/50 cursor-pointer transition-colors" : ""} `}
      onClick={() => {
        if (!isReordering) {
          handlePlay(song.id);
        }
      }}
    >
      <TableCell className="w-16">
        {isReordering ? (
          <div
            {...attributes}
            {...listeners}
            className="hover:bg-accent cursor-grab rounded p-1 active:cursor-grabbing"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="text-muted-foreground h-4 w-4" />
          </div>
        ) : (
          <span className="text-muted-foreground font-medium">
            {songNumber}
          </span>
        )}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <span className="font-medium">{song.title}</span>
          {song.tonality && (
            <Badge
              variant="outline"
              className="h-5 px-1.5 font-mono text-[10px]"
            >
              {song.tonality}
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell>{song.artist_name}</TableCell>
      <TableCell>
        {song.tempo ? (
          <span className="text-muted-foreground font-mono text-sm">
            {song.tempo}
          </span>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </TableCell>
      <TableCell className="text-right">
        {!isReordering && (
          <div className="flex justify-end gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="relative z-10 text-red-600 hover:bg-red-50"
              onClick={(e) => {
                e.stopPropagation();
                handleRemove(song.id);
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </TableCell>
    </TableRow>
  );
}

function SortableBlockRow({
  row,
  isReordering,
  onEdit,
  onDelete,
}: {
  row: Extract<Row, { kind: "block" }>;
  isReordering: boolean;
  onEdit: () => void;
  onDelete: () => void;
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

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className={`bg-primary/5 hover:bg-primary/10 ${isDragging ? "bg-primary/20" : ""}`}
    >
      <TableCell className="w-16">
        {isReordering && (
          <div
            {...attributes}
            {...listeners}
            className="hover:bg-accent cursor-grab rounded p-1 active:cursor-grabbing"
          >
            <GripVertical className="text-muted-foreground h-4 w-4" />
          </div>
        )}
      </TableCell>
      <TableCell colSpan={isReordering ? 3 : 2}>
        <div className="flex items-center gap-2 py-0.5">
          <Layers className="text-primary h-4 w-4 shrink-0" />
          <span className="text-primary font-semibold tracking-wide uppercase">
            {row.name}
          </span>
          <span className="text-muted-foreground text-xs font-normal normal-case">
            {t("blockLabel")}
          </span>
        </div>
      </TableCell>
      {!isReordering && <TableCell />}
      <TableCell className="text-right">
        {!isReordering && (
          <div className="flex justify-end gap-1">
            <Button variant="ghost" size="icon" onClick={onEdit}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-red-600 hover:bg-red-50"
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
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
}: {
  row: Extract<Row, { kind: "break" }>;
  isReordering: boolean;
  onEdit: () => void;
  onDelete: () => void;
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

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className={`bg-muted/40 border-y border-dashed ${isDragging ? "bg-muted" : ""}`}
    >
      <TableCell className="w-16">
        {isReordering && (
          <div
            {...attributes}
            {...listeners}
            className="hover:bg-accent cursor-grab rounded p-1 active:cursor-grabbing"
          >
            <GripVertical className="text-muted-foreground h-4 w-4" />
          </div>
        )}
      </TableCell>
      <TableCell colSpan={isReordering ? 3 : 2}>
        <div className="text-muted-foreground flex items-center gap-2 py-0.5 italic">
          <Coffee className="h-4 w-4 shrink-0" />
          <span>{row.label || t("breakDefaultLabel")}</span>
          {typeof row.durationMinutes === "number" &&
            row.durationMinutes > 0 && (
              <span className="text-xs not-italic">
                ({t("breakMinutes", { count: row.durationMinutes })})
              </span>
            )}
        </div>
      </TableCell>
      {!isReordering && <TableCell />}
      <TableCell className="text-right">
        {!isReordering && (
          <div className="flex justify-end gap-1">
            <Button variant="ghost" size="icon" onClick={onEdit}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-red-600 hover:bg-red-50"
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </TableCell>
    </TableRow>
  );
}

export function SetlistSongsManager({
  setlistId,
  setlistSongs,
  setlistItems,
  allSongs,
  artists,
}: SetlistSongsManagerProps) {
  const router = useRouter();
  const t = useTranslations("setlists.songs");
  const tCommon = useTranslations("common");

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

  const baseRows = useMemo(() => itemsToRows(setlistItems), [setlistItems]);
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
        toast.error(result.error);
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
        toast.error(result.error);
      }
      setSongToRemove(null);
    });
  };

  const handlePlay = (songId: string) => {
    router.push(
      `/dashboard/setlists/${setlistId}/live?songId=${songId}` as never,
    );
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
        toast.error(result.error);
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
        toast.error(result.error);
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
        toast.error(result.error);
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
                disabled={baseRows.length <= 1}
                title={t("reorder")}
              >
                <ListOrdered className="h-4 w-4" />
                <span className="hidden sm:inline">{t("reorder")}</span>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="gap-2"
                    title={t("addSection")}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="hidden sm:inline">{t("addSection")}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => setBlockDialog({ name: "" })}
                  >
                    <Layers className="mr-2 h-4 w-4" />
                    {t("addBlock")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      setBreakDialog({ label: "", durationMinutes: "" })
                    }
                  >
                    <Coffee className="mr-2 h-4 w-4" />
                    {t("addBreak")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                className="gap-2"
                onClick={() => setIsDialogOpen(true)}
                title={t("addSong")}
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">{t("addSong")}</span>
              </Button>
            </>
          )}
        </div>
      </div>

      <div
        className={`bg-background rounded-md border ${isPending ? "pointer-events-none opacity-60" : ""}`}
      >
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">
                  {isReordering ? "" : t("table.pos")}
                </TableHead>
                <TableHead>{t("table.title")}</TableHead>
                <TableHead>{t("table.artist")}</TableHead>
                <TableHead>{t("table.bpm")}</TableHead>
                <TableHead className="text-right">
                  {!isReordering && t("table.actions")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayRows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
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
        existingSongIds={(
          setlistSongs || songRowsOnly.map((r) => r.song)
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
