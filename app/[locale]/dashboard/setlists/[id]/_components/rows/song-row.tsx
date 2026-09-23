"use client";

import { Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { cn, formatDuration } from "@/lib/utils";
import { DragHandle } from "./drag-handle";
import type { SongRow as SongRowData } from "./types";
import { useSortableRow } from "./use-sortable-row";

export function SortableSongRow({
  row,
  songNumber,
  onRemove,
  onPlay,
  isReordering,
  actionsDisabled,
}: {
  row: SongRowData;
  songNumber: number;
  onRemove: (songId: string) => void;
  onPlay: (songId: string) => void;
  isReordering: boolean;
  actionsDisabled: boolean;
}) {
  const t = useTranslations("setlists.songs");
  const { song } = row;
  const { attributes, listeners, setNodeRef, isDragging, style } =
    useSortableRow(row.id);

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className={cn(
        isDragging && "bg-muted",
        !isReordering && "hover:bg-muted/50 group cursor-pointer",
      )}
      onClick={() => {
        if (!isReordering) onPlay(song.id);
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
          {isReordering ? (
            <span className="truncate font-medium">{song.title}</span>
          ) : (
            // A real button, so the row is reachable and usable with the
            // keyboard (the row click is a mouse/touch convenience).
            <button
              type="button"
              className="focus-visible:ring-ring truncate rounded-sm text-left font-medium hover:underline focus-visible:ring-2 focus-visible:outline-none"
              onClick={(e) => {
                e.stopPropagation();
                onPlay(song.id);
              }}
              aria-label={t("playSong", { title: song.title })}
            >
              {song.title}
            </button>
          )}
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
              onRemove(song.id);
            }}
            disabled={actionsDisabled}
            aria-label={t("removeSong")}
            title={t("removeSong")}
          >
            <Trash2 className="h-4 w-4" aria-hidden />
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}
