"use client";

import type { CSSProperties } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

/** `useSortable` plus the row style every sortable row uses. */
export function useSortableRow(id: string) {
  const sortable = useSortable({ id });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
    zIndex: sortable.isDragging ? 10 : "auto",
    opacity: sortable.isDragging ? 0.5 : 1,
  };
  return { ...sortable, style };
}

export type SortableRowHandle = Pick<
  ReturnType<typeof useSortable>,
  "attributes" | "listeners"
>;
