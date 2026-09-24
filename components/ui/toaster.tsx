"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { Toaster as SonnerToaster, type ToasterProps } from "sonner";
import { toast, toastIdFromElement } from "@/lib/toast";

const TOAST_SELECTOR = "[data-sonner-toast]";
/** The toast's own controls (e.g. "Reload" on the update prompt). */
const INTERACTIVE_SELECTOR = "button, a, input, [role='button']";

/** True while the person is selecting text inside `element`. */
function isSelectingTextIn(element: Element): boolean {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed || !selection.toString().trim()) {
    return false;
  }
  return (
    element.contains(selection.anchorNode) ||
    element.contains(selection.focusNode)
  );
}

/**
 * The app's toast host.
 *
 * A click or tap anywhere on a toast dismisses it (swiping still works
 * too), except on the toast's own buttons and while text inside it is
 * being selected, so an error message can still be copied. Error toasts
 * also get a close button (see lib/toast.ts), so keyboard users can
 * dismiss them, and stay up longer. The theme follows next-themes unless
 * one is passed; the labels are localized; the stack clears the notch /
 * status bar of the installed app.
 *
 * Sonner portals its toasts outside this subtree, hence the document-level
 * listener. Toasts are matched to their id through the tag added by
 * lib/toast.ts.
 */
export function Toaster({ theme, ...props }: ToasterProps) {
  const { resolvedTheme } = useTheme();
  const t = useTranslations("common");

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const toastElement = target.closest<HTMLElement>(TOAST_SELECTOR);
      if (!toastElement) return;
      if (toastElement.dataset.dismissible === "false") return;
      if (target.closest(INTERACTIVE_SELECTOR)) return;
      if (isSelectingTextIn(toastElement)) return;

      const id = toastIdFromElement(toastElement);
      if (id) toast.dismiss(id);
    };

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  return (
    <SonnerToaster
      theme={
        theme ??
        (resolvedTheme === "dark" || resolvedTheme === "light"
          ? resolvedTheme
          : "system")
      }
      duration={6000}
      containerAriaLabel={t("notifications")}
      offset={{ top: "max(24px, env(safe-area-inset-top))" }}
      mobileOffset={{
        top: "max(16px, env(safe-area-inset-top))",
        left: "max(16px, env(safe-area-inset-left))",
        right: "max(16px, env(safe-area-inset-right))",
      }}
      toastOptions={{
        className: "cursor-pointer select-text",
        closeButtonAriaLabel: t("close"),
      }}
      {...props}
    />
  );
}
