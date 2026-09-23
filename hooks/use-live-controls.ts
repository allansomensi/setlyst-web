"use client";

import { RefObject, useCallback, useEffect, useRef, useState } from "react";

/** 1× = the old 1px-per-50ms pace, which people have tuned their speeds to. */
const PIXELS_PER_SECOND_AT_1X = 20;
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

    // Driven by animation frames with a fractional accumulator rather than
    // adding `speed` px to scrollTop on a timer: several browsers round
    // scrollTop to whole pixels, so slow speeds (0.25–0.75) never moved at
    // all, and a timer drifts and stutters against the display's refresh.
    let frame = 0;
    let last = performance.now();
    let carry = 0;

    const step = (now: number) => {
      const el = scrollContainerRef.current;
      const elapsed = Math.min(100, now - last);
      last = now;
      if (el) {
        carry += (scrollSpeed * PIXELS_PER_SECOND_AT_1X * elapsed) / 1000;
        const whole = Math.floor(carry);
        if (whole > 0) {
          el.scrollTop += whole;
          carry -= whole;
        }
        // Stop at the end of the song instead of "running" invisibly.
        if (el.scrollTop + el.clientHeight >= el.scrollHeight - 1) {
          setAutoScroll(false);
          return;
        }
      }
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
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

export interface LiveShortcutHandlers {
  /** Next / previous song (setlist Live Mode only). */
  onNext?: () => void;
  onPrev?: () => void;
  toggleAutoScroll: () => void;
  stepScrollSpeed: (direction: 1 | -1) => void;
  toggleMetronome: () => void;
  toggleChords: () => void;
  toggleSections: () => void;
  shiftTranspose: (semitones: 1 | -1) => void;
  /** Fit mode has nothing to scroll: Space does nothing then. */
  fitToScreen: boolean;
  /** True while something else owns the keyboard (the settings sheet). */
  disabled?: boolean;
}

/**
 * Live Mode's keyboard shortcuts, shared by both viewers:
 *
 *  - → / PageDown, ← / PageUp: next / previous song (when given)
 *  - Space: start or stop auto-scroll; + / -: its speed
 *  - M: metronome; C: chords; S: section labels
 *  - , / .: transpose down / up a semitone
 *
 * Ignored while typing in a field or with a modifier held (so browser
 * shortcuts keep working). Page-turner pedals send PageDown/PageUp or the
 * arrow keys, which is why both are mapped.
 */
export function useLiveKeyboardShortcuts(handlers: LiveShortcutHandlers) {
  // Latest handlers without re-binding the listener on every render.
  const ref = useRef(handlers);
  useEffect(() => {
    ref.current = handlers;
  });

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const h = ref.current;
      if (
        h.disabled ||
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey
      ) {
        return;
      }

      switch (event.key) {
        case "ArrowRight":
        case "PageDown":
          if (h.onNext) {
            event.preventDefault();
            h.onNext();
          }
          break;
        case "ArrowLeft":
        case "PageUp":
          if (h.onPrev) {
            event.preventDefault();
            h.onPrev();
          }
          break;
        case " ":
          event.preventDefault();
          if (!h.fitToScreen) h.toggleAutoScroll();
          break;
        case "m":
        case "M":
          h.toggleMetronome();
          break;
        case "c":
        case "C":
          h.toggleChords();
          break;
        case "s":
        case "S":
          h.toggleSections();
          break;
        case ",":
        case "<":
          h.shiftTranspose(-1);
          break;
        case ".":
        case ">":
          h.shiftTranspose(1);
          break;
        case "+":
        case "=":
          h.stepScrollSpeed(1);
          break;
        case "-":
          h.stepScrollSpeed(-1);
          break;
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
