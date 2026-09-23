"use client";

import { useState, useMemo, useCallback } from "react";
import { usePageSize } from "@/hooks/use-page-size";
import { filterBySearch } from "@/lib/search";

export type SortDirection = "asc" | "desc" | null;

export interface SortConfig {
  key: string | null;
  direction: SortDirection;
}

export function useTableControls<T>(
  data: T[],
  searchableKeys: readonly (keyof T)[],
) {
  const [itemsPerPage, setItemsPerPage] = usePageSize();
  const [search, setSearch] = useState("");
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: null,
    direction: null,
  });
  const [requestedPage, setCurrentPage] = useState(1);

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
    // Always return to page 1 after a sort change so the user sees the
    // newly ordered results from the beginning instead of a potentially empty page.
    setCurrentPage(1);
  }, []);

  const filteredAndSortedData = useMemo(() => {
    // Case- and accent-insensitive: "cancao" finds "Canção".
    const result = filterBySearch(data, searchableKeys, search);

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
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  // Clamped rather than trusted: deleting the last row on the last page,
  // or a search narrowing the results, would otherwise leave the table on
  // a page that no longer exists — an empty table with no way to tell why.
  const currentPage = Math.min(Math.max(1, requestedPage), totalPages);

  const setPageSize = useCallback(
    (size: number) => {
      setItemsPerPage(size);
      setCurrentPage(1);
    },
    [setItemsPerPage],
  );

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
    pageSize: itemsPerPage,
    setPageSize,
  };
}
