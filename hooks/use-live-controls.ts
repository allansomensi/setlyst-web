"use client";

import { RefObject, useCallback, useEffect, useState } from "react";

const SCROLL_INTERVAL_MS = 50;
export const SCROLL_MIN = 0.25;
export const SCROLL_MAX = 8;
export const SCROLL_STEP = 0.25;

export const ZOOM_MIN = 0.5;
export const ZOOM_MAX = 3;
export const ZOOM_STEP = 0.1;

interface UseLiveControlsOptions {
  /** The account's Live Mode font size, as a percentage (50–300). */
  initialFontSize: number;
  /** The scrolling lyrics pane; auto-scroll drives its scrollTop. */
  scrollContainerRef: RefObject<HTMLElement | null>;
  /** Fit mode leaves nothing to scroll, so auto-scroll is suspended. */
  fitToScreen: boolean;
}

export interface LiveControls {
  zoomLevel: number;
  setZoom: (next: number) => void;
  stepZoom: (direction: 1 | -1) => void;
  isAutoScroll: boolean;
  setAutoScroll: (on: boolean) => void;
  toggleAutoScroll: () => void;
  scrollSpeed: number;
  stepScrollSpeed: (direction: 1 | -1) => void;
}

const round = (value: number) => Math.round(value * 100) / 100;

/**
 * The per-session reading controls shared by both Live Mode viewers (the
 * setlist one and the single-song one): text zoom and auto-scroll.
 *
 * These are deliberately session state rather than stored preferences —
 * zoom starts from the account's own setting every time, and auto-scroll
 * always starts stopped, so a song never begins moving on its own.
 */
export function useLiveControls({
  initialFontSize,
  scrollContainerRef,
  fitToScreen,
}: UseLiveControlsOptions): LiveControls {
  const [zoomLevel, setZoomLevel] = useState(initialFontSize / 100);
  const [isAutoScroll, setAutoScroll] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(1);

  const setZoom = useCallback((next: number) => {
    setZoomLevel(round(Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, next))));
  }, []);

  const stepZoom = useCallback((direction: 1 | -1) => {
    setZoomLevel((z) =>
      round(Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z + direction * ZOOM_STEP))),
    );
  }, []);

  const toggleAutoScroll = useCallback(() => setAutoScroll((on) => !on), []);

  const stepScrollSpeed = useCallback((direction: 1 | -1) => {
    setScrollSpeed((s) =>
      round(
        Math.min(SCROLL_MAX, Math.max(SCROLL_MIN, s + direction * SCROLL_STEP)),
      ),
    );
  }, []);

  useEffect(() => {
    // Nothing to scroll through when the whole song is already on screen.
    if (!isAutoScroll || fitToScreen) return;
    const interval = setInterval(() => {
      const el = scrollContainerRef.current;
      if (!el) return;
      el.scrollTop += scrollSpeed;
    }, SCROLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isAutoScroll, scrollSpeed, fitToScreen, scrollContainerRef]);

  return {
    zoomLevel,
    setZoom,
    stepZoom,
    // Reported as off while in fit mode, so no control shows a "running"
    // state for a scroll that can't happen.
    isAutoScroll: isAutoScroll && !fitToScreen,
    setAutoScroll,
    toggleAutoScroll,
    scrollSpeed,
    stepScrollSpeed,
  };
}
