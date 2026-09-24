"use client";

import { ChevronDown, ChevronUp, GripVertical } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import type { SortableRowHandle } from "./use-sortable-row";

/**
 * The grip used to drag a row (keyboard: focus it, Space, arrows). Named
 * after the row, so a screen reader says which song it is about to move.
 */
export function DragHandle({
  attributes,
  listeners,
  label,
}: SortableRowHandle & { label: string }) {
  const t = useTranslations("setlists.songs");
  return (
    <div
      {...attributes}
      {...listeners}
      aria-label={t("dragHandleFor", { title: label })}
      aria-roledescription={t("dnd.roleDescription")}
      className="hover:bg-accent focus-visible:ring-ring flex size-8 cursor-grab touch-none items-center justify-center rounded focus-visible:ring-2 focus-visible:outline-none active:cursor-grabbing pointer-coarse:size-10"
      onClick={(e) => e.stopPropagation()}
    >
      <GripVertical className="text-muted-foreground h-4 w-4" aria-hidden />
    </div>
  );
}

/** Moving a row one step without dragging (WCAG 2.5.7). */
export interface RowMove {
  canUp: boolean;
  canDown: boolean;
  onMove: (delta: -1 | 1) => void;
}

/**
 * "Move up" / "Move down" for a row in reorder mode: the single-tap
 * alternative to dragging, for people who can't drag (or would rather
 * not on a small screen).
 */
export function MoveButtons({ label, move }: { label: string; move: RowMove }) {
  const t = useTranslations("setlists.songs");
  return (
    <div className="flex justify-end gap-0.5">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="text-muted-foreground"
        onClick={(e) => {
          e.stopPropagation();
          move.onMove(-1);
        }}
        disabled={!move.canUp}
        aria-label={t("moveUp", { title: label })}
        title={t("moveUp", { title: label })}
      >
        <ChevronUp className="h-4 w-4" aria-hidden />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="text-muted-foreground"
        onClick={(e) => {
          e.stopPropagation();
          move.onMove(1);
        }}
        disabled={!move.canDown}
        aria-label={t("moveDown", { title: label })}
        title={t("moveDown", { title: label })}
      >
        <ChevronDown className="h-4 w-4" aria-hidden />
      </Button>
    </div>
  );
}
