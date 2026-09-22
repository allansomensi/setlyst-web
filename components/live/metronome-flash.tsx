"use client";

import { useEffect, useRef } from "react";
import type { MetronomeController } from "@/hooks/use-metronome";

/** Longest a pulse may last, however slow the tempo. */
const MAX_FLASH_MS = 150;
/** Fraction of the beat a pulse may occupy, so pulses never run together. */
const FLASH_DUTY = 0.34;

interface MetronomeFlashProps {
  metronome: MetronomeController;
  /** Rendered only while the metronome is running. */
  isRunning: boolean;
}

/**
 * The visible beat: a pulse around the edge of the screen, brighter and
 * heavier on the downbeat.
 *
 * Drives its own DOM directly rather than rendering from React state. A
 * state update per beat would re-render this component's parent — the
 * whole Live Mode screen, lyrics included — several times a second, on
 * exactly the sort of phone that can least afford it. Here the beat
 * listener touches one element and nothing else.
 *
 * The Web Animations API is used in preference to toggling a CSS class:
 * restarting a CSS animation requires cancelling it and forcing a reflow
 * to take effect, which is both a hack and a synchronous layout on the
 * beat. `animate()` restarts cleanly and, because only `opacity` changes,
 * stays on the compositor.
 */
export function MetronomeFlash({ metronome, isRunning }: MetronomeFlashProps) {
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isRunning) return;

    // Captured once: the cleanup below runs after the element may already
    // have been detached, so reading the ref there would be unreliable.
    const element = elementRef.current;
    if (!element) return;

    let animation: Animation | null = null;

    const unsubscribe = metronome.subscribe(({ beat, intervalMs }) => {
      element.dataset.accent = beat === 0 ? "true" : "false";

      // A pulse must always finish inside its own beat — at 200 BPM the
      // beats are 300ms apart, and a fixed-length flash would still be
      // fading when the next one started, blurring into a constant glow.
      const duration = Math.min(MAX_FLASH_MS, intervalMs * FLASH_DUTY);

      animation?.cancel();
      animation = element.animate(
        [{ opacity: beat === 0 ? 0.85 : 0.55 }, { opacity: 0 }],
        { duration, easing: "ease-out", fill: "forwards" },
      );
    });

    return () => {
      unsubscribe();
      // Leaves no lit ring behind when the metronome is switched off
      // mid-pulse.
      animation?.cancel();
      element.style.opacity = "0";
    };
  }, [metronome, isRunning]);

  if (!isRunning) return null;

  return (
    <div ref={elementRef} className="metronome-pulse" aria-hidden="true" />
  );
}
