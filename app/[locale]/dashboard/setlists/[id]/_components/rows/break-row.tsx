"use client";

import { Coffee } from "lucide-react";
import { useTranslations } from "next-intl";
import { TableCell, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { DragHandle } from "./drag-handle";
import { MarkerActions } from "./marker-actions";
import type { BreakRow as BreakRowData } from "./types";
import { useSortableRow } from "./use-sortable-row";

export function SortableBreakRow({
  row,
  isReordering,
  onEdit,
  onDelete,
  actionsDisabled,
}: {
  row: BreakRowData;
  isReordering: boolean;
  onEdit: () => void;
  onDelete: () => void;
  actionsDisabled: boolean;
}) {
  const t = useTranslations("setlists.songs");
  const { attributes, listeners, setNodeRef, isDragging, style } =
    useSortableRow(row.id);

  const minutes = row.durationMinutes ?? 0;
  const hasDuration = minutes > 0;

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
          <Coffee className="text-muted-foreground h-4 w-4" aria-hidden />
        )}
      </TableCell>
      <TableCell>
        <div className="text-muted-foreground flex items-center gap-2 py-0.5 italic">
          <span className="truncate">
            {row.label || t("breakDefaultLabel")}
          </span>
          {hasDuration && (
            <span className="text-xs not-italic sm:hidden">
              ({t("breakMinutes", { count: minutes })})
            </span>
          )}
        </div>
      </TableCell>
      <TableCell className="hidden md:table-cell" />
      <TableCell className="hidden sm:table-cell">
        {hasDuration && (
          <span className="text-muted-foreground font-mono text-sm">
            {t("breakMinutes", { count: minutes })}
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
