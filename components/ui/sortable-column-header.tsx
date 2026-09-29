"use client";

import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { TableHead } from "@/components/ui/table";
import { type SortConfig } from "@/hooks/use-table-controls";
import { cn } from "@/lib/utils";

interface SortableColumnHeaderProps {
  label: string;
  sortKey: string;
  sortConfig: SortConfig;
  onSort: (key: string) => void;
  className?: string;
}

/**
 * A column header that sorts the table. The click target is a real button
 * inside the cell (a clickable `<th>` can't be reached or activated from
 * the keyboard); it fills the cell so the whole header stays clickable.
 */
export function SortableColumnHeader({
  label,
  sortKey,
  sortConfig,
  onSort,
  className,
}: SortableColumnHeaderProps) {
  const isActive = sortConfig.key === sortKey;

  const Icon = isActive
    ? sortConfig.direction === "asc"
      ? ArrowUp
      : ArrowDown
    : ArrowUpDown;

  return (
    <TableHead
      className={cn("hover:bg-muted/50 p-0 transition-colors", className)}
      aria-sort={
        isActive
          ? sortConfig.direction === "asc"
            ? "ascending"
            : "descending"
          : "none"
      }
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className="focus-visible:ring-ring/50 flex h-10 w-full cursor-pointer items-center gap-1.5 rounded-sm px-2 text-left font-medium outline-none select-none focus-visible:ring-3 focus-visible:ring-inset"
      >
        {label}
        <Icon
          aria-hidden
          className={cn(
            "h-3.5 w-3.5 shrink-0 transition-colors",
            isActive ? "text-foreground" : "text-muted-foreground/50",
          )}
        />
      </button>
    </TableHead>
  );
}
