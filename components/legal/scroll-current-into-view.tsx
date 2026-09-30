"use client";

import { useEffect } from "react";

/**
 * Scrolls a horizontally scrolling list so its current item
 * (`[data-current]`) is in view. Below `lg` the legal documents are a row
 * of chips wider than a phone: opening one of the last documents showed
 * the first chips and hid which one was open. Only `scrollLeft` moves,
 * never the page.
 */
export function ScrollCurrentIntoView({
  containerId,
}: {
  containerId: string;
}) {
  useEffect(() => {
    const container = document.getElementById(containerId);
    const current = container?.querySelector<HTMLElement>("[data-current]");
    if (!container || !current) return;
    if (container.scrollWidth <= container.clientWidth) return;
    const box = container.getBoundingClientRect();
    const item = current.getBoundingClientRect();
    container.scrollLeft += item.left - box.left - (box.width - item.width) / 2;
  }, [containerId]);

  return null;
}
