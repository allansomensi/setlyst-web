"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { DASHBOARD_SCROLL_ATTR } from "@/lib/scroll-into-dashboard";
import { cn } from "@/lib/utils";
// Loaded with the dashboard shell so the browser's one-time
// `beforeinstallprompt` is captured whichever page it fires on (it is used
// by "Install the app" in Settings and on the home checklist).
import "@/hooks/use-install-prompt";

const KEY_PREFIX = "setlyst:scroll:";
/** How long to keep trying while a page streams in (ms). */
const RESTORE_WINDOW_MS = 1500;

/**
 * Set on Back/Forward, consumed by the next pathname change: only those
 * return to where the page was left. A link click starts at the top, as
 * everywhere else on the web.
 */
let restoreOnNextPath = false;
if (typeof window !== "undefined") {
  window.addEventListener("popstate", () => {
    restoreOnNextPath = true;
  });
}

function read(key: string): number | null {
  try {
    const value = Number(window.sessionStorage.getItem(key));
    return Number.isFinite(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

function write(key: string, value: number) {
  try {
    window.sessionStorage.setItem(key, String(Math.round(value)));
  } catch {
    // Not remembered; Back just starts at the top.
  }
}

/** How long scrolling must pause before the position is saved. */
const SAVE_DELAY_MS = 150;

/**
 * The dashboard's scrolling area. The whole dashboard scrolls inside this
 * element rather than the window (see layout.tsx), so Next.js' own scroll
 * restoration never applied: Back from a song landed at the top of a long
 * list. This remembers the position per page for the session and puts it
 * back on Back/Forward.
 *
 * Always `relative`: an absolutely positioned descendant (`sr-only`
 * labels, a hidden file input) whose nearest positioned ancestor is the
 * page itself is laid out at its place deep in the scrolled content but is
 * neither scrolled nor clipped by this box. It then stretches the document
 * past the viewport, adding a second, outer scrollbar that moves the
 * whole dashboard, sidebar included, out of view (Settings, a long page
 * with several of them, showed it).
 */
export function DashboardScrollArea({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // Remember the position once scrolling pauses: sessionStorage writes
  // are synchronous, and one per frame competed with the scrolling itself
  // on low-end phones. A pending write is flushed when the page changes.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const key = KEY_PREFIX + pathname;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let lastTop = el.scrollTop;
    const flush = () => {
      timer = undefined;
      write(key, lastTop);
    };
    const onScroll = () => {
      lastTop = el.scrollTop;
      if (timer) clearTimeout(timer);
      timer = setTimeout(flush, SAVE_DELAY_MS);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      if (timer) {
        clearTimeout(timer);
        flush();
      }
    };
  }, [pathname]);

  // Put it back after Back/Forward, once the page is tall enough (the
  // content may still be streaming in).
  useEffect(() => {
    if (!restoreOnNextPath) return;
    restoreOnNextPath = false;
    const el = ref.current;
    const target = read(KEY_PREFIX + pathname);
    if (!el || target === null) return;

    const started = performance.now();
    let frame = 0;
    const attempt = () => {
      if (el.scrollHeight - el.clientHeight >= target) {
        el.scrollTop = target;
        return;
      }
      if (performance.now() - started < RESTORE_WINDOW_MS) {
        frame = requestAnimationFrame(attempt);
      } else {
        el.scrollTop = target;
      }
    };
    frame = requestAnimationFrame(attempt);
    return () => cancelAnimationFrame(frame);
  }, [pathname]);

  return (
    <div
      ref={ref}
      {...{ [DASHBOARD_SCROLL_ATTR]: "" }}
      className={cn("relative", className)}
    >
      {children}
    </div>
  );
}
