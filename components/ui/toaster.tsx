"use client";

import { useEffect } from "react";
import { Toaster as SonnerToaster, type ToasterProps } from "sonner";

/**
 * Matches the attributes sonner puts on its own rendered elements.
 * Interactive children (the action button, the cancel button, the close
 * button) are excluded from tap-to-dismiss so pressing "Reload" on an
 * update prompt still reloads rather than just closing the prompt.
 */
const TOAST_SELECTOR = "[data-sonner-toast]";
const CLOSE_BUTTON_SELECTOR = "[data-close-button]";
const INTERACTIVE_SELECTOR = "button, a, [role='button']";

/**
 * The app's toast host.
 *
 * Adds two things on top of sonner's `<Toaster>`:
 *
 *  - **A close button on every toast.** Some toasts are deliberately
 *    sticky (the "new version available" prompt has no timeout at all),
 *    and sonner's only built-in way to dismiss one otherwise is a swipe —
 *    undiscoverable with a mouse and easy to miss on a phone.
 *  - **Tap anywhere on a toast to dismiss it.** The obvious gesture when
 *    a notification is in the way, and without it a stuck toast can sit
 *    over the UI indefinitely.
 *
 * The click is forwarded to that toast's own close button rather than
 * calling `toast.dismiss()` directly: sonner doesn't expose the toast's id
 * on the DOM node, and going through its own control keeps the exit
 * animation and any `onDismiss` callback intact. It also degrades
 * harmlessly — if a future sonner release renames the attribute, clicking
 * simply stops dismissing instead of breaking the page.
 *
 * A document-level listener is used rather than an `onClick` on a wrapper
 * element because sonner portals its toasts out of this subtree; the
 * listener is passive, only reacts to clicks that land inside a toast, and
 * is torn down on unmount.
 */
export function Toaster(props: ToasterProps) {
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const toastElement = target.closest<HTMLElement>(TOAST_SELECTOR);
      if (!toastElement) return;

      // Respect a toast explicitly marked as not dismissible.
      if (toastElement.dataset.dismissible === "false") return;

      // Let the toast's own buttons handle their own clicks.
      if (target.closest(INTERACTIVE_SELECTOR)) return;

      toastElement
        .querySelector<HTMLButtonElement>(CLOSE_BUTTON_SELECTOR)
        ?.click();
    };

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  return <SonnerToaster closeButton {...props} />;
}
