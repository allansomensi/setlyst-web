"use client";

import { Layers } from "lucide-react";
import { useTranslations } from "next-intl";
import { TableCell, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { DragHandle, MoveButtons, type RowMove } from "./drag-handle";
import { MarkerActions } from "./marker-actions";
import type { BlockRow as BlockRowData } from "./types";
import { useSortableRow } from "./use-sortable-row";

export function SortableBlockRow({
  row,
  isReordering,
  onEdit,
  onDelete,
  actionsDisabled,
  move,
}: {
  row: BlockRowData;
  isReordering: boolean;
  onEdit: () => void;
  onDelete: () => void;
  actionsDisabled: boolean;
  /** Reorder mode: move one step up/down without dragging. */
  move?: RowMove;
}) {
  const t = useTranslations("setlists.songs");
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
        {isReordering && move && <MoveButtons label={label} move={move} />}
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
