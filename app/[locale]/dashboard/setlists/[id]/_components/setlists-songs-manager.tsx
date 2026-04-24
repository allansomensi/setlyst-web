"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Song, Artist } from "@/types/api";
import { removeSongFromSetlist, reorderSetlistSongs } from "../../actions";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus,
  Trash2,
  GripVertical,
  ListOrdered,
  Check,
  X,
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
  setlistSongs: Song[];
  allSongs: Song[];
  artists: Artist[];
}

function SortableRow({
  song,
  index,
  getArtistName,
  handleRemove,
  handlePlay,
  isReordering,
}: {
  song: Song;
  index: number;
  getArtistName: (id: string) => string;
  handleRemove: (id: string) => void;
  handlePlay: (id: string) => void;
  isReordering: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: song.id });

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
          <span className="text-muted-foreground font-medium">{index + 1}</span>
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
      <TableCell>{getArtistName(song.artist_id)}</TableCell>
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

export function SetlistSongsManager({
  setlistId,
  setlistSongs,
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
  const [items, setItems] = useState<Song[]>([]);

  const displayItems = isReordering ? items : setlistSongs || [];

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const getArtistName = (artistId: string) => {
    const artist = artists.find((a) => a.id === artistId);
    return artist ? artist.name : "Unknown Artist";
  };

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
      const songIds = items.map((s) => s.id);
      const result = await reorderSetlistSongs(setlistId, songIds);

      if (result.success) {
        toast.success(t("orderSaved"));
        setIsReordering(false);
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
    router.push(`/dashboard/setlists/${setlistId}/live?songId=${songId}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">{t("title")}</h2>
        <div className="flex items-center gap-2">
          {isReordering ? (
            <>
              <Button
                variant="ghost"
                onClick={handleCancel}
                disabled={isPending}
              >
                <X className="mr-2 h-4 w-4" /> {t("cancelReorder")}
              </Button>
              <Button onClick={handleSaveOrder} disabled={isPending}>
                <Check className="mr-2 h-4 w-4" /> {t("saveOrder")}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setItems(setlistSongs || []);
                  setIsReordering(true);
                }}
                disabled={(setlistSongs?.length || 0) <= 1}
              >
                <ListOrdered className="mr-2 h-4 w-4" /> {t("reorder")}
              </Button>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> {t("addSong")}
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
              {displayItems.length === 0 ? (
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
                  items={displayItems.map((s) => s.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {displayItems.map((song, index) => (
                    <SortableRow
                      key={song.id}
                      song={song}
                      index={index}
                      getArtistName={getArtistName}
                      handleRemove={handleRemoveClick}
                      handlePlay={handlePlay}
                      isReordering={isReordering}
                    />
                  ))}
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
        currentCount={displayItems.length}
        existingSongIds={displayItems.map((s) => s.id)}
      />
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
    </div>
  );
}
