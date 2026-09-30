"use client";

import { useEffect } from "react";

/**
 * Marks the table-of-contents link of the section being read
 * (`aria-current="location"`), so the sidebar of a long document shows
 * where the reader is. The links are server-rendered; this only toggles
 * the attribute on them, which React never manages.
 */
export function TocScrollSpy({
  navId,
  sectionIds,
}: {
  navId: string;
  /** In document order. */
  sectionIds: string[];
}) {
  const key = sectionIds.join(" ");

  useEffect(() => {
    const nav = document.getElementById(navId);
    if (!nav || typeof IntersectionObserver === "undefined") return;
    const ids = key.split(" ");
    const linkOf = (id: string) =>
      nav.querySelector<HTMLAnchorElement>(`a[href="#${CSS.escape(id)}"]`);
    const visible = new Set<string>();
    let active: string | null = null;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        }
        // The first section (in reading order) inside the band; when none
        // is (a long gap between headings), the last one stays marked.
        const next = ids.find((id) => visible.has(id)) ?? active;
        if (next === active) return;
        if (active) linkOf(active)?.removeAttribute("aria-current");
        if (next) linkOf(next)?.setAttribute("aria-current", "location");
        active = next;
      },
      // The upper part of the viewport, below the sticky site header.
      { rootMargin: "-96px 0px -55% 0px" },
    );
    for (const id of ids) {
      const section = document.getElementById(id);
      if (section) observer.observe(section);
    }
    return () => {
      observer.disconnect();
      if (active) linkOf(active)?.removeAttribute("aria-current");
    };
  }, [navId, key]);

  return null;
}
