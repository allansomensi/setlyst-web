"use client";

import { RefObject, useEffect, useRef } from "react";

/** Distance (px) before a gesture is classified as horizontal or vertical. */
const AXIS_LOCK_PX = 10;
/** A horizontal move must beat the vertical one by this factor to count. */
const AXIS_RATIO = 1.2;
/** Minimum travel to switch song, as a fraction of the element's width… */
const COMMIT_FRACTION = 0.18;
/** …but never less than this (px), so small phones still need a real swipe. */
const COMMIT_MIN_PX = 56;
/** A quick flick commits with less travel. */
const FLICK_VELOCITY = 0.45; // px/ms
const FLICK_MIN_PX = 32;
/**
 * Touches starting this close (px) to the screen's side edges are left
 * alone: iOS and Android use edge swipes for "back", and competing with
 * them would either fight the OS or switch song *and* leave Live Mode.
 */
const EDGE_GUARD_PX = 24;
/** How much of the finger's travel the content follows, for feedback. */
const DRAG_FOLLOW = 0.35;
/** Travel past the first/last song is damped further — a rubber band. */
const EDGE_RESISTANCE = 0.12;

interface UseSwipeNavigationOptions {
  /** The element the gesture is read from and that follows the finger. */
  targetRef: RefObject<HTMLElement | null>;
  enabled: boolean;
  canNext: boolean;
  canPrev: boolean;
  onNext: () => void;
  onPrev: () => void;
}

/**
 * Swipe left/right to move through the running order in Live Mode.
 *
 * On a phone clipped to a mic stand, the footer buttons are small targets
 * to hit mid-song; a swipe anywhere on the lyrics is not. Touch only —
 * mouse and pen keep the buttons and the keyboard, where dragging text
 * sideways would be surprising.
 *
 * Works alongside native vertical scrolling rather than against it: the
 * target is expected to have `touch-action: pan-y pinch-zoom`, so the
 * browser still owns vertical scrolling and pinch-zoom while horizontal
 * movement is left for this hook. Listeners are passive; nothing here
 * ever blocks scrolling.
 *
 * While dragging, the target follows the finger (damped) via a direct
 * style write — no React state, so no re-render of the lyrics on every
 * touchmove.
 */
export function useSwipeNavigation({
  targetRef,
  enabled,
  canNext,
  canPrev,
  onNext,
  onPrev,
}: UseSwipeNavigationOptions) {
  // Latest values in a ref so the listeners below are attached once per
  // element rather than on every song change.
  const latest = useRef({ canNext, canPrev, onNext, onPrev });
  useEffect(() => {
    latest.current = { canNext, canPrev, onNext, onPrev };
  }, [canNext, canPrev, onNext, onPrev]);

  useEffect(() => {
    const el = targetRef.current;
    if (!el || !enabled) return;

    let startX = 0;
    let startY = 0;
    let startTime = 0;
    let dx = 0;
    let axis: "x" | "y" | null = null;
    let tracking = false;

    const setOffset = (px: number, animate: boolean) => {
      el.style.transition = animate
        ? "transform 180ms ease-out, opacity 180ms ease-out"
        : "none";
      el.style.transform = px === 0 ? "" : `translate3d(${px}px, 0, 0)`;
      el.style.opacity =
        px === 0
          ? ""
          : String(Math.max(0.55, 1 - Math.abs(px) / (el.clientWidth || 1)));
    };

    const reset = () => {
      tracking = false;
      axis = null;
      dx = 0;
      setOffset(0, true);
    };

    const onStart = (event: TouchEvent) => {
      if (event.touches.length !== 1) {
        if (tracking) reset();
        return;
      }
      const touch = event.touches[0];
      if (
        touch.clientX < EDGE_GUARD_PX ||
        touch.clientX > window.innerWidth - EDGE_GUARD_PX
      ) {
        return;
      }
      tracking = true;
      axis = null;
      dx = 0;
      startX = touch.clientX;
      startY = touch.clientY;
      startTime = performance.now();
    };

    const onMove = (event: TouchEvent) => {
      if (!tracking) return;
      if (event.touches.length !== 1) {
        reset();
        return;
      }
      const touch = event.touches[0];
      const moveX = touch.clientX - startX;
      const moveY = touch.clientY - startY;

      if (axis === null) {
        if (Math.abs(moveX) < AXIS_LOCK_PX && Math.abs(moveY) < AXIS_LOCK_PX) {
          return;
        }
        axis = Math.abs(moveX) > Math.abs(moveY) * AXIS_RATIO ? "x" : "y";
        if (axis === "y") {
          tracking = false;
          return;
        }
      }

      dx = moveX;
      const { canNext, canPrev } = latest.current;
      const allowed = dx < 0 ? canNext : canPrev;
      setOffset(dx * (allowed ? DRAG_FOLLOW : EDGE_RESISTANCE), false);
    };

    const onEnd = () => {
      if (!tracking || axis !== "x") {
        tracking = false;
        return;
      }
      const elapsed = Math.max(1, performance.now() - startTime);
      const distance = Math.abs(dx);
      const threshold = Math.max(
        COMMIT_MIN_PX,
        (el.clientWidth || window.innerWidth) * COMMIT_FRACTION,
      );
      const isFlick =
        distance / elapsed > FLICK_VELOCITY && distance > FLICK_MIN_PX;
      const commit = distance > threshold || isFlick;
      const direction = dx < 0 ? "next" : "prev";

      reset();

      if (!commit) return;
      const { canNext, canPrev, onNext, onPrev } = latest.current;
      if (direction === "next" && canNext) onNext();
      if (direction === "prev" && canPrev) onPrev();
    };

    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: true });
    el.addEventListener("touchend", onEnd, { passive: true });
    el.addEventListener("touchcancel", reset, { passive: true });

    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", reset);
      el.style.transform = "";
      el.style.opacity = "";
      el.style.transition = "";
    };
  }, [targetRef, enabled]);
}
