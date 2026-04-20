"use client";

import { useState, useMemo, useCallback } from "react";

export type SortDirection = "asc" | "desc" | null;

export interface SortConfig {
  key: string | null;
  direction: SortDirection;
}

export function useTableControls<T>(
  data: T[],
  searchableKeys: readonly (keyof T)[],
  itemsPerPage: number = 10,
) {
  const [search, setSearch] = useState("");
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: null,
    direction: null,
  });
  const [currentPage, setCurrentPage] = useState(1);

  const handleSearch = useCallback((term: string) => {
    setSearch(term);
    setCurrentPage(1);
  }, []);

  const handleSort = useCallback((key: string) => {
    setSortConfig((prev) => {
      if (prev.key !== key) return { key, direction: "asc" };
      if (prev.direction === "asc") return { key, direction: "desc" };
      return { key: null, direction: null };
    });
  }, []);

  const filteredAndSortedData = useMemo(() => {
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

  const totalItems = filteredAndSortedData.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const processedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedData.slice(start, start + itemsPerPage);
  }, [filteredAndSortedData, currentPage, itemsPerPage]);

  return {
    search,
    setSearch: handleSearch,
    sortConfig,
    handleSort,
    processedData,
    currentPage,
    totalPages,
    setCurrentPage,
    totalItems,
  };
}
