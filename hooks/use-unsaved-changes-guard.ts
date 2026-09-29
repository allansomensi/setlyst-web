"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";

/** Marks the extra history entry pushed while there are unsaved changes. */
const GUARD_STATE_KEY = "__setlystUnsavedGuard";

interface UnsavedChangesGuard {
  /** True while the "discard changes?" confirmation should be shown. */
  isConfirming: boolean;
  /** Leave anyway: runs the navigation that was held back. */
  confirmLeave: () => void;
  /** Stay on the page. */
  cancelLeave: () => void;
  /**
   * Runs `leave` right away when nothing is unsaved, otherwise asks first.
   * For the page's own "back"/"cancel" buttons.
   */
  requestLeave: (leave: () => void) => void;
  /** Stops guarding (call right before navigating away after a save). */
  release: () => void;
}

/** The page's address without the hash: what tells two pages apart. */
function currentHref(): string {
  return `${window.location.pathname}${window.location.search}`;
}

function isPlainLeftClick(event: MouseEvent): boolean {
  return (
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  );
}

/**
 * Keeps unsaved work from being lost by an accidental navigation.
 *
 * Covers the three ways out of a page:
 *  - closing or reloading the tab (the browser's own `beforeunload` prompt);
 *  - any in-app link (sidebar, breadcrumbs, notifications): clicks on
 *    same-origin `<a>` elements are intercepted before Next.js' `Link`
 *    sees them, and the page's confirmation is shown instead;
 *  - the browser/phone back button: an extra history entry is pushed while
 *    there are changes, so "back" lands on it and can be held.
 *
 * Programmatic `router.push` calls are not intercepted: route them
 * through `requestLeave`.
 *
 * The extra entry is not taken out when the form turns clean again
 * (undo, or a save that stays on the page): popping it with
 * `history.back()` makes Next.js dispatch a "restore" that discards
 * whatever the router is doing at that moment, and callers pass
 * `isDirty && !pending`, so that would land right as a save starts (its
 * server action) or, on the lyrics editor, right after "Save and close"
 * called `router.push`. Instead, a Back pressed from the extra entry
 * while nothing is unsaved is carried one entry further, so the person
 * never has to press it twice to leave.
 */
export function useUnsavedChangesGuard(isDirty: boolean): UnsavedChangesGuard {
  const router = useRouter();
  const [pending, setPending] = useState<(() => void) | null>(null);
  const releasedRef = useRef(false);
  const activeRef = useRef(false);
  /**
   * Whether the current history entry is the extra one pushed below, and
   * the page address it was pushed on. Kept by hand because `popstate`
   * only tells which entry was reached, not which one was left.
   */
  const onGuardEntryRef = useRef(false);
  const guardHrefRef = useRef("");

  useLayoutEffect(() => {
    // A new round of edits re-arms the guard after `release()`: a save
    // that stays on the page (the plan editor's `router.refresh()`)
    // releases it, and without this every later edit there would go
    // unguarded. Reset on the way in (clean -> dirty), not on the way
    // out: callers pass `isDirty && !pending`, so the value is already
    // false by the time a save calls `release()`.
    if (isDirty) releasedRef.current = false;
    activeRef.current = isDirty && !releasedRef.current;
  }, [isDirty]);

  // Closing the tab, reloading, typing another URL.
  useEffect(() => {
    if (!isDirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      if (!activeRef.current) return;
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);

  // In-app links. Registered on `document` in the capture phase, which
  // runs before React's own listeners on the app root, so stopping the
  // event here keeps `Link` from navigating.
  useEffect(() => {
    if (!isDirty) return;
    const onClick = (event: MouseEvent) => {
      if (!activeRef.current || event.defaultPrevented) return;
      if (!isPlainLeftClick(event)) return;

      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest<HTMLAnchorElement>("a[href]");
      if (!anchor || anchor.hasAttribute("download")) return;
      if (anchor.target && anchor.target !== "_self") return;

      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      const samePage =
        url.pathname === window.location.pathname &&
        url.search === window.location.search;
      if (samePage) return;

      event.preventDefault();
      event.stopPropagation();
      const href = `${url.pathname}${url.search}${url.hash}`;
      setPending(() => () => router.push(href));
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [isDirty, router]);

  // Back button: the extra entry, pushed while there are changes.
  useEffect(() => {
    if (!isDirty) return;
    if (!window.history.state?.[GUARD_STATE_KEY]) {
      // No URL: Next.js keeps its own state on the new entry and treats
      // it as the same page.
      window.history.pushState({ [GUARD_STATE_KEY]: true }, "");
    }
    onGuardEntryRef.current = true;
    guardHrefRef.current = currentHref();
  }, [isDirty]);

  // Back button: what happens when it's pressed. Listens for the page's
  // whole life (not only while dirty) so a Back from the extra entry
  // after the form turned clean is still seen.
  useEffect(() => {
    // Mounted on the extra entry: coming back to this page from another
    // one after it had been dirty.
    if (window.history.state?.[GUARD_STATE_KEY]) {
      onGuardEntryRef.current = true;
      guardHrefRef.current = currentHref();
    }

    const onPopState = (event: PopStateEvent) => {
      const leftGuardEntry = onGuardEntryRef.current;
      onGuardEntryRef.current = Boolean(event.state?.[GUARD_STATE_KEY]);
      if (onGuardEntryRef.current) guardHrefRef.current = currentHref();

      if (activeRef.current) {
        // We just left the guard entry: put it back and ask. Leaving for
        // real goes two entries back (past the guard entry).
        window.history.pushState({ [GUARD_STATE_KEY]: true }, "");
        onGuardEntryRef.current = true;
        setPending(() => () => {
          // Not a Back from the extra entry: don't carry it any further.
          onGuardEntryRef.current = false;
          window.history.go(-2);
        });
        return;
      }

      // Nothing unsaved and Back went from the extra entry to the one
      // under it: the same page, so nothing seemed to happen. Carry on
      // to where the person meant to go. Only for an entry Next.js made
      // (a `#hash` link's entry has no state) with the same address.
      if (
        leftGuardEntry &&
        !onGuardEntryRef.current &&
        event.state?.__NA &&
        currentHref() === guardHrefRef.current
      ) {
        window.history.back();
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const release = useCallback(() => {
    releasedRef.current = true;
    activeRef.current = false;
  }, []);

  const confirmLeave = useCallback(() => {
    const leave = pending;
    setPending(null);
    release();
    leave?.();
  }, [pending, release]);

  const cancelLeave = useCallback(() => setPending(null), []);

  const requestLeave = useCallback((leave: () => void) => {
    if (activeRef.current) {
      setPending(() => leave);
    } else {
      leave();
    }
  }, []);

  return {
    isConfirming: pending !== null,
    confirmLeave,
    cancelLeave,
    requestLeave,
    release,
  };
}
