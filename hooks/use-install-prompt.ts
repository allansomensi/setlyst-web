"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * "Install the app" for the PWA.
 *
 * Chrome/Edge/Android fire `beforeinstallprompt` once, early, and only
 * then can the install dialog be opened from a button; the event is
 * captured here at module load (before any component mounts) and kept.
 * iOS Safari has no such event: installing is "Share → Add to Home
 * Screen", so the UI shows those steps instead. Once running as an
 * installed app (standalone display mode), there is nothing to offer.
 */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export type InstallState =
  /** Running as the installed app. */
  | "installed"
  /** The browser's install dialog can be opened. */
  | "promptable"
  /** iOS / iPadOS: install by hand from the Share menu. */
  | "ios"
  /** Not offered by this browser (or not yet). */
  | "unavailable";

let deferred: BeforeInstallPromptEvent | null = null;
let installedNow = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    // Keep it for our own button instead of the browser's mini-infobar.
    event.preventDefault();
    deferred = event as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    installedNow = true;
    notify();
  });
}

function isStandalone(): boolean {
  return (
    installedNow ||
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/** iPhone / iPad, where installing is always a manual Share-menu step. */
function isIos(): boolean {
  const ua = navigator.userAgent;
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    // iPadOS reports itself as a Mac with touch.
    (ua.includes("Macintosh") && navigator.maxTouchPoints > 1)
  );
}

function readState(): InstallState {
  if (isStandalone()) return "installed";
  if (deferred) return "promptable";
  if (isIos()) return "ios";
  return "unavailable";
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const media = window.matchMedia("(display-mode: standalone)");
  media.addEventListener("change", listener);
  return () => {
    listeners.delete(listener);
    media.removeEventListener("change", listener);
  };
}

export function useInstallPrompt() {
  const state = useSyncExternalStore<InstallState>(
    subscribe,
    readState,
    () => "unavailable",
  );

  /** Opens the browser's install dialog; true if the person accepted. */
  const install = useCallback(async (): Promise<boolean> => {
    const event = deferred;
    if (!event) return false;
    deferred = null;
    notify();
    await event.prompt();
    const { outcome } = await event.userChoice;
    if (outcome === "accepted") {
      installedNow = true;
      notify();
      return true;
    }
    return false;
  }, []);

  return { state, install };
}
