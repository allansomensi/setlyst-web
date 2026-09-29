"use client";

import { useState, useMemo, useCallback, useDeferredValue } from "react";
import { useSearchParams } from "next/navigation";
import { usePageSize } from "@/hooks/use-page-size";
import { useSyncSearchParams } from "@/hooks/use-url-state";
import { buildSearchIndex, filterByIndexedSearch } from "@/lib/search";
import { DASHBOARD_SCROLL_ATTR } from "@/lib/scroll-into-dashboard";

export type SortDirection = "asc" | "desc" | null;

export interface SortConfig {
  key: string | null;
  direction: SortDirection;
}

export interface TableControlsOptions {
  /**
   * Keep search, sort and page in the query string (`q`, `sort`, `dir`,
   * `page`), so Back from a row lands on the same view. On by default.
   */
  syncUrl?: boolean;
  /** Prefix for the query keys, for a page with more than one table. */
  paramPrefix?: string;
}

function parseSort(key: string | null, dir: string | null): SortConfig {
  if (!key || (dir !== "asc" && dir !== "desc")) {
    return { key: null, direction: null };
  }
  return { key, direction: dir };
}

export function useTableControls<T>(
  data: T[],
  searchableKeys: readonly (keyof T)[],
  { syncUrl = true, paramPrefix = "" }: TableControlsOptions = {},
) {
  const params = useSearchParams();
  const param = (name: string) =>
    syncUrl ? (params?.get(`${paramPrefix}${name}`) ?? null) : null;

  const [itemsPerPage, setItemsPerPage] = usePageSize();
  const [search, setSearch] = useState(() => param("q") ?? "");
  const [sortConfig, setSortConfig] = useState<SortConfig>(() => {
    const key = param("sort");
    // Only columns the rows actually have; anything else is ignored.
    const known =
      key !== null && data.length > 0 && typeof data[0] === "object"
        ? key in (data[0] as object)
        : key !== null;
    return known ? parseSort(key, param("dir")) : parseSort(null, null);
  });
  const [requestedPage, setCurrentPage] = useState(() => {
    const page = Number(param("page"));
    return Number.isInteger(page) && page > 1 ? page : 1;
  });

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

  // The keystroke lands in the box at once; the (heavier) filtering of
  // the list follows when React gets to it, so typing never stutters.
  const deferredSearch = useDeferredValue(search);

  // Folded once per list, not once per keystroke (see lib/search.ts).
  const searchIndex = useMemo(
    () => buildSearchIndex(data, searchableKeys),
    [data, searchableKeys],
  );

  const filteredAndSortedData = useMemo(() => {
    // Case- and accent-insensitive: "cancao" finds "Canção".
    const result = filterByIndexedSearch(data, searchIndex, deferredSearch);

    if (sortConfig.key && sortConfig.direction) {
      const { key, direction } = sortConfig;
      result.sort((a, b) => {
        const aVal = a[key as keyof T];
        const bVal = b[key as keyof T];
        // Blanks last in either direction, and equal to each other: a
        // comparator that calls two blanks unequal isn't consistent, and
        // the engine may then order the rest arbitrarily.
        if (aVal == null && bVal == null) return 0;
        if (aVal == null) return 1;
        if (bVal == null) return -1;
        const cmp =
          typeof aVal === "number" && typeof bVal === "number"
            ? aVal - bVal
            : // "Track 2" before "Track 10", and case/accents don't split
              // "ábc" from "abc".
              String(aVal).localeCompare(String(bVal), undefined, {
                numeric: true,
                sensitivity: "base",
              });
        return direction === "asc" ? cmp : -cmp;
      });
    }

    return result;
  }, [data, searchIndex, deferredSearch, sortConfig]);

  const totalItems = filteredAndSortedData.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  // Clamped rather than trusted: deleting the last row on the last page,
  // or a search narrowing the results, would otherwise leave the table on
  // a page that no longer exists — an empty table with no way to tell why.
  const currentPage = Math.min(Math.max(1, requestedPage), totalPages);

  // Going to another page used to leave the view at the bottom, where the
  // pagination is, instead of at the first row of the new page. The
  // dashboard scrolls inside its own container (see
  // dashboard-scroll-area.tsx), not the window, so that's what moves.
  const changePage = useCallback(
    (page: number) => {
      setCurrentPage(page);
      if (page === currentPage || typeof document === "undefined") return;
      const container = document.querySelector(`[${DASHBOARD_SCROLL_ATTR}]`);
      if (!(container instanceof HTMLElement) || container.scrollTop === 0) {
        return;
      }
      const reduce = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      container.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
    },
    [currentPage],
  );

  const setPageSize = useCallback(
    (size: number) => {
      setItemsPerPage(size);
      setCurrentPage(1);
    },
    [setItemsPerPage],
  );

  useSyncSearchParams(
    {
      [`${paramPrefix}q`]: search.trim() || null,
      [`${paramPrefix}sort`]: sortConfig.direction ? sortConfig.key : null,
      [`${paramPrefix}dir`]: sortConfig.direction,
      [`${paramPrefix}page`]: currentPage > 1 ? String(currentPage) : null,
    },
    syncUrl,
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
    setCurrentPage: changePage,
    totalItems,
    pageSize: itemsPerPage,
    setPageSize,
  };
}
