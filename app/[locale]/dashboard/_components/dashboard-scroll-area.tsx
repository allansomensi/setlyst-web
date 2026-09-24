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

/**
 * The dashboard's scrolling area. The whole dashboard scrolls inside this
 * element rather than the window (see layout.tsx), so Next.js' own scroll
 * restoration never applied: Back from a song landed at the top of a long
 * list. This remembers the position per page for the session and puts it
 * back on Back/Forward.
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

  // Remember the position while scrolling (throttled to a frame).
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const key = KEY_PREFIX + pathname;
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        write(key, el.scrollTop);
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
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
      className={cn(className)}
    >
      {children}
    </div>
  );
}
