"use client";

/**
 * Copies `text` to the clipboard. Resolves to true only when it really was
 * copied, so callers never announce "copied" for a copy that failed.
 *
 * The async Clipboard API needs a secure context and, in some browsers
 * (older Safari, in-app webviews), a direct user gesture; when it is
 * missing or refuses, the text is copied through a hidden, selected
 * textarea and `execCommand("copy")`, which still works in most of those
 * places. When both fail, the caller should leave the value visible and
 * selected so it can be copied by hand.
 */
export async function copyText(text: string): Promise<boolean> {
  if (typeof window === "undefined") return false;

  if (navigator.clipboard?.writeText && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Permission denied or no user gesture: try the fallback.
    }
  }

  return legacyCopy(text);
}

function legacyCopy(text: string): boolean {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  // Off-screen but still selectable (display:none can't be selected).
  textarea.style.position = "fixed";
  textarea.style.top = "0";
  textarea.style.left = "-9999px";
  textarea.style.opacity = "0";

  const previousFocus = document.activeElement as HTMLElement | null;
  document.body.appendChild(textarea);
  textarea.select();
  textarea.setSelectionRange(0, text.length);

  let copied = false;
  try {
    copied = document.execCommand("copy");
  } catch {
    copied = false;
  } finally {
    textarea.remove();
    previousFocus?.focus?.();
  }
  return copied;
}
