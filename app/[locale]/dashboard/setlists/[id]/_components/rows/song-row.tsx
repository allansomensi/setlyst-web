"use client";

import { Archive, CopyPlus, RefreshCw, Trash2 } from "lucide-react";
import { useLocale, useTimeZone, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { cn, formatDuration } from "@/lib/utils";
import { DragHandle, MoveButtons, type RowMove } from "./drag-handle";
import type { BandCopyStatus } from "@/types/api";
import type { SongRow as SongRowData } from "./types";
import { useSortableRow } from "./use-sortable-row";
import { SongKeyPicker } from "./song-key-picker";
import { UserAvatar } from "@/components/user-avatar";
import { formatApiDateTime } from "@/lib/dates";

export function SortableSongRow({
  setlistId,
  canEditKey,
  row,
  songNumber,
  onRemove,
  onPlay,
  isReordering,
  canEdit = true,
  actionsDisabled,
  move,
  update,
  onUpdate,
  removeLabel,
  showAddedBy = false,
  onCopy,
  copyDisabled = false,
}: {
  setlistId: string;
  /** May change the key the setlist plays this song in. */
  canEditKey: boolean;
  row: SongRowData;
  songNumber: number;
  onRemove: (songId: string) => void;
  onPlay: (songId: string) => void;
  /** The person's own version of this band song changed since. */
  update?: BandCopyStatus;
  onUpdate?: (copy: BandCopyStatus) => void;
  /** Overrides "Remove from setlist" (the repertoire's removal differs). */
  removeLabel?: string;
  isReordering: boolean;
  /**
   * May change the running order. Without it (a viewer, a band member
   * without `manage_setlists`) the remove button isn't shown at all.
   */
  canEdit?: boolean;
  /** Writes are unavailable (offline, a save running): buttons disabled. */
  actionsDisabled: boolean;
  /** Reorder mode: move one step up/down without dragging. */
  move?: RowMove;
  /** Show who added the song (shared and band setlists). */
  showAddedBy?: boolean;
  /**
   * Offered when the song isn't in the person's library (someone else's,
   * or held by the setlist): copies it there.
   */
  onCopy?: (songId: string) => void;
  copyDisabled?: boolean;
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
          <DragHandle
            attributes={attributes}
            listeners={listeners}
            label={song.title}
          />
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
          {song.version_label && (
            <Badge
              variant="secondary"
              className="h-5 max-w-32 shrink-0 truncate px-1.5 text-[10px]"
            >
              {song.version_label}
            </Badge>
          )}
          <SongKeyPicker
            setlistId={setlistId}
            songId={song.id}
            title={song.title}
            tonality={song.tonality}
            transpose={song.transpose ?? 0}
            editable={canEditKey && !isReordering}
          />
          {song.held && (
            <Badge
              variant="outline"
              className="text-muted-foreground h-5 shrink-0 gap-1 px-1.5 text-[10px] font-normal"
              title={t("heldHint")}
            >
              <Archive className="h-3 w-3" aria-hidden />
              <span className="hidden sm:inline">{t("held")}</span>
              <span className="sr-only sm:hidden">{t("held")}</span>
            </Badge>
          )}
          {showAddedBy && song.added_by && song.added_by_username && (
            <AddedBy
              userId={song.added_by}
              username={song.added_by_username}
              avatarUrl={song.added_by_avatar_url ?? null}
              addedAt={song.added_at ?? null}
            />
          )}
          {update && !isReordering && (
            <Badge
              asChild
              variant="secondary"
              className="border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 h-5 shrink-0 cursor-pointer gap-1 px-1.5 text-[10px]"
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdate?.(update);
                }}
                title={t("newVersionHint")}
                aria-label={t("newVersionFor", { title: song.title })}
              >
                <RefreshCw className="h-3 w-3" aria-hidden />
                <span className="hidden sm:inline">{t("newVersion")}</span>
              </button>
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
      <TableCell className="w-12 text-right whitespace-nowrap">
        {isReordering && move && <MoveButtons label={song.title} move={move} />}
        {!isReordering && onCopy && (
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-primary relative z-10"
            onClick={(e) => {
              e.stopPropagation();
              onCopy(song.id);
            }}
            disabled={copyDisabled}
            aria-label={t("copyToLibraryFor", { title: song.title })}
            title={t("copyToLibrary")}
          >
            <CopyPlus className="h-4 w-4" aria-hidden />
          </Button>
        )}
        {!isReordering && canEdit && (
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive relative z-10"
            onClick={(e) => {
              e.stopPropagation();
              onRemove(song.id);
            }}
            disabled={actionsDisabled}
            aria-label={removeLabel ?? t("removeSong")}
            title={removeLabel ?? t("removeSong")}
          >
            <Trash2 className="h-4 w-4" aria-hidden />
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}

/**
 * Who put the song in the setlist: a small avatar, with the name and date
 * on hover (and for screen readers).
 */
function AddedBy({
  userId,
  username,
  avatarUrl,
  addedAt,
}: {
  userId: string;
  username: string;
  avatarUrl: string | null;
  addedAt: string | null;
}) {
  const t = useTranslations("setlists.songs");
  const locale = useLocale();
  const timeZone = useTimeZone();
  const label = addedAt
    ? t("addedByOn", {
        username,
        date: formatApiDateTime(addedAt, locale, timeZone),
      })
    : t("addedBy", { username });

  return (
    <span className="ml-auto flex shrink-0 items-center" title={label}>
      <UserAvatar
        userId={userId}
        name={username}
        avatarUrl={avatarUrl}
        size="xs"
        className="size-5 text-[9px]"
      />
      <span className="sr-only">{label}</span>
    </span>
  );
}
