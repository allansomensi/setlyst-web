"use client";

import { RefObject, useLayoutEffect, useState } from "react";

/**
 * Smallest size we'll shrink to (rem) — 14px — before giving up. Below
 * this, lyrics stop being readable from a mic stand, which defeats the
 * point of having them all on screen.
 */
export const FIT_MIN_FONT_REM = 0.875;
/** Stop the search once the bounds are this close (rem). */
const PRECISION_REM = 0.02;
/** Only switch to more columns if it buys at least this much text size. */
const COLUMN_GAIN_THRESHOLD_REM = 0.05;

/*
 * Column count allowed per available width (px). A column narrower than
 * roughly this makes chord lines wrap mid-phrase, which costs more
 * readability than the larger text gains.
 */
const MIN_COLUMN_WIDTH_PX = 340;
const MAX_COLUMNS = 3;

export interface FitResult {
  /** Chosen size in rem. */
  fontSize: number;
  columns: number;
  /** Doesn't fit even at the minimum size; the area scrolls instead. */
  overflows: boolean;
}

interface UseFitToScreenOptions {
  enabled: boolean;
  /** The scroll area — its inner (padding-box minus padding) size is the budget. */
  containerRef: RefObject<HTMLElement | null>;
  /** Element whose font-size / column-count this hook drives. */
  contentRef: RefObject<HTMLElement | null>;
  /** Upper bound (rem) — the reader's own zoom level, so fit only ever shrinks. */
  maxFontSize: number;
  /**
   * Anything that changes what's rendered (lyrics, chords on/off, font
   * family, transpose…). A change re-runs the fit.
   */
  contentKey: string;
}

/**
 * "Whole song on one screen" for Live Mode.
 *
 * Some performers don't want to scroll at all — no auto-scroll to keep in
 * time with, no hand off the instrument to swipe. This finds the largest
 * text size (up to the reader's chosen zoom) at which the entire song fits
 * in the visible area, spreading it over up to three columns on screens
 * wide enough for that to help. (The spacing around lines and section
 * headings is switched to `em` in this mode — see globals.css — so it
 * shrinks along with the text instead of eating the space it frees up.)
 *
 * How "fits" is measured: the content element gets a fixed height and
 * multi-column layout with `column-fill: auto`. Anything that doesn't fit
 * spills into extra columns *to the right*, past the element's width, so
 * `scrollWidth > clientWidth` is an exact overflow test for any column
 * count — including one. For each allowed column count, a binary search
 * finds the largest size that passes; the winner is the column count with
 * the largest text (ties go to fewer columns, which read more naturally).
 *
 * All of the trial layouts happen synchronously inside a layout effect,
 * before paint, so the reader never sees the intermediate sizes — only the
 * final one.
 *
 * If nothing fits even at FIT_MIN_FONT_REM, it goes back to the reader's
 * own size in a single scrolling column and says so. Shrinking the text
 * to the minimum *and* still having to scroll would be the worst of both.
 */
export function useFitToScreen({
  enabled,
  containerRef,
  contentRef,
  maxFontSize,
  contentKey,
}: UseFitToScreenOptions): FitResult | null {
  const [result, setResult] = useState<FitResult | null>(null);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;

    const clear = () => {
      content.style.fontSize = "";
      content.style.columnCount = "";
      content.style.height = "";
    };

    if (!enabled) {
      // The stale result is harmless: the hook returns null while disabled,
      // and the next enable re-fits before paint.
      clear();
      return;
    }

    const upper = Math.max(FIT_MIN_FONT_REM, maxFontSize);

    const fit = () => {
      const styles = window.getComputedStyle(container);
      const availableHeight =
        container.clientHeight -
        parseFloat(styles.paddingTop) -
        parseFloat(styles.paddingBottom);
      const availableWidth = content.clientWidth;
      if (availableHeight <= 0 || availableWidth <= 0) return;

      content.style.height = `${availableHeight}px`;

      const fits = (size: number) => {
        content.style.fontSize = `${size}rem`;
        return (
          content.scrollWidth <= content.clientWidth + 1 &&
          content.scrollHeight <= content.clientHeight + 1
        );
      };

      const maxColumns = Math.max(
        1,
        Math.min(MAX_COLUMNS, Math.floor(availableWidth / MIN_COLUMN_WIDTH_PX)),
      );

      let best: FitResult | null = null;

      for (let columns = 1; columns <= maxColumns; columns++) {
        content.style.columnCount = String(columns);

        if (!fits(FIT_MIN_FONT_REM)) continue;

        let lo = FIT_MIN_FONT_REM;
        let hi = upper;
        if (fits(hi)) {
          lo = hi;
        } else {
          while (hi - lo > PRECISION_REM) {
            const mid = (lo + hi) / 2;
            if (fits(mid)) lo = mid;
            else hi = mid;
          }
        }

        if (!best || lo > best.fontSize + COLUMN_GAIN_THRESHOLD_REM) {
          best = { fontSize: lo, columns, overflows: false };
        }
        // Already at the reader's full size — more columns can't beat it.
        if (lo >= upper) break;
      }

      const final: FitResult = best ?? {
        fontSize: upper,
        columns: 1,
        overflows: true,
      };

      // Leave the DOM in the final state directly (React won't re-apply
      // style values it thinks haven't changed), then mirror it in state
      // for the parts of the UI that describe it.
      content.style.fontSize = `${final.fontSize}rem`;
      content.style.columnCount = String(final.columns);
      content.style.height = final.overflows ? "" : `${availableHeight}px`;

      setResult((prev) =>
        prev &&
        prev.columns === final.columns &&
        prev.overflows === final.overflows &&
        Math.abs(prev.fontSize - final.fontSize) < 0.001
          ? prev
          : final,
      );
    };

    fit();

    // Re-fit on rotation, window resize, the header wrapping, entering
    // fullscreen… Coalesced to one run per frame.
    let frame = 0;
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(fit);
    };
    const observer = new ResizeObserver(schedule);
    observer.observe(container);

    // Web fonts finishing their load change every line's width.
    let cancelled = false;
    document.fonts?.ready.then(() => {
      if (!cancelled) schedule();
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [enabled, containerRef, contentRef, maxFontSize, contentKey]);

  return enabled ? result : null;
}
