"use client";

import { Layers } from "lucide-react";
import { useTranslations } from "next-intl";
import { TableCell, TableRow } from "@/components/ui/table";
import { cn, formatDuration } from "@/lib/utils";
import { DragHandle, MoveButtons, type RowMove } from "./drag-handle";
import { MarkerActions } from "./marker-actions";
import type { BlockRow as BlockRowData } from "./types";
import { useSortableRow } from "./use-sortable-row";

export function SortableBlockRow({
  row,
  songCount,
  duration,
  isReordering,
  onEdit,
  onDelete,
  canEdit = true,
  actionsDisabled,
  move,
}: {
  row: BlockRowData;
  /** Songs from this block to the next one. */
  songCount: number;
  /** Their running time in seconds (breaks not included). */
  duration: number;
  isReordering: boolean;
  onEdit: () => void;
  onDelete: () => void;
  /** May edit the running order; without it, no edit/delete buttons. */
  canEdit?: boolean;
  actionsDisabled: boolean;
  /** Reorder mode: move one step up/down without dragging. */
  move?: RowMove;
}) {
  const t = useTranslations("setlists.songs");
  const tSetlists = useTranslations("setlists");
  const { attributes, listeners, setNodeRef, isDragging, style } =
    useSortableRow(row.id);
  const label = row.name;

  // Same cells (and the same responsive hiding) as a song row, so the
  // columns line up at every width; the name sits in the title column.
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
          <DragHandle
            attributes={attributes}
            listeners={listeners}
            label={label}
          />
        ) : (
          <Layers className="text-primary h-4 w-4" aria-hidden />
        )}
      </TableCell>
      {/* `w-full max-w-0` as in a song row: without a width cap the cell
          grows with a long name and `truncate` never kicks in. */}
      <TableCell className="w-full max-w-0">
        <div className="flex min-w-0 items-center gap-2 py-0.5">
          {/* The name comes first: it keeps up to 70% of the cell, and the
              summary beside it is what gets cut on a narrow phone. */}
          <span className="text-primary max-w-[70%] shrink-0 truncate font-semibold tracking-wide uppercase">
            {row.name}
          </span>
          {/* How big the set is, for planning a show against the clock:
              "Block · 5 songs", and the time in the duration column (on
              a phone, where that column is hidden, right here). */}
          <span className="text-muted-foreground min-w-0 truncate text-xs font-normal normal-case">
            <span className="hidden sm:inline">
              {t("blockSummary", { count: songCount })}
            </span>
            {/* Shorter on a phone, where the time has no column. */}
            <span className="sm:hidden">
              {tSetlists("songCount", { count: songCount })}
              {duration > 0 && (
                <>
                  {" · "}
                  <span className="font-mono tabular-nums">
                    {formatDuration(duration)}
                  </span>
                </>
              )}
            </span>
          </span>
        </div>
      </TableCell>
      <TableCell className="hidden md:table-cell" />
      <TableCell className="hidden sm:table-cell">
        {duration > 0 && (
          <span
            className="text-primary/80 font-mono text-sm font-medium tabular-nums"
            title={t("blockDuration")}
          >
            {formatDuration(duration)}
          </span>
        )}
      </TableCell>
      <TableCell />
      <TableCell className="text-right">
        {isReordering && move && <MoveButtons label={label} move={move} />}
        {!isReordering && canEdit && (
          <MarkerActions
            name={label}
            onEdit={onEdit}
            onDelete={onDelete}
            disabled={actionsDisabled}
          />
        )}
      </TableCell>
    </TableRow>
  );
}
