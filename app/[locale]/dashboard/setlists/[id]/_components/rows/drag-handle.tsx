"use client";

import { GripVertical } from "lucide-react";
import { useTranslations } from "next-intl";
import type { SortableRowHandle } from "./use-sortable-row";

/** The grip used to drag a row (keyboard: focus it, Space, arrows). */
export function DragHandle({ attributes, listeners }: SortableRowHandle) {
  const t = useTranslations("setlists.songs");
  return (
    <div
      {...attributes}
      {...listeners}
      aria-label={t("dragHandle")}
      className="hover:bg-accent focus-visible:ring-ring flex h-8 w-8 cursor-grab touch-none items-center justify-center rounded focus-visible:ring-2 focus-visible:outline-none active:cursor-grabbing"
      onClick={(e) => e.stopPropagation()}
    >
      <GripVertical className="text-muted-foreground h-4 w-4" aria-hidden />
    </div>
  );
}
