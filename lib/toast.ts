"use client";

import { toast as sonner, type ExternalToast } from "sonner";

/**
 * The app's toast API: sonner's `toast`, with every toast tagged so the
 * host (components/ui/toaster.tsx) can dismiss it when it is tapped or
 * clicked. Import `toast` from here, never from "sonner" directly (lint
 * enforces it): an untagged toast can only be swiped away.
 *
 * Same signatures as sonner: `toast.success(message, { description })`,
 * `toast.error(...)`, `toast.dismiss(id)`...
 */

/** `data-testid` prefix that carries the toast id onto its DOM node. */
export const TOAST_ID_PREFIX = "toast:";

let counter = 0;

function tagged(data?: ExternalToast): ExternalToast {
  const id =
    data?.id ?? `t${Date.now().toString(36)}${(counter++).toString(36)}`;
  return { ...data, id, testId: `${TOAST_ID_PREFIX}${id}` };
}

type Message = Parameters<typeof sonner.success>[0];

function show(message: Message, data?: ExternalToast) {
  return sonner(message, tagged(data));
}

export const toast = Object.assign(show, {
  success: (message: Message, data?: ExternalToast) =>
    sonner.success(message, tagged(data)),
  info: (message: Message, data?: ExternalToast) =>
    sonner.info(message, tagged(data)),
  warning: (message: Message, data?: ExternalToast) =>
    sonner.warning(message, tagged(data)),
  error: (message: Message, data?: ExternalToast) =>
    sonner.error(message, tagged(data)),
  message: (message: Message, data?: ExternalToast) =>
    sonner.message(message, tagged(data)),
  loading: (message: Message, data?: ExternalToast) =>
    sonner.loading(message, tagged(data)),
  dismiss: (id?: string | number) => sonner.dismiss(id),
});

/** The toast id carried by a toast's DOM node (see `tagged`). */
export function toastIdFromElement(element: HTMLElement): string | null {
  const testId = element.dataset.testid;
  return testId?.startsWith(TOAST_ID_PREFIX)
    ? testId.slice(TOAST_ID_PREFIX.length)
    : null;
}
