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
      className={cn(
        "hover:bg-muted/50 cursor-pointer transition-colors select-none",
        className,
      )}
      onClick={() => onSort(sortKey)}
      aria-sort={
        isActive
          ? sortConfig.direction === "asc"
            ? "ascending"
            : "descending"
          : "none"
      }
    >
      <div className="flex items-center gap-1.5">
        {label}
        <Icon
          className={cn(
            "h-3.5 w-3.5 shrink-0 transition-colors",
            isActive ? "text-foreground" : "text-muted-foreground/50",
          )}
        />
      </div>
    </TableHead>
  );
}
