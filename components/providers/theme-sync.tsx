"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import type { UserTheme } from "@/types/api";

/**
 * Applies the theme saved on the account (read by the server) to
 * next-themes, without remounting anything.
 *
 * next-themes keeps its own copy in localStorage, so a device that last
 * showed "light" would ignore a "dark" chosen on another device. This
 * pushes the account's value in whenever the server sends a different one
 * (first load, or after the preference is saved and the page refreshed).
 * Changing the theme in settings calls `setTheme` directly, so it applies
 * immediately.
 */
export function ThemeSync({ theme }: { theme: UserTheme }) {
  const { theme: current, setTheme } = useTheme();
  const applied = useRef<UserTheme | null>(null);

  useEffect(() => {
    if (applied.current === theme) return;
    applied.current = theme;
    if (current !== theme) setTheme(theme);
  }, [theme, current, setTheme]);

  return null;
}
