"use client";

import { useState, useMemo, useCallback } from "react";

export type SortDirection = "asc" | "desc" | null;

export interface SortConfig {
  key: string | null;
  direction: SortDirection;
}

export function useTableControls<T extends Record<string, unknown>>(
  data: T[],
  searchableKeys: (keyof T)[],
) {
  const [search, setSearch] = useState("");
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: null,
    direction: null,
  });

  const handleSort = useCallback((key: string) => {
    setSortConfig((prev) => {
      if (prev.key !== key) return { key, direction: "asc" };
      if (prev.direction === "asc") return { key, direction: "desc" };
      return { key: null, direction: null };
    });
  }, []);

  const processedData = useMemo(() => {
    let result = [...data];

    if (search.trim()) {
      const term = search.toLowerCase();
      result = result.filter((item) =>
        searchableKeys.some((key) => {
          const val = item[key];
          return typeof val === "string" && val.toLowerCase().includes(term);
        }),
      );
    }

    if (sortConfig.key && sortConfig.direction) {
      const { key, direction } = sortConfig;
      result.sort((a, b) => {
        const aVal = a[key as keyof T];
        const bVal = b[key as keyof T];
        if (aVal == null) return 1;
        if (bVal == null) return -1;
        const cmp =
          typeof aVal === "number" && typeof bVal === "number"
            ? aVal - bVal
            : String(aVal).localeCompare(String(bVal));
        return direction === "asc" ? cmp : -cmp;
      });
    }

    return result;
  }, [data, search, searchableKeys, sortConfig]);

  return {
    search,
    setSearch,
    sortConfig,
    handleSort,
    processedData,
  };
}
